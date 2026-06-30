import prisma from "./lib/prisma.js";

async function main() {
  try {
    const adminRecordsCount = await prisma.attendancerecord.count({
      where: {
        employee_id: 2
      }
    });

    const totalRecordsCount = await prisma.attendancerecord.count();

    console.log(`Admin (ID: 2) attendance records: ${adminRecordsCount}`);
    console.log(`Total attendance records in database: ${totalRecordsCount}`);
  } catch (err) {
    console.error("Database check failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
