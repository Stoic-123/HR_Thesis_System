import prisma from "./lib/prisma.js";

async function main() {
  const result = await prisma.employee.update({
    where: { id: 2 },
    data: { telegram_chat_id: "1104299436" }
  });
  console.log("Admin telegram_chat_id updated successfully to:", result.telegram_chat_id);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
