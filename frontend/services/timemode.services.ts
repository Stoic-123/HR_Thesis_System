import { api } from "@/lib/api";

export interface TimeModeData {
  id?: number;
  name: string;
  remark?: string | null;
  company_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TimeModeResponse {
  result: boolean;
  message: string;
  data?: TimeModeData[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const getTimeModes = async (page = 1, limit = 100): Promise<TimeModeResponse> => {
  const res = await api.get(`/api/timemode/get-timemode?page=${page}&limit=${limit}`);
  return res.data;
};

export const createTimeMode = async (data: { name: string; remark?: string }): Promise<any> => {
  const res = await api.post("/api/timemode/create-timemode", data);
  return res.data;
};

export const updateTimeMode = async (id: number, data: { name: string; remark?: string }): Promise<any> => {
  const res = await api.put(`/api/timemode/update-timemode/${id}`, data);
  return res.data;
};

export const deleteTimeMode = async (id: number): Promise<any> => {
  const res = await api.delete(`/api/timemode/delete-timemode/${id}`);
  return res.data;
};
