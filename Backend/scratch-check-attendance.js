import prisma from "./lib/prisma.js";

async function main() {
  try {
    console.log("=== TIME MODES ===");
    const timeModes = await prisma.timemode.findMany();
    console.log(timeModes);

    console.log("\n=== TIMESHEETS ===");
    const timesheets = await prisma.timesheet.findMany();
    console.log(timesheets);

    console.log("\n=== EMPLOYEE WORKING PROFILES ===");
    const profiles = await prisma.employeeworkingprofile.findMany({
      include: {
        employee: {
          select: { id: true, first_name: true, last_name: true }
        },
        dayofweek: {
          include: {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: true,
            sunday: true
          }
        }
      }
    });
    console.log(JSON.stringify(profiles, null, 2));

  } catch (error) {
    console.error("Error querying attendance config:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
