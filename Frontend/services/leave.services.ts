import { api } from "@/lib/api";

export const getAllLeaves = async (params?: { status?: string; department_id?: string; search?: string }) => {
  const res = await api.get("/api/leave/all", { params });
  return res.data;
};

export const approveLeave = async (id: number) => {
  const res = await api.put(`/api/leave/approve/${id}`);
  return res.data;
};

export const rejectLeave = async (id: number) => {
  const res = await api.put(`/api/leave/reject/${id}`);
  return res.data;
};

export const getMyLeaves = async () => {
  const res = await api.get("/api/leave/my-leaves");
  return res.data;
};

export const getLeaveSummary = async () => {
  const res = await api.get("/api/leave/summary");
  return res.data;
};
