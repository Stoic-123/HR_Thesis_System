import { api } from "@/lib/api";

export interface TimeModeColumn {
  id: number;
  name: string;
  remark?: string;
}

export interface AttendanceRow {
  employee_id: number;
  employee: string;
  date: string;
  checkIn: string;
  checkOut: string;
  scans?: Record<number, {
    time: string;
    is_late: boolean;
    is_early: boolean;
    status: string;
  }>;
  status: "present" | "late" | "early";
}

export interface AttendanceSummary {
  totalCheckIns: number;
  onTimeRate: number;
  lateCount: number;
}

export interface AttendanceReport {
  date: string;
  timeModes?: TimeModeColumn[];
  summary: AttendanceSummary;
  rows: AttendanceRow[];
}

export const getAttendanceReport = async (date?: string) => {
  const params = date ? `?date=${date}` : "";
  const res = await api.get(`/api/attendance/report${params}`);
  return res.data as { result: boolean; data: AttendanceReport };
};
