import { api } from "@/lib/api";

export const getDepartments = async (is_active: number | null = 1, page = 1, limit = 10) => {
  const res = await api.get(`/api/department/get-department/${is_active}?page=${page}&limit=${limit}`);
  return res.data;
};

export const addDepartment = async (data: { name: string; manager_id?: number | null }) => {
  const res = await api.post("/api/department/add-department", data);
  return res.data;
};

export const updateDepartment = async (id: number, data: { name?: string; manager_id?: number | null }) => {
  const res = await api.put(`/api/department/update-department/${id}`, data);
  return res.data;
};

export const deactivateDepartment = async (id: number) => {
  const res = await api.put(`/api/department/deactivate-department/${id}`);
  return res.data;
};

export const activateDepartment = async (id: number) => {
  const res = await api.put(`/api/department/activate-department/${id}`);
  return res.data;
};
