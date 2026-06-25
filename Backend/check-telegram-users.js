import prisma from "./lib/prisma.js";

async function main() {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      first_name: true,
      last_name: true,
      telegram_username: true,
      telegram_chat_id: true,
      company_id: true,
    },
  });

  console.log("Employees with Telegram info:");
  console.log(employees.map(e => ({
    id: e.id,
    name: `${e.first_name} ${e.last_name}`,
    username: e.telegram_username,
    chatId: e.telegram_chat_id,
    companyId: e.company_id,
  })));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
