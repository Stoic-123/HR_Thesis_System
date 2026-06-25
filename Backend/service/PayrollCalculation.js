/**
 * Payroll calculation utilities.
 * Gross = Base + Allowances + Overtime + Bonus
 * Net = Gross - Deductions - Tax
 */

export const toNumber = (value) => {
  if (value === null || value === undefined) return 0;
  return Number(value);
};

export const roundMoney = (value) => Math.round(toNumber(value) * 100) / 100;

export const calculateGross = ({ base_salary, allowance, overtime, bonus }) =>
  roundMoney(
    toNumber(base_salary) +
      toNumber(allowance) +
      toNumber(overtime) +
      toNumber(bonus),
  );

export const calculateNet = (components) => {
  const gross = calculateGross(components);
  const net = roundMoney(gross - toNumber(components.deduction) - toNumber(components.tax));
  return { gross_salary: gross, net_salary: net };
};

export const calculateOvertimeHours = (overtimeRecords) => {
  if (!overtimeRecords?.length) return { totalHours: 0, records: [] };

  let totalHours = 0;
  const records = overtimeRecords.map((record) => {
    const start = new Date(record.start_date);
    const end = new Date(record.end_date);
    const hours = Math.max(0, (end - start) / (1000 * 60 * 60));
    totalHours += hours;
    return {
      id: record.id,
      start_date: record.start_date,
      end_date: record.end_date,
      hours: roundMoney(hours),
      reason: record.reason || null,
    };
  });

  return { totalHours: roundMoney(totalHours), records };
};

export const getOvertimeHourlyRate = (baseSalary) => roundMoney(toNumber(baseSalary) / 160);

export const calculateOvertimeAmount = (overtimeRecords, baseSalary) => {
  const { totalHours } = calculateOvertimeHours(overtimeRecords);
  if (!totalHours) return 0;
  return roundMoney(totalHours * getOvertimeHourlyRate(baseSalary) * 1.5);
};

export const countLeaveDaysInPeriod = (leaveStart, leaveEnd, periodStart, periodEnd) => {
  const start = new Date(Math.max(new Date(leaveStart).getTime(), new Date(periodStart).getTime()));
  const end = new Date(Math.min(new Date(leaveEnd).getTime(), new Date(periodEnd).getTime()));
  if (start > end) return 0;
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

export const estimateDailySalary = (baseSalary, workingDays = 22) =>
  workingDays > 0 ? roundMoney(toNumber(baseSalary) / workingDays) : 0;

/** KHR per 1 USD — used to map Cambodia statutory brackets to USD payroll amounts */
export const KHR_PER_USD = 4100;

/**
 * Cambodia resident salary tax brackets (source amounts in KHR).
 * Payroll is stored in USD; tax is computed in KHR then converted back to USD.
 */
export const SALARY_TAX_BRACKETS_KHR = [
  { upTo: 1_500_000, rate: 0 },
  { upTo: 2_000_000, rate: 0.05 },
  { upTo: 8_500_000, rate: 0.1 },
  { upTo: 12_500_000, rate: 0.15 },
  { upTo: Infinity, rate: 0.2 },
];

/** USD equivalent upper bounds (for display / reference) */
export const SALARY_TAX_BRACKETS_USD = SALARY_TAX_BRACKETS_KHR.map((b) => ({
  upTo: b.upTo === Infinity ? Infinity : roundMoney(b.upTo / KHR_PER_USD),
  rate: b.rate,
}));

export const calculateSalaryTaxKHR = (grossSalaryKHR) => {
  const salary = Math.max(0, toNumber(grossSalaryKHR));
  let tax = 0;
  let previousLimit = 0;

  for (const bracket of SALARY_TAX_BRACKETS_KHR) {
    if (salary <= previousLimit) break;

    const upper = bracket.upTo === Infinity ? salary : Math.min(salary, bracket.upTo);
    const taxableInBracket = upper - previousLimit;

    if (taxableInBracket > 0) {
      tax += taxableInBracket * bracket.rate;
    }

    previousLimit = bracket.upTo === Infinity ? salary : bracket.upTo;
    if (salary <= bracket.upTo) break;
  }

  return Math.round(tax);
};

/** Auto-calculate resident salary tax from gross USD using Cambodia progressive rates */
export const calculateSalaryTax = (grossSalaryUSD) => {
  const grossKHR = toNumber(grossSalaryUSD) * KHR_PER_USD;
  const taxKHR = calculateSalaryTaxKHR(grossKHR);
  return roundMoney(taxKHR / KHR_PER_USD);
};

/** @deprecated Use calculateSalaryTax */
export const calculateDefaultTax = (grossSalary) => calculateSalaryTax(grossSalary);

export const computePayrollAmounts = (components) => {
  const gross_salary = calculateGross(components);
  const tax = calculateSalaryTax(gross_salary);
  const net_salary = roundMoney(
    gross_salary - toNumber(components.deduction) - tax,
  );
  return { gross_salary, tax, net_salary };
};

export const buildPayrollItems = (components) => {
  const items = [];
  const push = (type, label, amount) => {
    if (toNumber(amount) !== 0) items.push({ type, label, amount: roundMoney(amount) });
  };

  push("base_salary", "Base Salary", components.base_salary);
  push("allowance", "Allowance", components.allowance);
  push("overtime", "Overtime", components.overtime);
  push("bonus", "Bonus", components.bonus);
  push("deduction", "Deduction", components.deduction);
  push("tax", "Salary Tax", components.tax);

  return items;
};

export const daysUntilDate = (targetDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 0);
};

export const formatMonthYear = (date) => {
  const d = new Date(date);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
};

export const formatShortMonth = (date) => {
  const d = new Date(date);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[d.getMonth()];
};

export const isReadOnlyStatus = (status) => status === "approved" || status === "paid";
