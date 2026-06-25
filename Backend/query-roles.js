import prisma from "./lib/prisma.js";

async function main() {
  const allAccess = await prisma.rolebaseaccess.findMany({
    include: {
      role: true
    }
  });
  console.log("All RoleBaseAccess:", JSON.stringify(allAccess, null, 2));
}

main().catch(console.error);
