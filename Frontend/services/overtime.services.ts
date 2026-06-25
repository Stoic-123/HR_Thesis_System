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
  } | null;
}

export const getAllOvertimes = async () => {
  const res = await api.get("/api/overtime/all");
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
