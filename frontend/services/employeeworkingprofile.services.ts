import { api } from "@/lib/api";
import type { DayOfWeek } from "./dayofweek.services";

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number1?: string;
  profile_path?: string;
}

export interface EmployeeWorkingProfile {
  id: number;
  employee_id: number;
  day_of_week_id: number;
  allow_online_bypass_location?: boolean;
  employee?: Employee;
  dayofweek?: DayOfWeek;
  created_at?: string;
  updated_at?: string;
}

export const getAllEmployeeWorkingProfiles = async (page = 1, limit = 100) => {
  const res = await api.get(`/api/employeeworkingprofile/get-employeeworkingprofiles?page=${page}&limit=${limit}`);
  return res.data;
};

export const getEmployeeWorkingProfileByEmployeeId = async (employeeId: string) => {
  const res = await api.get(`/api/employeeworkingprofile/get-employeeworkingprofile/${employeeId}`);
  return res.data;
};

export const createEmployeeWorkingProfile = async (data: Omit<EmployeeWorkingProfile, 'id' | 'created_at' | 'updated_at' | 'employee' | 'dayofweek'>) => {
  const res = await api.post("/api/employeeworkingprofile/create-employeeworkingprofile", data);
  return res.data;
};

export const deleteEmployeeWorkingProfile = async (id: string) => {
  const res = await api.delete(`/api/employeeworkingprofile/delete-employeeworkingprofile/${id}`);
  return res.data;
};
