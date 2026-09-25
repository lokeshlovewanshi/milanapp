import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fromIni } from "@aws-sdk/credential-providers";
import fs from "fs";
import path from "path";

const REGION = process.env.AWS_REGION || "ap-south-1";
const PROFILE = process.env.AWS_PROFILE || "Lodha";
const BUCKET_NAME = process.env.S3_BUCKET_NAME || "Lodha-parinay-web";

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

function calculateAge(dob) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  const age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  return age > 0 && age < 120 ? age : null;
}

function formatHeight(raw) {
  if (!raw) return "";
  const s = String(raw).trim();
  const hMatch = s.match(/^H_(\d{2,3})$/i);
  if (hMatch) {
    const inches = parseInt(hMatch[1], 10);
    return `${Math.floor(inches / 12)} ft ${inches % 12} in`;
  }
  return s;
}

function cleanStr(val) {
  if (!val) return "";
  return String(val)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function syncProfile(profileId) {
  console.log(`\n==> Fetching profile data for: ${profileId}...`);
  const apiUrl = `https://api.lovewanshisamaj.in/api/v1/users/${profileId}`;
  const res = await fetch(apiUrl);
  if (!res.ok) {
    console.error(`Failed to fetch profile ${profileId}: ${res.status}`);
    return;
  }
  const data = await res.json();
  const name = data.name || "Member";
  const rawId = String(data.id || profileId);
  const digits = rawId.replace(/\D/g, "");
  const code = digits ? `GM${digits.padStart(5, "0")}` : rawId;
  const jmCode = digits ? `JM${digits.padStart(5, "0")}` : rawId;
  const age = calculateAge(data.dateOfBirth);
  const heightStr = formatHeight(data.height);
  const professionStr = cleanStr(data.profession || data.occupationDetails);
  const educationStr = cleanStr(data.education || data.educationDetails);
  const cityStr = [data.city, data.state].filter(Boolean).join(", ");
  const gotraStr = data.gotra || "Lodha";

  // Photo resolution: primary first
  const photo =
    data.profileImage ||
    data.profileImageFull ||
    (data.profileImageDetails && data.profileImageDetails[0]?.url) ||
    (data.profileImages && data.profileImages[0]) ||
    "https://www.lovewanshisamaj.in/assets/auth-hero.jpg";

  const quickDetails = [
    age ? `${age} Yrs` : null,
    heightStr || null,
    professionStr || null,
    educationStr || null,
    cityStr || null,
  ]
    .filter(Boolean)
    .join(" • ");

  const pageTitle = `${name} (${code}) - Lodha Parinay Matrimony`;
  const ogTitle = `${name} (${code})${age ? ` - ${age} Yrs` : ""}${heightStr ? `, ${heightStr}` : ""} | Lodha Parinay`;
  const ogDesc = `${quickDetails}${gotraStr ? ` • Gotra: ${gotraStr}` : ""}. View complete verified biodata & family details on Lodha Parinay.`;

  // Read base index.html from dist/
  const distIndex = path.resolve("./dist/index.html");
  if (!fs.existsSync(distIndex)) {
    throw new Error("dist/index.html not found. Run npm run build first.");
  }
  let html = fs.readFileSync(distIndex, "utf-8");

  // Inject dynamic tags into HTML
  html = html.replace(/<title>.*?<\/title>/, `<title>${pageTitle}</title>`);
  html = html.replace(
    /<meta property="og:title" content=".*?" \/>/,
    `<meta property="og:title" content="${ogTitle}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content=".*?"\s*\/>/s,
    `<meta property="og:description" content="${ogDesc}" />`,
  );
  html = html.replace(
    /<meta property="og:image" content=".*?" \/>/,
    `<meta property="og:image" content="${photo}" />\n    <meta property="og:image:secure_url" content="${photo}" />\n    <meta property="og:image:width" content="600" />\n    <meta property="og:image:height" content="600" />`,
  );
  html = html.replace(
    /<meta name="twitter:title" content=".*?" \/>/,
    `<meta name="twitter:title" content="${ogTitle}" />`,
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content=".*?"\s*\/>/s,
    `<meta name="twitter:description" content="${ogDesc}" />`,
  );
  html = html.replace(
    /<meta name="twitter:image" content=".*?" \/>/,
    `<meta name="twitter:image" content="${photo}" />`,
  );

  // Upload to all key variations in S3
  const targetKeys = [
    `profiles/${rawId}`,
    `profiles/${code}`,
    `profiles/${jmCode}`,
    `profile/${rawId}`,
    `profile/${code}`,
    `profile/${jmCode}`,
    `profiles/${rawId}/index.html`,
    `profiles/${code}/index.html`,
    `profile/${rawId}/index.html`,
    `profile/${code}/index.html`,
  ];

  const uniqueKeys = Array.from(new Set(targetKeys));
  console.log(
    `Uploading Open Graph HTML for ${name} (${code}) to S3 (${uniqueKeys.length} paths)...`,
  );

  for (const key of uniqueKeys) {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: Buffer.from(html, "utf-8"),
        ContentType: "text/html; charset=utf-8",
        CacheControl: "public, max-age=1800, s-maxage=3600",
      }),
    );
    console.log(` ✓ S3 Key: ${key}`);
  }

  console.log(
    `✅ Profile ${code} Open Graph populated successfully with image: ${photo.substring(0, 60)}...`,
  );
}

async function main() {
  const ids = process.argv.slice(2);
  const targetIds =
    ids.length > 0
      ? ids
      : ["JM00382", "382", "GM00382", "JM00373", "373", "GM00373"];
  console.log(
    `Starting Profile Open Graph pre-renderer for IDs: ${targetIds.join(", ")}`,
  );
  for (const id of targetIds) {
    try {
      await syncProfile(id);
    } catch (e) {
      console.error(`Error syncing ${id}:`, e);
    }
  }
  console.log(
    "\n🎉 All target profile Open Graph pages pre-rendered and uploaded to S3!",
  );
}

main().catch(console.error);
