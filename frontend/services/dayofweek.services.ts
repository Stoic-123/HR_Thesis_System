import { api } from "@/lib/api";
import type { TimeSheet } from "./timesheet.services";

export interface DayOfWeek {
  id: number;
  company_id: number;
  name: string;
  code: string;
  is_default?: boolean;
  monday_id?: number;
  tuesday_id?: number;
  wednesday_id?: number;
  thursday_id?: number;
  friday_id?: number;
  saturday_id?: number;
  sunday_id?: number;
  monday?: TimeSheet;
  tuesday?: TimeSheet;
  wednesday?: TimeSheet;
  thursday?: TimeSheet;
  friday?: TimeSheet;
  saturday?: TimeSheet;
  sunday?: TimeSheet;
  created_at?: string;
  updated_at?: string;
}

export const getAllDayOfWeeks = async (page = 1, limit = 100) => {
  const res = await api.get(`/api/dayofweek/get-dayofweeks?page=${page}&limit=${limit}`);
  return res.data;
};

export const getDayOfWeekById = async (id: string) => {
  const res = await api.get(`/api/dayofweek/get-dayofweek/${id}`);
  return res.data;
};

export const createDayOfWeek = async (data: Omit<DayOfWeek, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'>) => {
  const res = await api.post("/api/dayofweek/create-dayofweek", data);
  return res.data;
};

export const updateDayOfWeek = async (id: string, data: Partial<Omit<DayOfWeek, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'>>) => {
  const res = await api.put(`/api/dayofweek/update-dayofweek/${id}`, data);
  return res.data;
};

export const deleteDayOfWeek = async (id: string) => {
  const res = await api.delete(`/api/dayofweek/delete-dayofweek/${id}`);
  return res.data;
};
