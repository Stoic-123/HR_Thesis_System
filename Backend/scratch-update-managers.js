import prisma from "./lib/prisma.js";

async function main() {
  console.log("Updating department managers...");

  // Department 5 -> Manager 5 (em sokhai)
  await prisma.department.update({
    where: { id: 5 },
    data: { manager_id: 5 }
  });
  console.log("Department 5 (Store Operations) manager set to employee 5.");

  // Department 6 -> Manager 6 (kim long)
  await prisma.department.update({
    where: { id: 6 },
    data: { manager_id: 6 }
  });
  console.log("Department 6 (Warehouse & Inventory) manager set to employee 6.");

  // Department 7 -> Manager 8 (Siv heng)
  await prisma.department.update({
    where: { id: 7 },
    data: { manager_id: 8 }
  });
  console.log("Department 7 (Accounting & Finance) manager set to employee 8.");

  console.log("Done updating department managers!");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
