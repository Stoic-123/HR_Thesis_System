import prisma from "./lib/prisma.js";

async function main() {
  // Get all roles
  const roles = await prisma.role.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  console.log("Roles:");
  console.log(roles);

  // Get all employees with their roles
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      first_name: true,
      last_name: true,
      telegram_username: true,
      telegram_chat_id: true,
      role: {
        select: {
          id: true,
          name: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      department_employee_department_idTodepartment: {
        select: {
          id: true,
          name: true,
          employee_department_manager_idToemployee: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      },
    },
  });

  console.log("\nEmployees with roles:");
  console.log(
    employees.map((e) => ({
      id: e.id,
      name: `${e.first_name} ${e.last_name}`,
      role: e.role?.name,
      company: e.company?.name,
      department: e.department_employee_department_idTodepartment?.name,
      departmentManager: e.department_employee_department_idTodepartment?.employee_department_manager_idToemployee
        ? `${e.department_employee_department_idTodepartment.employee_department_manager_idToemployee.first_name} ${e.department_employee_department_idTodepartment.employee_department_manager_idToemployee.last_name}`
        : "none",
      telegramUsername: e.telegram_username,
      telegramChatId: e.telegram_chat_id,
    }))
  );

  // Get all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      employee: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
        },
      },
    },
  });

  console.log("\nUsers:");
  console.log(users);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
