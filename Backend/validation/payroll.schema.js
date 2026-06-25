import { z } from "zod";

const decimalField = z
  .union([z.string(), z.number()])
  .optional()
  .transform((val) => (val === undefined || val === "" ? undefined : Number(val)));

export const createPayrollPeriodSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    pay_date: z.string().min(1, "Pay date is required"),
  }),
});

export const generatePayrollSchema = z.object({
  body: z.object({
    payroll_period_id: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  }),
});

export const approvePayrollSchema = z.object({
  body: z.object({
    payroll_period_id: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  }),
});

export const markPaidPayrollSchema = z.object({
  body: z.object({
    payroll_period_id: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  }),
});

export const updatePayrollSchema = z.object({
  params: z.object({
    id: z.string().transform((v) => Number(v)),
  }),
  body: z.object({
    base_salary: decimalField,
    allowance: decimalField,
    overtime: decimalField,
    bonus: decimalField,
    deduction: decimalField,
    reason: z.string().optional(),
  }),
});

export const exportPayrollSchema = z.object({
  body: z.object({
    payroll_period_id: z.union([z.string(), z.number()]).optional().transform((v) => (v ? Number(v) : undefined)),
    year: z.union([z.string(), z.number()]).optional().transform((v) => (v ? Number(v) : undefined)),
    report_type: z.enum(["monthly", "history", "summary"]).default("summary"),
  }),
});
