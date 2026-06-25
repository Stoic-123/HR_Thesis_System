import prisma from "./lib/prisma.js";

async function main() {
  const user = await prisma.user.findFirst({
    where: { username: "em sokhai" },
    include: {
      employee: {
        include: {
          role: {
            include: {
              rolebaseaccess: true
            }
          }
        }
      }
    }
  });
  console.log("User:", JSON.stringify(user, null, 2));
}

main().catch(console.error);
