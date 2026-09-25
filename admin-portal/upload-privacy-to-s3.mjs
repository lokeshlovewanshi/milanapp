import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";
import { fromIni } from "@aws-sdk/credential-providers";
import fs from "fs";
import path from "path";

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

const cf = new CloudFrontClient({
  region: "us-east-1",
  credentials: credentialsProvider,
});

async function uploadFile(bucket, key, filePath) {
  const fileContent = fs.readFileSync(filePath);
  console.log(`Uploading ${filePath} -> s3://${bucket}/${key}...`);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileContent,
      ContentType: "text/html",
    }),
  );
  console.log(`✓ Uploaded successfully to s3://${bucket}/${key}`);
}

async function main() {
  const policyFile = path.resolve("./public/privacy-policy.html");
  const deleteFile = path.resolve("./public/delete-account.html");

  if (!fs.existsSync(policyFile)) {
    console.error(`Error: Policy file not found at ${policyFile}`);
    process.exit(1);
  }

  // 1. Upload to Admin Portal Bucket (serves via admin.lovewanshisamaj.in CloudFront)
  const adminBucket =
    process.env.ADMIN_PORTAL_BUCKET || "lovewanshi-parinay-admin";
  try {
    await uploadFile(adminBucket, "privacy-policy.html", policyFile);
    await uploadFile(adminBucket, "privacy/privacy-policy.html", policyFile);
    if (fs.existsSync(deleteFile)) {
      await uploadFile(adminBucket, "delete-account.html", deleteFile);
    }
  } catch (err) {
    console.warn(`Could not upload to ${adminBucket}:`, err.message);
  }

  // 2. Also upload to lovewanshi-milan-photos bucket
  const photosBucket = process.env.PHOTOS_BUCKET || "lovewanshi-milan-photos";
  try {
    await uploadFile(photosBucket, "privacy/privacy-policy.html", policyFile);
  } catch (err) {
    console.warn(`Could not upload to ${photosBucket}:`, err.message);
  }

  // 3. Invalidate CloudFront if distribution ID provided
  const distId = process.env.ADMIN_PORTAL_DISTRIBUTION_ID;
  if (distId) {
    console.log(`Invalidating CloudFront distribution ${distId}...`);
    try {
      await cf.send(
        new CreateInvalidationCommand({
          DistributionId: distId,
          InvalidationBatch: {
            CallerReference: `inval-policy-${Date.now()}`,
            Paths: {
              Quantity: 2,
              Items: ["/privacy-policy.html", "/privacy/privacy-policy.html"],
            },
          },
        }),
      );
      console.log("✓ CloudFront cache invalidated.");
    } catch (err) {
      console.warn("Could not invalidate CloudFront:", err.message);
    }
  }

  console.log("\nURLs available once deployed / uploaded:");
  console.log("👉 https://admin.lovewanshisamaj.in/privacy-policy.html");
  console.log(
    "👉 https://admin.lovewanshisamaj.in/privacy/privacy-policy.html",
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
