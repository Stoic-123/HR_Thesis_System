import { api } from "@/lib/api";

export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  profile_path?: string;
  joined_at?: string;
  status?: string;
  role_name?: string;
  base_salary?: number;
}

export const getAllEmployee = async (page = 1, limit = 10, status?: string | null, departmentId?: string | null) => {
  let url = `/api/employee/get-all-employee?page=${page}&limit=${limit}`;
  if (status) url += `&status=${status}`;
  if (departmentId) url += `&department_id=${departmentId}`;
  const res = await api.get(url);
  return res.data;
};

export const getAllEmployees = async (page = 1, limit = 100) => {
  const res = await api.get(`/api/employee/get-all-employee?page=${page}&limit=${limit}`);
  return res.data;
};
export const getEmployee = async (id: string) => {
  const res = await api.get(`/api/employee/get-employee/${id}`);
  return res.data;
};

export const addEmployee = async (formData: FormData) => {
  const res = await api.post("/api/employee/add-employee", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const updateEmployee = async (id: string, formData: FormData) => {
  const res = await api.put(`/api/employee/update-employee/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const uploadDocument = async (id: string, formData: FormData) => {
  const res = await api.post(`/api/employee/upload-document/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const deleteDocument = async (id: string) => {
  const res = await api.delete(`/api/employee/delete-document/${id}`);
  return res.data;
};

export const deleteEmployee = async (id: string) => {
  const res = await api.delete(`/api/employee/delete-employee/${id}`);
  return res.data;
};
