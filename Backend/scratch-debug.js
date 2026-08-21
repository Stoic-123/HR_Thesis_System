import prisma from './lib/prisma.js';

async function main() {
  const records = await prisma.attendancerecord.findMany({
    take: 10,
    orderBy: { id: 'desc' },
    include: { timemode: true, employee: { include: { company: true } } }
  });
  console.log('Recent Attendance Records:', JSON.stringify(records.map(r => ({
    id: r.id,
    emp: r.employee?.first_name + ' ' + r.employee?.last_name,
    work_at: r.work_at,
    type: r.type,
    status: r.status,
    timemode: r.timemode?.name,
    time_mode_id: r.time_mode_id,
    company_id: r.employee?.company_id
  })), null, 2));

  const timesheets = await prisma.timesheet.findMany();
  console.log('Timesheets:', JSON.stringify(timesheets, null, 2));

  const timemodes = await prisma.timemode.findMany();
  console.log('Timemodes:', JSON.stringify(timemodes, null, 2));

  const profiles = await prisma.employeeworkingprofile.findMany({
    include: {
      dayofweek: {
        include: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: true,
        }
      }
    }
  });
  console.log('Profiles:', JSON.stringify(profiles, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
