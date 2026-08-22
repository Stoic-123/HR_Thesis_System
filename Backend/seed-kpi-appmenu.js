import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();
import prisma from './lib/prisma.js';
import { uploadToStorage, getStorageUrl } from './service/Storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const assetPath = path.join(__dirname, '../mobile-app-hr/assets/performance.png');
  let iconUrl = null;
  if (fs.existsSync(assetPath)) {
    const fileBuffer = fs.readFileSync(assetPath);
    const dbPath = await uploadToStorage(fileBuffer, 'app-menu', 'kpi_default.png', 'image/png');
    if (dbPath) {
      iconUrl = getStorageUrl(dbPath);
      console.log('✅ Uploaded performance.png to R2:', iconUrl);
    }
  }

  const companies = await prisma.company.findMany();
  for (const c of companies) {
    const upserted = await prisma.appmenu.upsert({
      where: {
        company_id_menu_key: {
          company_id: c.id,
          menu_key: 'kpi',
        },
      },
      update: {
        label: 'Performance (KPI)',
        is_active: true,
        order: 4,
        color: 'blue',
        ...(iconUrl ? { icon_url: iconUrl } : {}),
      },
      create: {
        company_id: c.id,
        menu_key: 'kpi',
        label: 'Performance (KPI)',
        icon_url: iconUrl,
        color: 'blue',
        is_active: true,
        order: 4,
      },
    });
    console.log('✅ Upserted KPI appmenu for company', c.id, upserted);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
