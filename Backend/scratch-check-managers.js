import prisma from "./lib/prisma.js";

async function main() {
  console.log("=== EMPLOYEES ===");
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      first_name: true,
      last_name: true,
      department_id: true,
      role: { select: { name: true } },
      user: {
        select: {
          id: true,
          username: true,
        }
      }
    }
  });
  console.log(JSON.stringify(employees, null, 2));

  console.log("\n=== DEPARTMENTS ===");
  const departments = await prisma.department.findMany({
    select: {
      id: true,
      name: true,
      manager_id: true,
      employee_department_manager_idToemployee: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
        }
      }
    }
  });
  console.log(JSON.stringify(departments, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
