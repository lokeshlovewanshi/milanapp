/**
 * Google Play Store AAB Uploader Script
 *
 * Usage:
 *   node scripts/upload_to_playstore.js --aab <path-to-aab> --track <internal|alpha|beta|production> --key <path-to-key.json>
 *
 * Requirements:
 *   npm install googleapis
 */

const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

// Default config
const DEFAULT_PACKAGE_NAME = "com.lovewanshi.jeevanmilansathi";
const DEFAULT_TRACK = "internal";

function getArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].substring(2);
      const val =
        args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : true;
      params[key] = val;
    }
  }
  return params;
}

async function uploadAAB() {
  const params = getArgs();
  const aabPath = params.aab || params.file;
  const trackName = params.track || DEFAULT_TRACK;
  const packageName = params.package || DEFAULT_PACKAGE_NAME;
  const keyPath = params.key || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const releaseNotes = params.notes || "New release update";

  if (!aabPath) {
    console.error("Error: Please provide path to .aab file using --aab <path>");
    console.log(
      "Example: node scripts/upload_to_playstore.js --aab ./build.aab --track internal --key ./play-service-account.json",
    );
    process.exit(1);
  }

  if (!fs.existsSync(aabPath)) {
    console.error(`Error: AAB file not found at path: ${aabPath}`);
    process.exit(1);
  }

  if (!keyPath || !fs.existsSync(keyPath)) {
    console.error(
      `Error: Google service account key file not found at: ${keyPath}`,
    );
    console.error(
      "Please specify with --key <path-to-key.json> or set GOOGLE_APPLICATION_CREDENTIALS env var.",
    );
    process.exit(1);
  }

  console.log(
    `Authenticating with Google Play Developer API using key: ${keyPath}`,
  );
  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });

  const authClient = await auth.getClient();
  const play = google.androidpublisher({
    version: "v3",
    auth: authClient,
  });

  console.log(`Starting edit session for package: ${packageName}...`);
  const edit = await play.edits.insert({
    packageName: packageName,
  });
  const editId = edit.data.id;
  console.log(`Edit session created (ID: ${editId})`);

  console.log(
    `Uploading AAB: ${aabPath} (${(fs.statSync(aabPath).size / (1024 * 1024)).toFixed(2)} MB)...`,
  );
  const bundleUpload = await play.edits.bundles.upload({
    packageName: packageName,
    editId: editId,
    media: {
      mimeType: "application/octet-stream",
      body: fs.createReadStream(aabPath),
    },
  });

  const versionCode = bundleUpload.data.versionCode;
  console.log(`AAB uploaded successfully! Version Code: ${versionCode}`);

  console.log(
    `Assigning version code ${versionCode} to track: "${trackName}"...`,
  );
  await play.edits.tracks.update({
    packageName: packageName,
    editId: editId,
    track: trackName,
    requestBody: {
      track: trackName,
      releases: [
        {
          name: `Release ${versionCode}`,
          versionCodes: [versionCode.toString()],
          status: "completed",
          releaseNotes: [
            {
              language: "en-US",
              text: releaseNotes,
            },
          ],
        },
      ],
    },
  });
  console.log(`Track "${trackName}" updated.`);

  console.log("Committing changes to Google Play Console...");
  await play.edits.commit({
    packageName: packageName,
    editId: editId,
  });

  console.log(
    `Commit successful! Your AAB is now published to the "${trackName}" track in Google Play Console.`,
  );
}

uploadAAB().catch((err) => {
  console.error("Failed to upload AAB:", err.message);
  if (err.response && err.response.data) {
    console.error("API Details:", JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
