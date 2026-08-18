// Backend/scripts/migrate-app-menu-to-r2.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import prisma from "../lib/prisma.js";
import { uploadToStorage, getStorageUrl } from "../service/Storage.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, "../../mobile-app-hr/assets");

const DEFAULT_MENU_ASSETS = [
  { key: "online-attendance", label: "Online Attendance", file: "online.png", color: "blue", order: 1 },
  { key: "leave", label: "Leave", file: "leave.png", color: "orange", order: 2 },
  { key: "overtime", label: "Overtime", file: "overtime.png", color: "orange", order: 3 },
  { key: "performance", label: "Employee Performance", file: "performance.png", color: "blue", order: 4 },
  { key: "calendar", label: "Holiday Calendar", file: "calendar.png", color: "blue", order: 5 },
  { key: "asset", label: "Asset Management", file: "scanner.png", color: "blue", order: 6 },
];

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║   Cloudflare R2 App Menu Icons Migration Script     ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  if (companies.length === 0) {
    console.log("⚠️ No companies found in database.");
    process.exit(0);
  }

  for (const company of companies) {
    console.log(`\n🏢 Processing Company ID: ${company.id} (${company.name})`);

    for (const item of DEFAULT_MENU_ASSETS) {
      const localFilePath = path.join(ASSETS_DIR, item.file);
      let r2Url = null;

      if (fs.existsSync(localFilePath)) {
        try {
          const fileBuffer = fs.readFileSync(localFilePath);
          const filename = `${item.key}_default.png`;
          const dbPath = await uploadToStorage(fileBuffer, "app-menu", filename, "image/png");
          if (dbPath) {
            r2Url = getStorageUrl(dbPath);
            console.log(`  ✅ Uploaded ${item.file} -> ${r2Url}`);
          }
        } catch (e) {
          console.error(`  ❌ Failed to upload ${item.file}:`, e.message);
        }
      } else {
        console.warn(`  ⚠️ Asset file not found at: ${localFilePath}`);
      }

      // Upsert into appmenu table
      await prisma.appmenu.upsert({
        where: {
          company_id_menu_key: {
            company_id: company.id,
            menu_key: item.key,
          },
        },
        update: {
          label: item.label,
          color: item.color,
          order: item.order,
          ...(r2Url && { icon_url: r2Url }),
        },
        create: {
          company_id: company.id,
          menu_key: item.key,
          label: item.label,
          color: item.color,
          order: item.order,
          icon_url: r2Url,
          is_active: true,
        },
      });
      console.log(`  💾 Updated DB record for: [${item.key}] ${item.label}`);
    }
  }

  console.log("\n🎉 App Menu Migration Completed Successfully!\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("💥 Migration failed:", err);
  process.exit(1);
});
