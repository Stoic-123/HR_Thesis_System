/**
 * Cloudflare R2 Storage Service
 *
 * Wraps all S3-compatible R2 operations for file uploads and deletions.
 * R2 uses the same @aws-sdk/client-s3 package with a custom endpoint.
 *
 * Environment variables required:
 *   R2_ACCOUNT_ID       — Cloudflare Account ID (32 hex chars)
 *   R2_ACCESS_KEY_ID    — R2 API Token Access Key
 *   R2_SECRET_ACCESS_KEY — R2 API Token Secret Key
 *   R2_BUCKET           — Bucket name (e.g. thesis-bucket)
 *   R2_PUBLIC_URL       — Public bucket URL (e.g. https://pub-xxx.r2.dev)
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const getClient = () => {
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) {
    throw new Error("[Storage] R2_ACCOUNT_ID is not set in environment variables.");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  });
};

/**
 * Upload a file buffer to R2.
 *
 * @param {Buffer} buffer       - File content as a Buffer
 * @param {string} folder       - Destination folder, e.g. "profiles", "documents"
 * @param {string} filename     - File name, e.g. "1720000000_photo.jpg"
 * @param {string} mimetype     - MIME type, e.g. "image/jpeg"
 * @returns {string}            - DB-safe path, e.g. "/uploads/profiles/1720000000_photo.jpg"
 */
export const uploadToStorage = async (buffer, folder, filename, mimetype) => {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("[Storage] R2_BUCKET is not set.");

  // R2 key uses no leading slash: e.g. "profiles/1720000000_photo.jpg"
  const key = `${folder}/${filename}`;

  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimetype || "application/octet-stream",
    })
  );

  // Return the path format stored in DB (matches legacy /uploads/... format)
  return `/uploads/${key}`;
};

/**
 * Delete a file from R2 using its DB path.
 *
 * @param {string} dbPath - Path as stored in DB, e.g. "/uploads/profiles/xxx.jpg"
 */
export const deleteFromStorage = async (dbPath) => {
  if (!dbPath) return;
  const bucket = process.env.R2_BUCKET;
  if (!bucket) return;

  // Convert "/uploads/profiles/xxx.jpg" → "profiles/xxx.jpg"
  const key = dbPath.replace(/^\/uploads\//, "");

  try {
    const client = getClient();
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    console.log(`[Storage] Deleted from R2: ${key}`);
  } catch (err) {
    // Non-fatal: log and continue
    console.error(`[Storage] Failed to delete from R2 (${key}):`, err.message);
  }
};

/**
 * Get the public URL for a file given its DB path.
 *
 * @param {string} dbPath - e.g. "/uploads/profiles/xxx.jpg"
 * @returns {string}      - e.g. "https://pub-xxx.r2.dev/profiles/xxx.jpg"
 */
export const getStorageUrl = (dbPath) => {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "") || "";
  const key = dbPath.replace(/^\/uploads\//, "");
  return `${base}/${key}`;
};
