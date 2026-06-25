import { api } from "@/lib/api";

export interface PayrollPeriod {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  pay_date: string;
  status: "draft" | "generated" | "approved" | "paid";
  _count?: { payroll: number };
}

export interface PayrollPeriodContext {
  lateDays: number;
  leaveDays: number;
  leaveRecords: {
    id: number;
    leave_type: string;
    leave_code?: string | null;
    start_date: string;
    end_date: string;
    days: number;
    reason?: string | null;
  }[];
  overtime: {
    totalHours: number;
    totalAmount: number;
    hourlyRate: number;
    otRateMultiplier: number;
    records: {
      id: number;
      start_date: string;
      end_date: string;
      hours: number;
      reason?: string | null;
    }[];
  };
  reference: {
    dailyRate: number;
    suggestedLateDeduction: number;
    workingDaysPerMonth: number;
  };
}

export interface PayrollRecord {
  id: number;
  employee_id: number;
  payroll_period_id: number;
  base_salary: number;
  allowance: number;
  overtime: number;
  bonus: number;
  deduction: number;
  tax: number;
  gross_salary: number;
  net_salary: number;
  status: "draft" | "generated" | "approved" | "paid";
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
    profile_path?: string;
    positions?: { name: string };
    department_employee_department_idTodepartment?: { name: string };
  };
  payrollperiod?: PayrollPeriod;
  payrollitem?: { id: number; type: string; label: string; amount: number }[];
  payrolladjustment?: {
    id: number;
    field: string;
    old_value: number;
    new_value: number;
    reason?: string;
    created_at: string;
  }[];
  periodContext?: PayrollPeriodContext | null;
}

export interface PayrollDashboard {
  currentPeriod: PayrollPeriod | null;
  totalEmployees: number;
  totalGrossSalary: number;
  totalNetSalary: number;
  approvedPayrolls: number;
  paidPayrolls: number;
  daysUntilNextPayroll: number | null;
  nextPayDate: string | null;
  monthlySummary: { month: string; netSalary: number }[];
}

export const getPayrollDashboard = async () => {
  const res = await api.get("/api/payroll/dashboard");
  return res.data;
};

export const getPayrollPeriods = async (params?: { year?: number; status?: string }) => {
  const res = await api.get("/api/payroll-periods", { params });
  return res.data;
};

export const createPayrollPeriod = async (data: {
  name: string;
  start_date: string;
  end_date: string;
  pay_date: string;
}) => {
  const res = await api.post("/api/payroll-periods", data);
  return res.data;
};

export const getPayrollPeriodDetail = async (id: number) => {
  const res = await api.get(`/api/payroll/period/${id}`);
  return res.data;
};

export const deletePayrollPeriod = async (id: number) => {
  const res = await api.delete(`/api/payroll-periods/${id}`);
  return res.data;
};

export const getPayrolls = async (params?: {
  payroll_period_id?: number;
  status?: string;
  search?: string;
}) => {
  const res = await api.get("/api/payroll", { params });
  return res.data;
};

export const getPayrollById = async (id: number) => {
  const res = await api.get(`/api/payroll/${id}`);
  return res.data;
};

export const generatePayroll = async (payroll_period_id: number) => {
  const res = await api.post("/api/payroll/generate", { payroll_period_id });
  return res.data;
};

export const approvePayroll = async (payroll_period_id: number) => {
  const res = await api.post("/api/payroll/approve", { payroll_period_id });
  return res.data;
};

export const markPayrollPaid = async (payroll_period_id: number) => {
  const res = await api.post("/api/payroll/mark-paid", { payroll_period_id });
  return res.data;
};

export const updatePayroll = async (
  id: number,
  data: Partial<{
    base_salary: number;
    allowance: number;
    overtime: number;
    bonus: number;
    deduction: number;
    reason: string;
  }>,
) => {
  const res = await api.put(`/api/payroll/${id}`, data);
  return res.data;
};

export const syncPayrollBaseSalary = async (id: number) => {
  const res = await api.post(`/api/payroll/${id}/sync`);
  return res.data;
};

export const syncPayrollPeriodBaseSalaries = async (periodId: number) => {
  const res = await api.post(`/api/payroll/period/${periodId}/sync`);
  return res.data;
};

export const exportPayrollExcel = async (body: {
  payroll_period_id?: number;
  year?: number;
  report_type: "monthly" | "history" | "summary";
}) => {
  const res = await api.post("/api/payroll/export/excel", body);
  return res.data;
};

export const exportPayrollPdf = async (body: {
  payroll_period_id?: number;
  year?: number;
  report_type: "monthly" | "history" | "summary";
}) => {
  const res = await api.post("/api/payroll/export/pdf", body);
  return res.data;
};

export const getPayslipUrl = (id: number) =>
  `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8080"}/api/payroll/${id}/payslip?download=true`;
