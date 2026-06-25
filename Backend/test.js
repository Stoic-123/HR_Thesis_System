import { PrismaClient } from '@prisma/client'; 
const prisma = new PrismaClient(); 

async function main() {
  const p = await prisma.payroll.findUnique({ 
    where: { id: 23 }, 
    include: { payrollperiod: true } 
  });
  console.log(p.payrollperiod);
}

main().finally(() => prisma.$disconnect());
