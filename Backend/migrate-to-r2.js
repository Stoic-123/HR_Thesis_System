/**
 * migrate-to-r2.js
 *
 * One-time migration script: uploads all files from ./public/uploads/ to
 * Cloudflare R2, then deletes the local copies to free disk space.
 *
 * Usage (run from the Backend directory):
 *   node migrate-to-r2.js
 *
 * Make sure your .env file has the R2_* variables set before running.
 *
 * What it does:
 *   1. Walks all files recursively under ./public/uploads/
 *   2. Uploads each file to R2 (preserving folder structure)
 *   3. Deletes each local file after a successful upload
 *   4. Prints a summary of uploaded, skipped, and failed files
 *
 * The R2 key for a file at ./public/uploads/profiles/xxx.jpg → profiles/xxx.jpg
 * DB paths (/uploads/profiles/xxx.jpg) remain the same — no DB changes needed.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime-types";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ──────────────────────────────────────────────────────────────────

const UPLOADS_DIR = path.join(__dirname, "public", "uploads");

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error("\n❌ Missing required R2 environment variables.");
  console.error("   Ensure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET are set in .env\n");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recursively list all files under a directory.
 * @param {string} dir
 * @returns {string[]} Absolute file paths
 */
const listFiles = (dir) => {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFiles(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
};

/**
 * Check if a key already exists in R2 (skip re-upload if so).
 */
const existsInR2 = async (key) => {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const main = async () => {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   Cloudflare R2 Migration Script             ║");
  console.log("╚══════════════════════════════════════════════╝\n");
  console.log(`📁 Source:  ${UPLOADS_DIR}`);
  console.log(`☁️  Bucket:  ${R2_BUCKET}`);
  console.log(`🌐 Public:  ${R2_PUBLIC_URL || "(not set — files still upload but no public URL shown)"}\n`);

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log("⚠️  ./public/uploads/ directory does not exist. Nothing to migrate.");
    process.exit(0);
  }

  const files = listFiles(UPLOADS_DIR);

  if (files.length === 0) {
    console.log("✅ No files found in ./public/uploads/ — already clean!");
    process.exit(0);
  }

  console.log(`Found ${files.length} file(s) to migrate.\n`);

  let uploaded = 0;
  let skipped  = 0;
  let failed   = 0;
  const errors = [];

  for (const filePath of files) {
    // Convert absolute path to R2 key: ./public/uploads/profiles/xxx.jpg → profiles/xxx.jpg
    const relative = path.relative(UPLOADS_DIR, filePath);
    const key = relative.replace(/\\/g, "/"); // normalize Windows backslashes

    process.stdout.write(`  ⬆️  ${key} ... `);

    try {
      // Skip if already in R2
      const alreadyExists = await existsInR2(key);
      if (alreadyExists) {
        console.log("skipped (already in R2)");
        // Still delete locally to free disk
        fs.unlinkSync(filePath);
        skipped++;
        continue;
      }

      const buffer      = fs.readFileSync(filePath);
      const contentType = mime.lookup(filePath) || "application/octet-stream";

      await s3.send(
        new PutObjectCommand({
          Bucket:      R2_BUCKET,
          Key:         key,
          Body:        buffer,
          ContentType: contentType,
        })
      );

      // Delete local file after successful upload
      fs.unlinkSync(filePath);
      console.log("✅ done");
      uploaded++;
    } catch (err) {
      console.log(`❌ FAILED: ${err.message}`);
      errors.push({ key, error: err.message });
      failed++;
    }
  }

  // Remove empty directories
  const cleanEmptyDirs = (dir) => {
    if (!fs.existsSync(dir)) return;
    let entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const full = path.join(dir, entry);
      if (fs.statSync(full).isDirectory()) {
        cleanEmptyDirs(full);
      }
    }
    entries = fs.readdirSync(dir);
    if (entries.length === 0) {
      fs.rmdirSync(dir);
      console.log(`  🗑️  Removed empty dir: ${path.relative(__dirname, dir)}`);
    }
  };
  cleanEmptyDirs(UPLOADS_DIR);

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   Migration Complete                         ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`  ✅ Uploaded:  ${uploaded}`);
  console.log(`  ⏭️  Skipped:   ${skipped} (already in R2)`);
  console.log(`  ❌ Failed:    ${failed}`);

  if (errors.length > 0) {
    console.log("\nFailed files:");
    for (const { key, error } of errors) {
      console.log(`  • ${key}: ${error}`);
    }
  }

  if (uploaded + skipped > 0) {
    console.log("\n💡 Run  df -h /  on your server to confirm disk space recovered.");
  }
};

main().catch((err) => {
  console.error("\n💥 Unexpected error:", err.message);
  process.exit(1);
});
