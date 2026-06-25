import prisma from "../lib/prisma.js";
import fs from "fs";
import path from "path";
import { decrypt } from "../utils/crypto.js";
import {
  findPeriodById,
  listPeriods,
  createPeriod,
  updatePeriod,
  findPayrollById,
  listPayrolls,
  findPayrollsByEmployee,
  upsertPayroll,
  updatePayrollRecord,
  updatePayrollsByPeriod,
  deletePayrollItems,
  createPayrollItems,
  createAdjustment,
  getActiveEmployees,
  getApprovedOvertimeForPeriod,
  getApprovedLeaveForPeriod,
  getLateAttendanceForPeriod,
  getDashboardStats,
  getMonthlySummary,
  getNextPayrollPeriod,
  deletePayrollPeriod,
} from "../repository/Payroll.js";
import {
  calculateOvertimeAmount,
  calculateOvertimeHours,
  countLeaveDaysInPeriod,
  estimateDailySalary,
  getOvertimeHourlyRate,
  computePayrollAmounts,
  buildPayrollItems,
  toNumber,
  roundMoney,
  daysUntilDate,
  formatMonthYear,
  formatShortMonth,
  isReadOnlyStatus,
} from "./PayrollCalculation.js";
import { generatePayslipPdf } from "./PayrollPayslip.js";

const serializePayroll = (record) => ({
  ...record,
  base_salary: toNumber(record.base_salary),
  allowance: toNumber(record.allowance),
  overtime: toNumber(record.overtime),
  bonus: toNumber(record.bonus),
  deduction: toNumber(record.deduction),
  tax: toNumber(record.tax),
  gross_salary: toNumber(record.gross_salary),
  net_salary: toNumber(record.net_salary),
  payrollitem: record.payrollitem?.map((item) => ({
    ...item,
    amount: toNumber(item.amount),
  })),
});

const serializePeriod = (period) => ({
  ...period,
  payroll: period.payroll?.map(serializePayroll),
});

export const createPayrollPeriod = async (companyId, payload) => {
  const period = await createPeriod({
    company_id: companyId,
    name: payload.name,
    start_date: new Date(payload.start_date),
    end_date: new Date(payload.end_date),
    pay_date: new Date(payload.pay_date),
    status: "draft",
  });
  return { result: true, data: period };
};

export const getPayrollPeriods = async (companyId, filters) => {
  const periods = await listPeriods(companyId, filters);
  return { result: true, data: periods };
};

export const getPayrollDashboard = async (companyId) => {
  const stats = await getDashboardStats(companyId);
  const year = new Date().getFullYear();
  const monthlyData = await getMonthlySummary(companyId, year);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthMap = {};
  for (const m of months) monthMap[m] = 0;

  for (const row of monthlyData) {
    const key = formatShortMonth(row.payrollperiod.start_date);
    if (monthMap[key] !== undefined) {
      monthMap[key] += toNumber(row.net_salary);
    }
  }

  const nextPeriod = await getNextPayrollPeriod(companyId);
  const daysUntilNextPayroll = nextPeriod ? daysUntilDate(nextPeriod.pay_date) : null;

  return {
    result: true,
    data: {
      currentPeriod: stats.currentPeriod,
      totalEmployees: stats.totalEmployees,
      totalGrossSalary: stats.totalGross,
      totalNetSalary: stats.totalNet,
      approvedPayrolls: stats.approvedCount,
      paidPayrolls: stats.paidCount,
      daysUntilNextPayroll,
      nextPayDate: nextPeriod?.pay_date || null,
      monthlySummary: Object.entries(monthMap).map(([month, netSalary]) => ({
        month,
        netSalary,
      })),
    },
  };
};

export const generatePayroll = async (companyId, payrollPeriodId) => {
  const period = await findPeriodById(payrollPeriodId, companyId);
  if (!period) throw new Error("Payroll period not found");
  if (isReadOnlyStatus(period.status)) {
    throw new Error("Cannot generate payroll for an approved or paid period");
  }

  const employees = await getActiveEmployees(companyId);
  if (!employees.length) throw new Error("No active employees found");

  const generated = [];

  for (const employee of employees) {
    const overtimeRecords = await getApprovedOvertimeForPeriod(
      employee.id,
      period.start_date,
      period.end_date,
    );

    const base_salary = toNumber(decrypt(employee.base_salary)) || 600;
    const allowance = roundDefaultAllowance(base_salary);
    const overtime = calculateOvertimeAmount(overtimeRecords, base_salary);
    const bonus = 0;
    const components = { base_salary, allowance, overtime, bonus, deduction: 0 };
    const { gross_salary: gross, tax, net_salary } = computePayrollAmounts(components);

    const payroll = await upsertPayroll({
      company_id: companyId,
      payroll_period_id: payrollPeriodId,
      employee_id: employee.id,
      base_salary,
      allowance,
      overtime,
      bonus,
      deduction: 0,
      tax,
      gross_salary: gross,
      net_salary,
      status: "generated",
    });

    await deletePayrollItems(payroll.id);
    await createPayrollItems(
      buildPayrollItems({ ...components, tax, gross_salary: gross }).map((item) => ({
        ...item,
        payroll_id: payroll.id,
      })),
    );

    generated.push(payroll);
  }

  await updatePeriod(payrollPeriodId, { status: "generated", updated_at: new Date() });

  return {
    result: true,
    message: `Generated payroll for ${generated.length} employees`,
    data: { payroll_period_id: payrollPeriodId, count: generated.length },
  };
};

