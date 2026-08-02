import { api } from "@/lib/api";

export interface Overtime {
  id: number;
  employee_id: number;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  approved_by: number | null;
  employee_overtime_employee_idToemployee: {
    id: number;
    first_name: string;
    last_name: string;
    department_id?: number | null;
  } | null;
}

export const getAllOvertimes = async (params?: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  employeeId?: string;
  status?: string;
}) => {
  const q = new URLSearchParams();
  if (params) {
    if (params.page !== undefined) q.append("page", String(params.page));
    if (params.limit !== undefined) q.append("limit", String(params.limit));
    if (params.startDate) q.append("startDate", params.startDate);
    if (params.endDate) q.append("endDate", params.endDate);
    if (params.departmentId) q.append("departmentId", params.departmentId);
    if (params.employeeId) q.append("employeeId", params.employeeId);
    if (params.status) q.append("status", params.status);
  }
  const queryStr = q.toString() ? `?${q.toString()}` : "";
  const res = await api.get(`/api/overtime/all${queryStr}`);
  return res.data;
};

export const approveOvertime = async (id: number) => {
  const res = await api.put(`/api/overtime/approve/${id}`);
  return res.data;
};

export const rejectOvertime = async (id: number) => {
  const res = await api.put(`/api/overtime/reject/${id}`);
  return res.data;
};
