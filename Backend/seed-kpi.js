import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding KPI data...");

  // 1. Get first company and department
  const company = await prisma.company.findFirst();
  if (!company) {
    console.error("No company found. Please seed basic HR data first.");
    return;
  }

  const department = await prisma.department.findFirst({ where: { company_id: company.id } });
  if (!department) {
    console.error("No department found.");
    return;
  }

  // 2. Create a KPI Cycle
  const cycle = await prisma.kpicycle.create({
    data: {
      company_id: company.id,
      name: '2026 Annual Performance Cycle',
      start_date: new Date('2026-01-01T00:00:00.000Z'),
      end_date: new Date('2026-12-31T23:59:59.000Z'),
      status: 'active'
    }
  });
  console.log("Created KPI Cycle: ", cycle.name);

  // 3. Create a KPI Template
  const template = await prisma.kpitemplate.create({
    data: {
      company_id: company.id,
      name: 'Software Engineer KPI Template',
      description: 'Standard KPI for all software engineering roles'
    }
  });

  // 4. Create Template Goals
  const goals = [
    { category: 'Attendance', title: 'Maintain 98% Attendance', target_value: 98, target_unit: '%', weight: 20 },
    { category: 'Performance', title: 'Task Completion Rate', target_value: 100, target_unit: '%', weight: 40 },
    { category: 'Teamwork', title: 'Peer Review Score', target_value: 5, target_unit: 'rating', weight: 20 },
    { category: 'Professionalism', title: 'No Disciplinary Actions', target_value: 100, target_unit: '%', weight: 20 }
  ];

  for (const goal of goals) {
    await prisma.kpitemplategoal.create({
      data: {
        ...goal,
        template_id: template.id
      }
    });
  }
  console.log("Created KPI Template and Goals: ", template.name);

  // 5. Assign to a specific employee to test (we'll just assign to all in the first department)
  const employees = await prisma.employee.findMany({ where: { department_id: department.id } });
  let assignedCount = 0;

  for (const emp of employees) {
    const empKpi = await prisma.employeekpi.create({
      data: {
        employee_id: emp.id,
        cycle_id: cycle.id,
        status: 'active'
      }
    });

    for (const goal of goals) {
      await prisma.kpigoal.create({
        data: {
          employee_kpi_id: empKpi.id,
          category: goal.category,
          title: goal.title,
          target_value: goal.target_value,
          target_unit: goal.target_unit,
          weight: goal.weight,
          current_progress: 0
        }
      });
    }
    assignedCount++;
  }

  console.log(`Assigned template to ${assignedCount} employees in department ${department.name}.`);
  console.log("Seeding complete!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
