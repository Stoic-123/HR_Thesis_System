import { api } from "@/lib/api";

export interface LeaveType {
  id: number;
  name: string;
  code: string;
  default_balance?: number;
}

export const getAllLeaveTypes = async (page = 1, limit = 100) => {
  const res = await api.get(`/api/leavetype/get-leavetype?page=${page}&limit=${limit}`);
  return res.data;
};

export const createLeaveType = async (data: { name: string; code: string; default_balance: number }) => {
  const res = await api.post("/api/leavetype/create-leavetype", data);
  return res.data;
};

export const updateLeaveType = async (id: number, data: { name: string; code: string; default_balance: number }) => {
  const res = await api.put(`/api/leavetype/update-leavetype/${id}`, data);
  return res.data;
};

export const deleteLeaveType = async (id: number) => {
  const res = await api.delete(`/api/leavetype/delete-leavetype/${id}`);
  return res.data;
};
