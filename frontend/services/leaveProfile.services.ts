import { api } from "@/lib/api";

export interface LeaveProfile {
  id: number;
  employee_id: number;
  leave_type_id: number;
  assignment?: number;
  used?: number;
  balance: number;
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  leavetype?: {
    id: number;
    name: string;
    code: string;
  };
}

export const getLeaveProfiles = async () => {
  const res = await api.get("/api/leaveprofile/all");
  return res.data;
};

export const getEmployeeLeaveProfiles = async (employeeId: number) => {
  const res = await api.get(`/api/leaveprofile/employee/${employeeId}`);
  return res.data;
};

export const createLeaveProfile = async (data: {
  employee_id: number;
  leave_type_id: number;
  assignment: number;
  balance?: number;
}) => {
  const res = await api.post("/api/leaveprofile/create", data);
  return res.data;
};

export const updateLeaveProfile = async (
  id: number,
  data: { assignment: number; balance?: number }
) => {
  const res = await api.put(`/api/leaveprofile/update/${id}`, data);
  return res.data;
};

export const deleteLeaveProfile = async (id: number) => {
  const res = await api.delete(`/api/leaveprofile/delete/${id}`);
  return res.data;
};

export const syncLeaveProfiles = async (employeeId: number) => {
  const res = await api.post("/api/leaveprofile/sync", { employee_id: employeeId });
  return res.data;
};
