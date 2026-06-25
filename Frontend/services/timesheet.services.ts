import { api } from "@/lib/api";

export interface TimeSheet {
  id: number;
  company_id: number;
  name: string;
  code: string;
  time_in?: string;
  lunch_out?: string;
  lunch_in?: string;
  time_out?: string;
  require_time_in?: boolean;
  require_lunch_out?: boolean;
  require_lunch_in?: boolean;
  require_time_out?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const getAllTimeSheets = async (page = 1, limit = 100) => {
  const res = await api.get(`/api/timesheet/get-timesheets?page=${page}&limit=${limit}`);
  return res.data;
};

export const getTimeSheetById = async (id: string) => {
  const res = await api.get(`/api/timesheet/get-timesheet/${id}`);
  return res.data;
};

export const createTimeSheet = async (data: Omit<TimeSheet, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
  const res = await api.post("/api/timesheet/create-timesheet", data);
  return res.data;
};

export const updateTimeSheet = async (id: string, data: Partial<Omit<TimeSheet, 'id' | 'company_id' | 'created_at' | 'updated_at'>>) => {
  const res = await api.put(`/api/timesheet/update-timesheet/${id}`, data);
  return res.data;
};

export const deleteTimeSheet = async (id: string) => {
  const res = await api.delete(`/api/timesheet/delete-timesheet/${id}`);
  return res.data;
};
