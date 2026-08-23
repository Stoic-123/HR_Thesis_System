import prisma from "./lib/prisma.js";

async function syncWorkingProfiles() {
  console.log("==========================================");
  console.log("Syncing Employee Working Profiles (Production & Local)");
  console.log("==========================================");

  try {
    const companies = await prisma.company.findMany();
    if (!companies.length) {
      console.log("No companies found.");
      return;
    }

    for (const company of companies) {
      console.log(`\nProcessing Company: ${company.name} (ID: ${company.id})`);

      // 1. Find default dayofweek schedule
      let defaultDow = await prisma.dayofweek.findFirst({
        where: { company_id: company.id, is_default: true },
      });

      if (!defaultDow) {
        defaultDow = await prisma.dayofweek.findFirst({
          where: { company_id: company.id },
        });
      }

      if (!defaultDow) {
        console.log(`  [!] Warning: No dayofweek schedule found for company ${company.id}. Skipping.`);
        continue;
      }

      console.log(`  Default Schedule: "${defaultDow.name}" (ID: ${defaultDow.id})`);

      // 2. Find all active employees
      const activeEmployees = await prisma.employee.findMany({
        where: {
          company_id: company.id,
          is_active: "active",
        },
        include: {
          employeeworkingprofile: true,
        },
      });

      console.log(`  Total Active Employees: ${activeEmployees.length}`);

      let createdCount = 0;
      let alreadyAssigned = 0;

      for (const emp of activeEmployees) {
        if (!emp.employeeworkingprofile) {
          await prisma.employeeworkingprofile.create({
            data: {
              employee_id: emp.id,
              day_of_week_id: defaultDow.id,
              allow_online_bypass_location: false,
            },
          });
          console.log(`  + Assigned working profile to: ${emp.first_name} ${emp.last_name} (ID: ${emp.id})`);
          createdCount++;
        } else {
          alreadyAssigned++;
        }
      }

      console.log(`  Result: ${alreadyAssigned} already had profile, ${createdCount} newly assigned.`);
    }

    console.log("\n==========================================");
    console.log(" Working Profiles Sync Complete!");
    console.log("==========================================");
  } catch (error) {
    console.error("Error syncing working profiles:", error);
  } finally {
    await prisma.$disconnect();
  }
}

syncWorkingProfiles();
