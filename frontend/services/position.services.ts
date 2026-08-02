import { api } from "@/lib/api";

export const getPositions = async (page = 1, limit = 10, department_id?: number) => {
  const url = department_id 
    ? `/api/position/get-position?department_id=${department_id}&page=${page}&limit=${limit}`
    : `/api/position/get-position?page=${page}&limit=${limit}`;
  const res = await api.get(url);
  return res.data;
};

export const addPosition = async (data: { name: string; department_id: number }) => {
  const res = await api.post("/api/position/add-position", data);
  return res.data;
};

export const updatePosition = async (id: number, data: { name?: string; department_id?: number }) => {
  const res = await api.put(`/api/position/update-position/${id}`, data);
  return res.data;
};

export const deletePosition = async (id: number) => {
  const res = await api.delete(`/api/position/delete-position/${id}`);
  return res.data;
};
