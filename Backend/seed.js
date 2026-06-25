import prisma from './lib/prisma.js';
import bcrypt from 'bcrypt';

async function main() {
  console.log('Seeding database...');

  // 1. Create a company
  const company = await prisma.company.create({
    data: {
      name: 'Your Company',
      email: 'company@example.com',
      phone: '1234567890',
    },
  });
  console.log('Created company:', company.name);

  // 2. Create a location
  const location = await prisma.location.create({
    data: {
      name: 'Office',
      company_id: company.id,
      latitude: '0.0',
      longitude: '0.0',
    },
  });
  console.log('Created location:', location.name);

  // 3. Create a department
  const department = await prisma.department.create({
    data: {
      name: 'General',
      company_id: company.id,
    },
  });
  console.log('Created department:', department.name);

  // 4. Create a position
  const position = await prisma.positions.create({
    data: {
      name: 'Manager',
      department_id: department.id,
    },
  });
  console.log('Created position:', position.name);

  // 5. Create an admin role
  const adminRole = await prisma.role.create({
    data: {
      name: 'Admin',
      company_id: company.id,
    },
  });
  console.log('Created role:', adminRole.name);

  // 6. Create an employee
  const employee = await prisma.employee.create({
    data: {
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@example.com',
      phone_number1: '1234567890',
      gender: 'male',
      company_id: company.id,
      department_id: department.id,
      position_id: position.id,
      role_id: adminRole.id,
    },
  });
  console.log('Created employee:', employee.first_name, employee.last_name);

  // 7. Create a user
  const hashedPassword = await bcrypt.hash('Hr12345', 10);
  const user = await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedPassword,
      employee: {
        connect: { id: employee.id },
      },
    },
  });
  console.log('Created user:', user.username);

  // 8. Create leave types
  const leaveTypes = await prisma.leavetype.createMany({
    data: [
      { name: 'Annual Leave', code: 'AL', default_balance: 10, company_id: company.id },
      { name: 'Sick Leave', code: 'SL', default_balance: 5, company_id: company.id },
      { name: 'Maternity Leave', code: 'ML', default_balance: 90, company_id: company.id },
    ],
  });
  console.log('Created leave types');

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
