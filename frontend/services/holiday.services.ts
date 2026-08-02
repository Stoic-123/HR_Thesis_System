import { api } from "@/lib/api";

export interface Holiday {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  company_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface HolidayResponse {
  result: boolean;
  data: Holiday[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const getHolidays = async (year: number, page = 1, limit = 100) => {
  const res = await api.get(`/api/holiday/get-holiday/${year}`, {
    params: { page, limit },
  });
  return res.data as HolidayResponse;
};

export const createHoliday = async (data: {
  name: string;
  start_date: string;
  end_date: string;
}) => {
  const res = await api.post("/api/holiday/create-holiday", data);
  return res.data as { result: boolean; message: string };
};

export const updateHoliday = async (
  id: number,
  data: { name: string; start_date: string; end_date: string }
) => {
  const res = await api.put(`/api/holiday/update-holiday/${id}`, data);
  return res.data as { result: boolean; message: string };
};

export const deleteHoliday = async (id: number) => {
  const res = await api.delete(`/api/holiday/delete-holiday/${id}`);
  return res.data as { result: boolean; message: string };
};
