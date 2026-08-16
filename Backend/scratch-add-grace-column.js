import prisma from "./lib/prisma.js";

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE timesheet 
      ADD COLUMN IF NOT EXISTS grace_period INT DEFAULT 10;
    `);
    console.log("Successfully ensured grace_period column exists on timesheet table.");
  } catch (err) {
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE timesheet 
        ADD COLUMN grace_period INT DEFAULT 10;
      `);
      console.log("Successfully added grace_period column.");
    } catch (innerErr) {
      console.log("Column may already exist or error:", innerErr.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
