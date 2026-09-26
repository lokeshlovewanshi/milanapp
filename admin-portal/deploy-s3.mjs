import {
  S3Client,
  ListBucketsCommand,
  CreateBucketCommand,
  PutBucketWebsiteCommand,
  PutPublicAccessBlockCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { fromIni } from "@aws-sdk/credential-providers";
import fs from "fs";
import path from "path";
import mime from "mime-types";

const REGION = process.env.AWS_REGION || "ap-south-1";
const PROFILE = process.env.AWS_PROFILE || "Lodha";

let credentialsProvider;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  credentialsProvider = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
} else {
  credentialsProvider = fromIni({ profile: PROFILE });
}

const s3 = new S3Client({
  region: REGION,
  credentials: credentialsProvider,
});

async function main() {
  console.log(
    `Connecting to AWS S3 using profile '${PROFILE}' (region: ${REGION})...`,
  );
  const bucketsRes = await s3.send(new ListBucketsCommand({}));
  console.log("Available S3 Buckets in account:");
  (bucketsRes.Buckets || []).forEach((b) => console.log(` • ${b.Name}`));

  const bucketName =
    process.env.ADMIN_PORTAL_BUCKET ||
    process.env.S3_BUCKET_NAME ||
    "lovewanshi-parinay-admin";
  const bucketExists = (bucketsRes.Buckets || []).some(
    (b) => b.Name === bucketName,
  );

  if (!bucketExists) {
    console.log(`\nCreating S3 bucket: '${bucketName}' in ${REGION}...`);
    try {
      await s3.send(
        new CreateBucketCommand({
          Bucket: bucketName,
          CreateBucketConfiguration:
            REGION === "us-east-1" ? undefined : { LocationConstraint: REGION },
        }),
      );
      console.log(`Bucket '${bucketName}' created successfully.`);
    } catch (err) {
      if (err.name === "BucketAlreadyOwnedByYou") {
        console.log(`Bucket '${bucketName}' is already owned by you.`);
      } else {
        throw err;
      }
    }
  } else {
    console.log(`\nUsing target bucket: '${bucketName}'`);
  }

  // 1. Disable Block Public Access for static website hosting
  console.log("Configuring public access block...");
  try {
    await s3.send(
      new PutPublicAccessBlockCommand({
        Bucket: bucketName,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: false,
          IgnorePublicAcls: false,
          BlockPublicPolicy: false,
          RestrictPublicBuckets: false,
        },
      }),
    );
  } catch (err) {
    console.warn("Warning updating public access block:", err.message);
  }

  // 2. Configure Static Website Hosting
  console.log("Enabling static website hosting with SPA fallback...");
  await s3.send(
    new PutBucketWebsiteCommand({
      Bucket: bucketName,
      WebsiteConfiguration: {
        IndexDocument: { Suffix: "index.html" },
        ErrorDocument: { Key: "index.html" }, // SPA client-side routing fallback
      },
    }),
  );

  // 3. Put Public Read Bucket Policy
  console.log("Applying public read bucket policy...");
  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "PublicReadGetObject",
        Effect: "Allow",
        Principal: "*",
        Action: "s3:GetObject",
        Resource: `arn:aws:s3:::${bucketName}/*`,
      },
    ],
  };
  try {
    await s3.send(
      new PutBucketPolicyCommand({
        Bucket: bucketName,
        Policy: JSON.stringify(policy),
      }),
    );
  } catch (err) {
    console.warn("Warning applying bucket policy:", err.message);
  }

  // 4. Upload dist directory recursively
  const distDir = path.resolve("./dist");
  if (!fs.existsSync(distDir)) {
    throw new Error(
      "dist directory not found. Please run 'npm run build' first.",
    );
  }

  async function getFiles(dir) {
    const subdirs = await fs.promises.readdir(dir);
    const files = await Promise.all(
      subdirs.map(async (subdir) => {
        const res = path.resolve(dir, subdir);
        return (await fs.promises.stat(res)).isDirectory()
          ? getFiles(res)
          : res;
      }),
    );
    return files.reduce((a, f) => a.concat(f), []);
  }

  const allFiles = await getFiles(distDir);
  console.log(
    `\nUploading ${allFiles.length} files to S3 bucket '${bucketName}'...`,
  );

  for (const filePath of allFiles) {
    const relativeKey = path.relative(distDir, filePath).replace(/\\/g, "/");
    const contentType = mime.lookup(filePath) || "application/octet-stream";
    const fileBody = fs.readFileSync(filePath);

    // Cache control: HTML files no-cache, assets 1-year immutable cache
    const cacheControl = relativeKey.endsWith(".html")
      ? "no-cache, no-store, must-revalidate"
      : "public, max-age=31536000, immutable";

    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: relativeKey,
        Body: fileBody,
        ContentType: contentType,
        CacheControl: cacheControl,
      }),
    );
    console.log(` ✓ Uploaded: ${relativeKey} (${contentType})`);
  }

  const websiteUrl =
    REGION === "us-east-1"
      ? `http://${bucketName}.s3-website-us-east-1.amazonaws.com`
      : `http://${bucketName}.s3-website.${REGION}.amazonaws.com`;

  const distId = process.env.ADMIN_PORTAL_DISTRIBUTION_ID;
  if (distId) {
    try {
      console.log(
        `\nCreating CloudFront invalidation for distribution '${distId}'...`,
      );
      const { CloudFrontClient, CreateInvalidationCommand } =
        await import("@aws-sdk/client-cloudfront");
      const cf = new CloudFrontClient({
        region: "us-east-1",
        credentials: credentialsProvider,
      });
      await cf.send(
        new CreateInvalidationCommand({
          DistributionId: distId,
          InvalidationBatch: {
            CallerReference: `deploy-${Date.now()}`,
            Paths: { Quantity: 1, Items: ["/*"] },
          },
        }),
      );
      let cfDomain = null;
      try {
        const { GetDistributionCommand } =
          await import("@aws-sdk/client-cloudfront");
        const getDistRes = await cf.send(
          new GetDistributionCommand({ Id: distId }),
        );
        cfDomain = getDistRes.Distribution?.DomainName;
      } catch (_) {}

      console.log("✓ CloudFront cache invalidated successfully.");
      if (cfDomain) {
        console.log(`🌐 CloudFront HTTPS Domain: https://${cfDomain}`);
      }
    } catch (cfErr) {
      console.warn(
        "⚠️ Warning creating CloudFront invalidation:",
        cfErr.message,
      );
    }
  }

  console.log("\n=======================================================");
  console.log("🎉 ADMIN PORTAL DEPLOYMENT SUCCESSFUL!");
  console.log(`🔗 Live S3 Website URL: ${websiteUrl}`);
  console.log("=======================================================\n");

  // Output to GitHub Actions Step Summary and Annotations
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summaryLines = [
      "## 🚀 Admin Portal Deployed Successfully!",
      "",
      `* **Direct S3 Website**: [${websiteUrl}](${websiteUrl})`,
    ];
    if (process.env.ADMIN_PORTAL_DISTRIBUTION_ID) {
      summaryLines.push(
        `* **CloudFront Distribution**: \`${process.env.ADMIN_PORTAL_DISTRIBUTION_ID}\``,
      );
    }
    summaryLines.push(
      `* **Backend API**: \`${process.env.VITE_API_BASE_URL || "https://api.lovewanshisamaj.in"}\``,
    );
    summaryLines.push("");
    try {
      fs.appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        summaryLines.join("\n") + "\n",
      );
    } catch (_) {}
  }
  console.log(`::notice title=Admin Portal URL::${websiteUrl}`);
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});
