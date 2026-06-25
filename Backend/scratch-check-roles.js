import prisma from "./lib/prisma.js";

async function main() {
  try {
    const roles = await prisma.role.findMany();
    console.log("Roles in Database:", roles);
  } catch (error) {
    console.error("Error querying roles:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
