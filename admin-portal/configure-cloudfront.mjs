import {
  CloudFrontClient,
  ListDistributionsCommand,
  CreateDistributionCommand,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";
import { fromIni } from "@aws-sdk/credential-providers";

let credentialsProvider;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  credentialsProvider = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
} else {
  credentialsProvider = fromIni({ profile: process.env.AWS_PROFILE || "LOVEWANSHI" });
}

const cf = new CloudFrontClient({
  region: "us-east-1",
  credentials: credentialsProvider,
});

const S3_BUCKET_NAME = "LOVEWANSHI-parinay-admin";
const S3_WEBSITE_ORIGIN = `${S3_BUCKET_NAME}.s3-website.ap-south-1.amazonaws.com`;
const ACM_CERT_ARN = "arn:aws:acm:us-east-1:975375540512:certificate/c7537968-9a48-4659-853b-76ae4544a9e1";
const ADMIN_ALIAS = "admin.lovewanshisamaj.in";

async function main() {
  console.log("Checking existing CloudFront distributions...");
  const listRes = await cf.send(new ListDistributionsCommand({}));
  const items = listRes.DistributionList?.Items || [];

  let existingAdminDist = items.find((d) =>
    (d.Aliases?.Items || []).includes(ADMIN_ALIAS) ||
    d.Origins?.Items?.some((o) => o.DomainName === S3_WEBSITE_ORIGIN)
  );

  if (existingAdminDist) {
    console.log(`Found existing Admin CloudFront distribution: ${existingAdminDist.Id} (${existingAdminDist.DomainName})`);
    console.log("Creating cache invalidation...");
    await cf.send(
      new CreateInvalidationCommand({
        DistributionId: existingAdminDist.Id,
        InvalidationBatch: {
          CallerReference: `inval-${Date.now()}`,
          Paths: {
            Quantity: 1,
            Items: ["/*"],
          },
        },
      })
    );
    console.log(`\n🎉 Admin CloudFront live at: https://${existingAdminDist.DomainName}`);
    console.log(`🔗 Custom Domain: https://${ADMIN_ALIAS}`);
    return;
  }

  console.log(`Creating new CloudFront distribution for ${ADMIN_ALIAS}...`);
  const distributionConfig = {
    CallerReference: `admin-portal-${Date.now()}`,
    Comment: "Lovewanshi Parinay Admin Portal",
    Enabled: true,
    DefaultRootObject: "index.html",
    Aliases: {
      Quantity: 1,
      Items: [ADMIN_ALIAS],
    },
    Origins: {
      Quantity: 1,
      Items: [
        {
          Id: "LOVEWANSHI-parinay-admin-s3-website",
          DomainName: S3_WEBSITE_ORIGIN,
          OriginPath: "",
          CustomHeaders: { Quantity: 0 },
          CustomOriginConfig: {
            HTTPPort: 80,
            HTTPSPort: 443,
            OriginProtocolPolicy: "http-only",
            OriginSslProtocols: {
              Quantity: 1,
              Items: ["TLSv1.2"],
            },
            OriginReadTimeout: 30,
            OriginKeepaliveTimeout: 5,
          },
          ConnectionAttempts: 3,
          ConnectionTimeout: 10,
        },
      ],
    },
    DefaultCacheBehavior: {
      TargetOriginId: "LOVEWANSHI-parinay-admin-s3-website",
      ViewerProtocolPolicy: "redirect-to-https",
      AllowedMethods: {
        Quantity: 2,
        Items: ["GET", "HEAD"],
        CachedMethods: {
          Quantity: 2,
          Items: ["GET", "HEAD"],
        },
      },
      CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6", // Managed-CachingOptimized
    },
    CustomErrorResponses: {
      Quantity: 2,
      Items: [
        {
          ErrorCode: 403,
          ResponsePagePath: "/index.html",
          ResponseCode: "200",
          ErrorCachingMinTTL: 0,
        },
        {
          ErrorCode: 404,
          ResponsePagePath: "/index.html",
          ResponseCode: "200",
          ErrorCachingMinTTL: 0,
        },
      ],
    },
    ViewerCertificate: {
      ACMCertificateArn: ACM_CERT_ARN,
      SSLSupportMethod: "sni-only",
      MinimumProtocolVersion: "TLSv1.2_2021",
      CertificateSource: "acm",
    },
  };

  const createRes = await cf.send(
    new CreateDistributionCommand({
      DistributionConfig: distributionConfig,
    })
  );

  const newDist = createRes.Distribution;
  console.log("\n=======================================================");
  console.log("🎉 ADMIN CLOUDFRONT DISTRIBUTION CREATED!");
  console.log(`CloudFront Domain: https://${newDist.DomainName}`);
  console.log(`Custom Domain Alias: https://${ADMIN_ALIAS}`);
  console.log(`Distribution ID: ${newDist.Id}`);
  console.log("=======================================================\n");
}

main().catch((err) => {
  console.error("❌ CloudFront configuration error:", err);
  process.exit(1);
});
