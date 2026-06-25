/** Mirrors Backend/service/PayrollCalculation.js — Cambodia resident salary tax in USD */

export const KHR_PER_USD = 4100;

const SALARY_TAX_BRACKETS_KHR = [
  { upTo: 1_500_000, rate: 0 },
  { upTo: 2_000_000, rate: 0.05 },
  { upTo: 8_500_000, rate: 0.1 },
  { upTo: 12_500_000, rate: 0.15 },
  { upTo: Infinity, rate: 0.2 },
];

export const SALARY_TAX_BRACKETS_USD = SALARY_TAX_BRACKETS_KHR.map((b) => ({
  upTo: b.upTo === Infinity ? Infinity : Math.round((b.upTo / KHR_PER_USD) * 100) / 100,
  rate: b.rate,
  rateLabel: `${b.rate * 100}%`,
}));

const calculateSalaryTaxKHR = (grossSalaryKHR: number) => {
  const salary = Math.max(0, grossSalaryKHR);
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

export const calculateSalaryTax = (grossSalaryUSD: number) => {
  const grossKHR = grossSalaryUSD * KHR_PER_USD;
  const taxKHR = calculateSalaryTaxKHR(grossKHR);
  return Math.round((taxKHR / KHR_PER_USD) * 100) / 100;
};

export const computePayrollPreview = (components: {
  base_salary: number;
  allowance: number;
  overtime: number;
  bonus: number;
  deduction: number;
}) => {
  const gross =
    components.base_salary +
    components.allowance +
    components.overtime +
    components.bonus;
  const tax = calculateSalaryTax(gross);
  const net = Math.round((gross - components.deduction - tax) * 100) / 100;
  return { gross, tax, net };
};
