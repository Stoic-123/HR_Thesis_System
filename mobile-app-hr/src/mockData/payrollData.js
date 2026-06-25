import { mockEmployee } from './hrData';

export const payrollOverview = {
  currentMonth: 'October 2025',
  netSalary: 680,
  trendPercent: 10,
  nextPayrollDays: 6,
  salaryChart: [
    { month: 'Jul', value: 340 },
    { month: 'Aug', value: 450 },
    { month: 'Sep', value: 560 },
    { month: 'Oct', value: 680 },
  ],
  breakdown: {
    basicSalary: 667,
    allowances: {
      total: 63,
      items: [
        { label: 'Transport', amount: 30 },
        { label: 'Meal', amount: 20 },
        { label: 'Phone', amount: 13 },
      ],
    },
    grossSalary: 730,
    deductions: {
      total: 50,
      items: [
        { label: 'Social Security', amount: 30 },
        { label: 'Health Insurance', amount: 20 },
      ],
    },
    takeHomePay: 680,
  },
};

export const payrollHistory = [
  {
    id: 1,
    month: 'October',
    year: 2025,
    status: 'paid',
    employee: mockEmployee,
    baseSalary: 600,
    allowance: 20,
    deduction: 0,
    thirteenthSalary: 0,
    tax: 15,
    overtime: 0,
    total: 605,
  },
  {
    id: 2,
    month: 'September',
    year: 2025,
    status: 'paid',
    employee: mockEmployee,
    baseSalary: 600,
    allowance: 20,
    deduction: 0,
    thirteenthSalary: 0,
    tax: 15,
    overtime: 0,
    total: 605,
  },
  {
    id: 3,
    month: 'August',
    year: 2025,
    status: 'paid',
    employee: mockEmployee,
    baseSalary: 600,
    allowance: 20,
    deduction: 0,
    thirteenthSalary: 0,
    tax: 15,
    overtime: 0,
    total: 605,
  },
];

export const availableYears = [2023, 2024, 2025];