const roundDefaultAllowance = (baseSalary) => Math.round(toNumber(baseSalary) * 0.1 * 100) / 100;

export const approvePayroll = async (companyId, payrollPeriodId) => {
  const period = await findPeriodById(payrollPeriodId, companyId);
  if (!period) throw new Error("Payroll period not found");
  if (period.status !== "generated") {
    throw new Error("Only generated payroll periods can be approved");
  }
  if (!period.payroll?.length) throw new Error("No payroll records to approve");

  await updatePeriod(payrollPeriodId, { status: "approved", updated_at: new Date() });
  await updatePayrollsByPeriod(payrollPeriodId, { status: "approved", updated_at: new Date() });

  return { result: true, message: "Payroll approved successfully" };
};

export const markPayrollPaid = async (companyId, payrollPeriodId) => {
  const period = await findPeriodById(payrollPeriodId, companyId);
  if (!period) throw new Error("Payroll period not found");
  if (period.status !== "approved") {
    throw new Error("Only approved payroll periods can be marked as paid");
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });

  for (const payroll of period.payroll) {
    const fullRecord = await findPayrollById(payroll.id, companyId);
    const payslipPath = await generatePayslipPdf(fullRecord, company);
    await updatePayrollRecord(payroll.id, {
      status: "paid",
      payslip_path: payslipPath,
      updated_at: new Date(),
    });
  }

  await updatePeriod(payrollPeriodId, { status: "paid", updated_at: new Date() });

  return { result: true, message: "Payroll marked as paid and payslips generated" };
};

export const getPayrolls = async (companyId, filters) => {
  const payrolls = await listPayrolls(companyId, filters);
  return { result: true, data: payrolls.map(serializePayroll) };
};

const buildPayrollPeriodContext = async (payroll) => {
  const period = payroll.payrollperiod;
  if (!period) return null;

  const startDate = new Date(period.start_date);
  const endDate = new Date(period.end_date);
  endDate.setHours(23, 59, 59, 999);

  const employeeId = payroll.employee_id;
  const baseSalary = toNumber(payroll.base_salary);

  const [overtimeRecords, leaveRecords, lateRecords] = await Promise.all([
    getApprovedOvertimeForPeriod(employeeId, startDate, endDate),
    getApprovedLeaveForPeriod(employeeId, startDate, endDate),
    getLateAttendanceForPeriod(employeeId, startDate, endDate),
  ]);

  const lateDays = new Set(
    lateRecords.map((record) => record.work_at.toISOString().split("T")[0]),
  ).size;

  const leaveItems = leaveRecords.map((leave) => {
    const days = countLeaveDaysInPeriod(leave.start_date, leave.end_date, startDate, endDate);
    return {
      id: leave.id,
      leave_type: leave.leavetype?.name || "Leave",
      leave_code: leave.leavetype?.code || null,
      start_date: leave.start_date,
      end_date: leave.end_date,
      days,
      reason: leave.reason || null,
    };
  });

  const leaveDays = leaveItems.reduce((sum, item) => sum + item.days, 0);
  const overtimeSummary = calculateOvertimeHours(overtimeRecords);
  const hourlyRate = getOvertimeHourlyRate(baseSalary);
  const overtimeAmount = calculateOvertimeAmount(overtimeRecords, baseSalary);
  const dailyRate = estimateDailySalary(baseSalary);

  return {
    lateDays,
    leaveDays,
    leaveRecords: leaveItems,
    overtime: {
      totalHours: overtimeSummary.totalHours,
      totalAmount: overtimeAmount,
      hourlyRate,
      otRateMultiplier: 1.5,
      records: overtimeSummary.records,
    },
    reference: {
      dailyRate,
      suggestedLateDeduction: roundMoney(lateDays * dailyRate * 0.25),
      workingDaysPerMonth: 22,
    },
  };
};

