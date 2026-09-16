import {
  CloudFrontClient,
  GetDistributionConfigCommand,
  UpdateDistributionCommand,
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

const DISTRIBUTION_ID = "E3GCII599CUC5F";
const S3_WEBSITE_ORIGIN = "lovewanshi-parinay-web.s3-website.ap-south-1.amazonaws.com";
// CloudFront only accepts ACM certificates issued in us-east-1. Supply a new
// ARN through ACM_CERT_ARN when the certificate is replaced.
const ACM_CERT_ARN = process.env.ACM_CERT_ARN ||
  "arn:aws:acm:us-east-1:104771965660:certificate/b039126a-9573-4995-8e4c-7ec32713d75e";

async function main() {
  console.log(`Fetching CloudFront config for ${DISTRIBUTION_ID}...`);
  const getRes = await cf.send(new GetDistributionConfigCommand({ Id: DISTRIBUTION_ID }));
  const config = getRes.DistributionConfig;
  const eTag = getRes.ETag;

  console.log("Current Aliases:", (config.Aliases?.Items || []).join(", "));

  // 1. Configure Website Origin (as Custom Origin for S3 Website endpoint)
  config.Origins = {
    Quantity: 1,
    Items: [
      {
        Id: "lovewanshi-parinay-web-s3-website",
        DomainName: S3_WEBSITE_ORIGIN,
        OriginPath: "",
        CustomHeaders: { Quantity: 0 },
        CustomOriginConfig: {
          HTTPPort: 80,
          HTTPSPort: 443,
          OriginProtocolPolicy: "http-only", // S3 website endpoints serve on HTTP
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
  };

  // 2. Set Default Cache Behavior
  config.DefaultCacheBehavior.TargetOriginId = "lovewanshi-parinay-web-s3-website";
  config.DefaultCacheBehavior.ViewerProtocolPolicy = "redirect-to-https";
  config.DefaultCacheBehavior.TrustedKeyGroups = {
    Enabled: false,
    Quantity: 0,
  };
  config.DefaultCacheBehavior.TrustedSigners = {
    Enabled: false,
    Quantity: 0,
  };
  config.DefaultCacheBehavior.AllowedMethods = {
    Quantity: 2,
    Items: ["GET", "HEAD"],
    CachedMethods: {
      Quantity: 2,
      Items: ["GET", "HEAD"],
    },
  };
  delete config.DefaultCacheBehavior.ForwardedValues;
  // Managed-CachingOptimized cache policy ID: 658327ea-f89d-4fab-a63d-7e88639e58f6
  config.DefaultCacheBehavior.CachePolicyId = "658327ea-f89d-4fab-a63d-7e88639e58f6";

  // 3. Set Default Root Object
  config.DefaultRootObject = "index.html";

  // 4. Set Aliases to include root and www and app
  const aliases = ["lovewanshisamaj.in", "www.lovewanshisamaj.in", "app.lovewanshisamaj.in"];
  config.Aliases = {
    Quantity: aliases.length,
    Items: aliases,
  };

  // The wildcard ACM certificate covers the root, www, and app aliases.
  config.ViewerCertificate = {
    ACMCertificateArn: ACM_CERT_ARN,
    SSLSupportMethod: "sni-only",
    MinimumProtocolVersion: "TLSv1.2_2021",
    CertificateSource: "acm",
  };

  // 5. Custom Error Responses for SPA Client-Side Routing
  config.CustomErrorResponses = {
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
  };

  console.log("Updating CloudFront distribution...");
  const updateRes = await cf.send(
    new UpdateDistributionCommand({
      Id: DISTRIBUTION_ID,
      DistributionConfig: config,
      IfMatch: eTag,
    })
  );

  console.log("Creating cache invalidation to clear any stale cache...");
  await cf.send(
    new CreateInvalidationCommand({
      DistributionId: DISTRIBUTION_ID,
      InvalidationBatch: {
        CallerReference: `inval-${Date.now()}`,
        Paths: {
          Quantity: 1,
          Items: ["/*"],
        },
      },
    })
  );

  console.log("\n=======================================================");
  console.log("🎉 CLOUDFRONT DISTRIBUTION UPDATED!");
  console.log(`CloudFront Domain: https://${updateRes.Distribution.DomainName}`);
  console.log(`Mapped Domains: ${aliases.join(", ")}`);
  console.log("=======================================================\n");
}

main().catch((err) => {
  console.error("❌ CloudFront update failed:", err);
  process.exit(1);
});
