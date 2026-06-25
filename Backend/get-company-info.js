import prisma from "./lib/prisma.js";
import path from "path";
import fs from "fs";

async function main() {
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      telegram_bot_token: true,
      telegram_group_id: true,
      telegram_attendance_group_id: true,
      telegram_leave_group_id: true,
      telegram_overtime_group_id: true,
      telegram_announcement_group_id: true,
    },
  });

  console.log("Companies:");
  console.log(companies);

  // For each company, set offset to 0
  for (const company of companies) {
    if (company.telegram_bot_token) {
      const key = company.telegram_bot_token.slice(-8);
      const offsetPath = path.join(process.cwd(), `.tg_offset_${key}`);
      console.log(`Setting offset to 0 for company ${company.id} (key: ${key}) at ${offsetPath}`);
      fs.writeFileSync(offsetPath, "0", "utf8");
    }
  }

  console.log("Done!");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
