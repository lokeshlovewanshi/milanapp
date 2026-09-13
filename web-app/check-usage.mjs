import { CloudWatchClient, GetMetricDataCommand } from "@aws-sdk/client-cloudwatch";
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

const cw = new CloudWatchClient({
  region: "us-east-1",
  credentials: credentialsProvider,
});

async function checkCloudFrontMetrics(distId, name) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const cmd = new GetMetricDataCommand({
    StartTime: startOfMonth,
    EndTime: now,
    MetricDataQueries: [
      {
        Id: "bytes",
        MetricStat: {
          Metric: {
            Namespace: "AWS/CloudFront",
            MetricName: "BytesDownloaded",
            Dimensions: [
              { Name: "DistributionId", Value: distId },
              { Name: "Region", Value: "Global" },
            ],
          },
          Period: 86400 * 31,
          Stat: "Sum",
        },
      },
      {
        Id: "requests",
        MetricStat: {
          Metric: {
            Namespace: "AWS/CloudFront",
            MetricName: "Requests",
            Dimensions: [
              { Name: "DistributionId", Value: distId },
              { Name: "Region", Value: "Global" },
            ],
          },
          Period: 86400 * 31,
          Stat: "Sum",
        },
      },
    ],
  });

  try {
    const res = await cw.send(cmd);
    const bytes = res.MetricDataResults.find((r) => r.Id === "bytes")?.Values?.[0] || 0;
    const reqs = res.MetricDataResults.find((r) => r.Id === "requests")?.Values?.[0] || 0;

    const mb = (bytes / (1024 * 1024)).toFixed(2);
    const gb = (bytes / (1024 * 1024 * 1024)).toFixed(4);

    console.log(`\n📊 Distribution: ${name} (${distId})`);
    console.log(`   • Bytes Downloaded (Data Out) : ${bytes.toLocaleString()} bytes (${mb} MB / ${gb} GB)`);
    console.log(`   • Total HTTP/HTTPS Requests   : ${reqs.toLocaleString()}`);
    return { bytes, reqs };
  } catch (err) {
    console.error(`Error querying ${distId}:`, err.message);
    return { bytes: 0, reqs: 0 };
  }
}

async function main() {
  console.log("=======================================================");
  console.log("📈 AWS CLOUDFRONT MONTH-TO-DATE USAGE REPORT");
  console.log("=======================================================");

  const web = await checkCloudFrontMetrics("E3GCII599CUC5F", "Lovewanshi Samaj Web App (lovewanshisamaj.in)");
  const admin = await checkCloudFrontMetrics("E37G13Y3ALQDRE", "Lovewanshi Parinay Admin (admin.lovewanshisamaj.in)");

  const totalBytes = web.bytes + admin.bytes;
  const totalGb = (totalBytes / (1024 * 1024 * 1024)).toFixed(4);
  const totalReqs = web.reqs + admin.reqs;

  console.log("\n-------------------------------------------------------");
  console.log(`📌 TOTAL COMBINED DATA OUT : ${totalGb} GB / 1,000 GB (Free Tier)`);
  console.log(`📌 REMAINING FREE BANDWIDTH: ${(1000 - parseFloat(totalGb)).toFixed(2)} GB`);
  console.log(`📌 TOTAL COMBINED REQUESTS : ${totalReqs.toLocaleString()} / 10,000,000 (Free Tier)`);
  console.log("=======================================================");
}

main();
