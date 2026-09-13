/**
 * S3-triggered image compression for lovewanshi-milan-photos using Node.js & Sharp.
 *
 * Shrinks profile photos efficiently while keeping them looking pristine at viewing size,
 * and writes a thumbnail for feed and list screens.
 */

const { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand, CopyObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

const s3 = new S3Client({
  region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1',
});

// Long edge of the stored image in pixels.
const MAX_EDGE = parseInt(process.env.MAX_EDGE || '1600', 10);

// Long edge of the thumbnail used by feed and list screens.
const THUMB_EDGE = parseInt(process.env.THUMB_EDGE || '400', 10);

// Quality settings (82 is above the artifact threshold for portraits/faces).
const QUALITY = parseInt(process.env.QUALITY || '82', 10);
const THUMB_QUALITY = parseInt(process.env.THUMB_QUALITY || '78', 10);

// "JPEG" or "WEBP".
const OUTPUT_FORMAT = (process.env.OUTPUT_FORMAT || 'JPEG').toUpperCase();

const THUMB_PREFIX = process.env.THUMB_PREFIX || 'thumbs/';

// Marker proving this function already handled an object.
const MARKER_KEY = 'compressed';
const MARKER_VALUE = 'v1';

// Max/min source bytes safeguards
const MAX_SOURCE_BYTES = parseInt(process.env.MAX_SOURCE_BYTES || String(40 * 1024 * 1024), 10);
const MIN_SOURCE_BYTES = parseInt(process.env.MIN_SOURCE_BYTES || String(50 * 1024), 10);

const CONTENT_TYPES = {
  JPEG: 'image/jpeg',
  WEBP: 'image/webp',
  PNG: 'image/png',
};

/**
 * Main Lambda entry point. One invocation may carry multiple S3 records.
 */
async function lambdaHandler(event, context) {
  const records = event?.Records || [];
  const results = [];

  for (const record of records) {
    if (!record?.s3?.bucket?.name || !record?.s3?.object?.key) {
      continue;
    }

    const bucket = record.s3.bucket.name;
    // S3 URL-encodes keys in event notifications; spaces arrive as '+'.
    const rawKey = record.s3.object.key;
    const key = decodeURIComponent(rawKey.replace(/\+/g, ' '));

    try {
      const res = await processObject(bucket, key);
      results.push(res);
    } catch (err) {
      // Swallowed & logged so one undecodable/corrupt image doesn't block the batch or retry infinitely.
      console.error(`Failed to process s3://${bucket}/${key}:`, err);
      results.push({ key, status: 'error', reason: err.message });
    }
  }

  return { processed: results };
}

/**
 * Compresses one object in place and writes its thumbnail.
 */
async function processObject(bucket, key) {
  // Guard 1: Skip if already a thumbnail
  if (key.startsWith(THUMB_PREFIX)) {
    return { key, status: 'skipped', reason: 'is a thumbnail' };
  }

  let head;
  try {
    head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404 || err.name === 'NoSuchKey') {
      return { key, status: 'skipped', reason: 'gone' };
    }
    throw err;
  }

  // Guard 2: Skip if marker is already present (prevents recursion on in-place overwrites)
  if (head.Metadata && head.Metadata[MARKER_KEY] === MARKER_VALUE) {
    return { key, status: 'skipped', reason: 'already compressed' };
  }

  const size = head.ContentLength || 0;
  if (size > MAX_SOURCE_BYTES) {
    console.warn(`s3://${bucket}/${key} is ${size} bytes - too large to decode safely`);
    return { key, status: 'skipped', reason: 'too large' };
  }

  const getRes = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const originalBytes = await streamToBuffer(getRes.Body);

  let fullBuffer;
  let thumbBuffer;

  try {
    fullBuffer = await encode(originalBytes, MAX_EDGE, QUALITY);
    thumbBuffer = await encode(originalBytes, THUMB_EDGE, THUMB_QUALITY);
  } catch (err) {
    console.warn(`s3://${bucket}/${key} could not be decoded as an image:`, err.message);
    return { key, status: 'skipped', reason: 'not a decodable image' };
  }

  const contentType = CONTENT_TYPES[OUTPUT_FORMAT] || 'image/jpeg';
  let status;

  // Only overwrite if we actually reduced bytes and image isn't tiny
  if (fullBuffer.length < size && size >= MIN_SOURCE_BYTES) {
    await putObject(bucket, key, fullBuffer, contentType);
    status = 'compressed';
  } else {
    // Mark only to avoid re-decoding in subsequent notifications
    await markOnly(bucket, key, head, contentType);
    status = 'kept original';
  }

  // Write thumbnail
  const thumbKey = `${THUMB_PREFIX}${key}`;
  await putObject(bucket, thumbKey, thumbBuffer, contentType);

  const percentSaved = size ? ((1 - fullBuffer.length / size) * 100).toFixed(0) : 0;
  console.log(`s3://${bucket}/${key} ${status}: ${size} -> ${fullBuffer.length} bytes (${percentSaved}% saved), thumb ${thumbBuffer.length} bytes`);

  return {
    key,
    status,
    original_bytes: size,
    compressed_bytes: fullBuffer.length,
    thumbnail_bytes: thumbBuffer.length,
  };
}

/**
 * Resizes and encodes an image buffer using Sharp.
 * - Auto-rotates based on EXIF orientation tag.
 * - Strips sensitive metadata (GPS, EXIF, ICC).
 * - Flattens alpha on white background if outputting JPEG.
 * - Optimizes with progressive/mozjpeg.
 */
async function encode(inputBuffer, maxEdge, quality) {
  let pipeline = sharp(inputBuffer, {
    failOnError: false,
    animated: false,
  });

  // Auto-rotate by EXIF orientation and strip EXIF/GPS metadata
  pipeline = pipeline.rotate();

  // Resize fitting inside maxEdge x maxEdge without enlarging smaller images
  pipeline = pipeline.resize({
    width: maxEdge,
    height: maxEdge,
    fit: 'inside',
    withoutEnlargement: true,
  });

  if (OUTPUT_FORMAT === 'WEBP') {
    pipeline = pipeline.webp({
      quality,
      effort: 6,
    });
  } else {
    // Default to JPEG
    // Flatten alpha transparency onto white background (e.g. for transparent PNG avatars)
    pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
    pipeline = pipeline.jpeg({
      quality,
      progressive: true,
      mozjpeg: true,
      chromaSubsampling: '4:2:0',
    });
  }

  return await pipeline.toBuffer();
}

/**
 * Helper to convert response stream to Buffer.
 */
async function streamToBuffer(stream) {
  if (Buffer.isBuffer(stream)) {
    return stream;
  }
  if (stream?.transformToByteArray) {
    const bytes = await stream.transformToByteArray();
    return Buffer.from(bytes);
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Puts an object in S3 with caching headers and compression marker metadata.
 */
async function putObject(bucket, key, body, contentType) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: {
        [MARKER_KEY]: MARKER_VALUE,
      },
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );
}

/**
 * Copies an object onto itself to set the compressed marker metadata without re-encoding.
 */
async function markOnly(bucket, key, head, defaultContentType) {
  const metadata = Object.assign({}, head.Metadata || {}, {
    [MARKER_KEY]: MARKER_VALUE,
  });

  await s3.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: key,
      CopySource: `${bucket}/${key}`,
      Metadata: metadata,
      MetadataDirective: 'REPLACE',
      ContentType: head.ContentType || defaultContentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );
}

exports.handler = lambdaHandler;
exports.lambda_handler = lambdaHandler;