export const getPayrollById = async (companyId, id) => {
  const payroll = await findPayrollById(id, companyId);
  if (!payroll) throw new Error("Payroll record not found");
  const periodContext = await buildPayrollPeriodContext(payroll);
  return { result: true, data: { ...serializePayroll(payroll), periodContext } };
};

export const getEmployeePayrolls = async (companyId, employeeId, year) => {
  const payrolls = await findPayrollsByEmployee(employeeId, companyId, year);
  return { result: true, data: payrolls.map(serializePayroll) };
};

export const syncPayrollBaseSalary = async (companyId, id, userId) => {
  const payroll = await findPayrollById(id, companyId);
  if (!payroll) throw new Error("Payroll record not found");
  if (isReadOnlyStatus(payroll.status) || isReadOnlyStatus(payroll.payrollperiod.status)) {
    throw new Error("Approved or paid payroll records are read-only");
  }

  const currentBaseSalary = toNumber(decrypt(payroll.employee.base_salary)) || 600;
  
  if (currentBaseSalary === toNumber(payroll.base_salary)) {
    return { result: true, data: serializePayroll(payroll), message: "Base salary is already in sync" };
  }

  return updatePayroll(companyId, id, {
    base_salary: currentBaseSalary,
    reason: "Synced base salary from employee profile",
  }, userId);
};

export const removePayrollPeriod = async (companyId, periodId) => {
  const period = await findPeriodById(periodId, companyId);
  if (!period) throw new Error("Payroll period not found");
  if (isReadOnlyStatus(period.status)) {
    throw new Error("Cannot delete an approved or paid payroll period");
  }

  await deletePayrollPeriod(periodId, companyId);
  return { result: true, message: "Payroll period deleted successfully" };
};

export const syncPayrollPeriodBaseSalaries = async (companyId, periodId, userId) => {
  const period = await findPeriodById(periodId, companyId);
  if (!period) throw new Error("Payroll period not found");
  if (isReadOnlyStatus(period.status)) {
    throw new Error("Approved or paid payroll periods are read-only");
  }

  if (!period.payroll?.length) {
    return { result: true, message: "No payroll records to sync" };
  }

  let syncCount = 0;
  for (const payroll of period.payroll) {
    const currentBaseSalary = toNumber(decrypt(payroll.employee.base_salary)) || 600;
    if (currentBaseSalary !== toNumber(payroll.base_salary)) {
      await updatePayroll(companyId, payroll.id, {
        base_salary: currentBaseSalary,
        reason: "Bulk synced base salary from employee profile",
      }, userId);
      syncCount++;
    }
  }

  return { 
    result: true, 
    message: `Synced base salaries for ${syncCount} employees`,
    data: { synced_count: syncCount }
  };
};

export const updatePayroll = async (companyId, id, payload, userId) => {
  const payroll = await findPayrollById(id, companyId);
  if (!payroll) throw new Error("Payroll record not found");
  if (isReadOnlyStatus(payroll.status) || isReadOnlyStatus(payroll.payrollperiod.status)) {
    throw new Error("Approved or paid payroll records are read-only");
  }

  const components = {
    base_salary: payload.base_salary !== undefined ? toNumber(payload.base_salary) : toNumber(payroll.base_salary),
    allowance: payload.allowance !== undefined ? toNumber(payload.allowance) : toNumber(payroll.allowance),
    overtime: payload.overtime !== undefined ? toNumber(payload.overtime) : toNumber(payroll.overtime),
    bonus: payload.bonus !== undefined ? toNumber(payload.bonus) : toNumber(payroll.bonus),
    deduction: payload.deduction !== undefined ? toNumber(payload.deduction) : toNumber(payroll.deduction),
  };

  const { gross_salary, tax, net_salary } = computePayrollAmounts(components);

  const fields = ["base_salary", "allowance", "overtime", "bonus", "deduction"];
  for (const field of fields) {
    if (payload[field] !== undefined && toNumber(payload[field]) !== toNumber(payroll[field])) {
      await createAdjustment({
        payroll_id: id,
        field,
        old_value: toNumber(payroll[field]),
        new_value: toNumber(payload[field]),
        reason: payload.reason || "Manual adjustment",
        adjusted_by: userId,
      });
    }
  }

  const updated = await updatePayrollRecord(id, {
    ...components,
    tax,
    gross_salary,
    net_salary,
    updated_at: new Date(),
  });

  await deletePayrollItems(id);
  await createPayrollItems(
    buildPayrollItems({ ...components, tax, gross_salary }).map((item) => ({
      ...item,
      payroll_id: id,
    })),
  );

  const refreshed = await findPayrollById(id, companyId);
  const periodContext = await buildPayrollPeriodContext(refreshed);
  return {
    result: true,
    data: { ...serializePayroll(refreshed), periodContext },
    message: "Payroll updated",
  };
};

