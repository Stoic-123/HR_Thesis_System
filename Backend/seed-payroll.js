import prisma from "./lib/prisma.js";
import { encrypt, decrypt } from "./utils/crypto.js";
import { calculateSalaryTax } from "./service/PayrollCalculation.js";

async function seedPayroll() {
  console.log("Seeding payroll data...");

  const company = await prisma.company.findFirst();
  if (!company) {
    console.log("No company found. Run main seed first.");
    return;
  }

  const employees = await prisma.employee.findMany({
    where: { company_id: company.id, is_active: "active" },
    take: 5,
  });

  if (!employees.length) {
    console.log("No employees found.");
    return;
  }

  for (const emp of employees) {
    const decSalary = emp.base_salary ? Number(decrypt(emp.base_salary)) : 0;
    if (!emp.base_salary || decSalary === 0) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { base_salary: encrypt("600") },
      });
    }
  }

  const periods = [
    {
      name: "August 2025",
      start_date: new Date("2025-08-01"),
      end_date: new Date("2025-08-31"),
      pay_date: new Date("2025-09-05"),
      status: "paid",
    },
    {
      name: "September 2025",
      start_date: new Date("2025-09-01"),
      end_date: new Date("2025-09-30"),
      pay_date: new Date("2025-10-05"),
      status: "paid",
    },
    {
      name: "October 2025",
      start_date: new Date("2025-10-01"),
      end_date: new Date("2025-10-31"),
      pay_date: new Date("2025-11-05"),
      status: "approved",
    },
    {
      name: "November 2025",
      start_date: new Date("2025-11-01"),
      end_date: new Date("2025-11-30"),
      pay_date: new Date("2025-12-05"),
      status: "draft",
    },
  ];

  const updatedEmployees = await prisma.employee.findMany({
    where: { company_id: company.id, is_active: "active" },
    take: 5,
  });

  for (const periodData of periods) {
    const existing = await prisma.payrollperiod.findFirst({
      where: { company_id: company.id, name: periodData.name },
    });
    if (existing) {
      console.log(`Period ${periodData.name} already exists, skipping.`);
      continue;
    }

    const period = await prisma.payrollperiod.create({
      data: {
        company_id: company.id,
        ...periodData,
      },
    });

    for (const employee of updatedEmployees) {
      const base = employee.base_salary ? Number(decrypt(employee.base_salary)) || 600 : 600;
      const allowance = Math.round(base * 0.1 * 100) / 100;
      const overtime = 0;
      const bonus = 0;
      const deduction = 0;
      const gross = base + allowance + overtime + bonus;
      const tax = calculateSalaryTax(gross);
      const net = gross - deduction - tax;

      const payroll = await prisma.payroll.create({
        data: {
          company_id: company.id,
          payroll_period_id: period.id,
          employee_id: employee.id,
          base_salary: base,
          allowance,
          overtime,
          bonus,
          deduction,
          tax,
          gross_salary: gross,
          net_salary: net,
          status: periodData.status === "draft" ? "draft" : periodData.status,
        },
      });

      await prisma.payrollitem.createMany({
        data: [
          { payroll_id: payroll.id, type: "base_salary", label: "Base Salary", amount: base },
          { payroll_id: payroll.id, type: "allowance", label: "Allowance", amount: allowance },
          { payroll_id: payroll.id, type: "tax", label: "Tax", amount: tax },
        ],
      });
    }

    console.log(`Created period: ${periodData.name}`);
  }

  console.log("Payroll seed completed.");
}

seedPayroll()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
