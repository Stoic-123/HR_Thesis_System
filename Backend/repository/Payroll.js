import prisma from "../lib/prisma.js";

export const payrollInclude = {
  employee: {
    include: {
      positions: true,
      department_employee_department_idTodepartment: true,
    },
  },
  payrollperiod: true,
  payrollitem: true,
  payrolladjustment: {
    include: { user: { select: { id: true, username: true } } },
    orderBy: { created_at: "desc" },
  },
};

export const findPeriodById = (id, companyId) =>
  prisma.payrollperiod.findFirst({
    where: { id, company_id: companyId },
    include: {
      payroll: {
        include: payrollInclude,
        orderBy: { employee: { first_name: "asc" } },
      },
    },
  });

export const listPeriods = (companyId, filters = {}) => {
  const where = { company_id: companyId };
  if (filters.status) where.status = filters.status;
  if (filters.year) {
    where.start_date = {
      gte: new Date(`${filters.year}-01-01`),
      lte: new Date(`${filters.year}-12-31`),
    };
  }
  return prisma.payrollperiod.findMany({
    where,
    orderBy: { pay_date: "desc" },
    include: {
      _count: { select: { payroll: true } },
    },
  });
};

export const createPeriod = (data) => prisma.payrollperiod.create({ data });

export const updatePeriod = (id, data) =>
  prisma.payrollperiod.update({ where: { id }, data });

export const findPayrollById = (id, companyId) =>
  prisma.payroll.findFirst({
    where: { id, company_id: companyId },
    include: payrollInclude,
  });

export const listPayrolls = (companyId, filters = {}) => {
  const where = { company_id: companyId };
  if (filters.payroll_period_id) where.payroll_period_id = Number(filters.payroll_period_id);
  if (filters.status) where.status = filters.status;
  if (filters.employee_id) where.employee_id = Number(filters.employee_id);
  if (filters.search) {
    where.employee = {
      OR: [
        { first_name: { contains: filters.search } },
        { last_name: { contains: filters.search } },
      ],
    };
  }
  return prisma.payroll.findMany({
    where,
    include: payrollInclude,
    orderBy: { employee: { first_name: "asc" } },
  });
};

export const findPayrollsByEmployee = (employeeId, companyId, year) => {
  const where = { employee_id: employeeId, company_id: companyId };
  if (year) {
    where.payrollperiod = {
      start_date: {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      },
    };
  }
  return prisma.payroll.findMany({
    where,
    include: payrollInclude,
    orderBy: { payrollperiod: { pay_date: "desc" } },
  });
};

export const upsertPayroll = (data) =>
  prisma.payroll.upsert({
    where: {
      payroll_period_id_employee_id: {
        payroll_period_id: data.payroll_period_id,
        employee_id: data.employee_id,
      },
    },
    create: data,
    update: data,
  });

export const updatePayrollRecord = (id, data) =>
  prisma.payroll.update({ where: { id }, data });

export const updatePayrollsByPeriod = (periodId, data) =>
  prisma.payroll.updateMany({ where: { payroll_period_id: periodId }, data });

export const deletePayrollItems = (payrollId) =>
  prisma.payrollitem.deleteMany({ where: { payroll_id: payrollId } });

export const createPayrollItems = (items) =>
  prisma.payrollitem.createMany({ data: items });

export const createAdjustment = (data) => prisma.payrolladjustment.create({ data });

export const getActiveEmployees = (companyId) =>
  prisma.employee.findMany({
    where: { company_id: companyId, is_active: "active" },
    include: {
      positions: true,
      department_employee_department_idTodepartment: true,
    },
  });

export const getApprovedOvertimeForPeriod = (employeeId, startDate, endDate) =>
  prisma.overtime.findMany({
    where: {
      employee_id: employeeId,
      status: "approved",
      start_date: { gte: startDate },
      end_date: { lte: endDate },
    },
    orderBy: { start_date: "asc" },
  });

export const getApprovedLeaveForPeriod = (employeeId, startDate, endDate) =>
  prisma.leaverecord.findMany({
    where: {
      employee_id: employeeId,
      status: "approved",
      start_date: { lte: endDate },
      end_date: { gte: startDate },
    },
    include: {
      leavetype: { select: { id: true, name: true, code: true } },
    },
    orderBy: { start_date: "asc" },
  });

export const getLateAttendanceForPeriod = (employeeId, startDate, endDate) =>
  prisma.attendancerecord.findMany({
    where: {
      employee_id: employeeId,
      work_at: { gte: startDate, lte: endDate },
      OR: [{ is_late: true }, { status: "late" }],
    },
    select: { work_at: true },
    orderBy: { work_at: "asc" },
  });

export const getDashboardStats = async (companyId) => {
  const [currentPeriod, payrollCounts, aggregates] = await Promise.all([
    prisma.payrollperiod.findFirst({
      where: { company_id: companyId },
      orderBy: { pay_date: "desc" },
    }),
    prisma.payroll.groupBy({
      by: ["status"],
      where: { company_id: companyId },
      _count: { id: true },
    }),
    prisma.payroll.aggregate({
      where: {
        company_id: companyId,
        payrollperiod: { status: { in: ["generated", "approved", "paid"] } },
      },
      _sum: { gross_salary: true, net_salary: true },
      _count: { id: true },
    }),
  ]);

  const statusMap = payrollCounts.reduce((acc, row) => {
    acc[row.status] = row._count.id;
    return acc;
  }, {});

  return {
    currentPeriod,
    totalEmployees: aggregates._count.id,
    totalGross: Number(aggregates._sum.gross_salary || 0),
    totalNet: Number(aggregates._sum.net_salary || 0),
    approvedCount: statusMap.approved || 0,
    paidCount: statusMap.paid || 0,
  };
};

export const getMonthlySummary = (companyId, year) =>
  prisma.payroll.findMany({
    where: {
      company_id: companyId,
      status: { in: ["approved", "paid"] },
      payrollperiod: {
        start_date: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      },
    },
    include: { payrollperiod: true, employee: true },
  });

export const getNextPayrollPeriod = (companyId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return prisma.payrollperiod.findFirst({
    where: {
      company_id: companyId,
      pay_date: { gte: today },
      status: { in: ["draft", "generated", "approved"] },
    },
    orderBy: { pay_date: "asc" },
  });
};
export const deletePayrollPeriod = (id, companyId) => prisma.payrollperiod.delete({ where: { id, company_id: companyId } });