export const getMobileOverview = async (companyId, employeeId) => {
  if (!employeeId) throw new Error("Employee profile required");

  const payrolls = await findPayrollsByEmployee(employeeId, companyId);
  const latest = payrolls[0];
  const nextPeriod = await getNextPayrollPeriod(companyId);

  const last6 = payrolls.slice(0, 6).reverse();
  const chart = last6.map((p) => ({
    month: formatShortMonth(p.payrollperiod.start_date),
    value: toNumber(p.net_salary),
  }));

  let trendPercent = 0;
  if (payrolls.length >= 2) {
    const current = toNumber(payrolls[0].net_salary);
    const previous = toNumber(payrolls[1].net_salary);
    if (previous > 0) trendPercent = Math.round(((current - previous) / previous) * 100);
  }

  const allowanceItems = latest?.payrollitem?.filter((i) => i.type === "allowance") || [];
  const deductionItems = latest?.payrollitem?.filter((i) => ["deduction", "tax"].includes(i.type)) || [];

  return {
    result: true,
    data: {
      currentMonth: latest ? formatMonthYear(latest.payrollperiod.start_date) : null,
      netSalary: latest ? toNumber(latest.net_salary) : 0,
      trendPercent,
      nextPayrollDays: nextPeriod ? daysUntilDate(nextPeriod.pay_date) : 0,
      salaryChart: chart,
      breakdown: latest
        ? {
            basicSalary: toNumber(latest.base_salary),
            allowances: {
              total: toNumber(latest.allowance),
              items: allowanceItems.map((i) => ({ label: i.label, amount: toNumber(i.amount) })),
            },
            grossSalary: toNumber(latest.gross_salary),
            deductions: {
              total: toNumber(latest.deduction) + toNumber(latest.tax),
              items: deductionItems.map((i) => ({ label: i.label, amount: toNumber(i.amount) })),
            },
            takeHomePay: toNumber(latest.net_salary),
          }
        : null,
    },
  };
};

export const getMobileHistory = async (companyId, employeeId, year) => {
  if (!employeeId) throw new Error("Employee profile required");

  const payrolls = await findPayrollsByEmployee(employeeId, companyId, year);

  const history = payrolls.map((p) => ({
    id: p.id,
    month: formatMonthYear(p.payrollperiod.start_date).split(" ")[0],
    year: new Date(p.payrollperiod.start_date).getFullYear(),
    status: p.status,
    employee: {
      full_name: `${p.employee.first_name} ${p.employee.last_name}`,
      avatar: p.employee.profile_path,
    },
    baseSalary: toNumber(p.base_salary),
    allowance: toNumber(p.allowance),
    deduction: toNumber(p.deduction),
    thirteenthSalary: 0,
    tax: toNumber(p.tax),
    overtime: toNumber(p.overtime),
    total: toNumber(p.net_salary),
    payslipUrl: p.payslip_path ? `/uploads/payslips/${path.basename(p.payslip_path)}` : null,
  }));

  const allPayrolls = await prisma.payroll.findMany({
    where: { employee_id: employeeId, company_id: companyId },
    select: { payrollperiod: { select: { start_date: true } } },
  });

  const years = [...new Set(allPayrolls.map((p) => new Date(p.payrollperiod.start_date).getFullYear()))];
  if (year && !years.includes(year)) years.push(year);
  years.sort((a, b) => b - a);

  return { result: true, data: { history, availableYears: years.length ? years : [new Date().getFullYear()] } };
};

export const getPayslipDownload = async (companyId, payrollId) => {
  const payroll = await findPayrollById(payrollId, companyId);
  if (!payroll) throw new Error("Payroll record not found");

  // Temporarily force regenerate to test the new template UI
  // if (!payroll.payslip_path || !fs.existsSync(payroll.payslip_path)) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const payslipPath = await generatePayslipPdf(payroll, company);
    await updatePayrollRecord(payrollId, { payslip_path: payslipPath });
    payroll.payslip_path = payslipPath;
  // }

  return {
    result: true,
    data: {
      filePath: payroll.payslip_path,
      downloadUrl: `/uploads/payslips/${path.basename(payroll.payslip_path)}`,
      fileName: path.basename(payroll.payslip_path),
    },
  };
};

export const getPayrollPeriodDetail = async (companyId, periodId) => {
  const period = await findPeriodById(periodId, companyId);
  if (!period) throw new Error("Payroll period not found");
  return { result: true, data: serializePeriod(period) };
};
