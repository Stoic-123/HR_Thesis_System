/**
 * @typedef {Object} PayrollPeriodDTO
 * @property {number} id
 * @property {string} name
 * @property {string} start_date
 * @property {string} end_date
 * @property {string} pay_date
 * @property {'draft'|'generated'|'approved'|'paid'} status
 */

/**
 * @typedef {Object} PayrollDTO
 * @property {number} id
 * @property {number} employee_id
 * @property {number} payroll_period_id
 * @property {number} base_salary
 * @property {number} allowance
 * @property {number} overtime
 * @property {number} bonus
 * @property {number} deduction
 * @property {number} tax
 * @property {number} gross_salary
 * @property {number} net_salary
 * @property {'draft'|'generated'|'approved'|'paid'} status
 */

/**
 * @typedef {Object} MobileOverviewDTO
 * @property {string|null} currentMonth
 * @property {number} netSalary
 * @property {number} trendPercent
 * @property {number} nextPayrollDays
 * @property {{month:string,value:number}[]} salaryChart
 * @property {Object|null} breakdown
 */

/**
 * @typedef {Object} MobileHistoryItemDTO
 * @property {number} id
 * @property {string} month
 * @property {number} year
 * @property {string} status
 * @property {number} baseSalary
 * @property {number} allowance
 * @property {number} deduction
 * @property {number} tax
 * @property {number} overtime
 * @property {number} total
 * @property {string|null} payslipUrl
 */

export {};
