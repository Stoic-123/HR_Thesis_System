import { api } from "@/lib/api";

export interface TimeModeColumn {
  id: number;
  name: string;
  remark?: string;
}

export interface LateEarlyRequest {
  id: number;
  request_type: "LATE" | "EARLY";
  time_field?: string | null;
  scheduled_time?: string | null;
  request_date: string;
  reason?: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  approved_by?: number | null;
  approver?: string | null;
  created_at?: string;
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
    late_minutes?: number;
    early_minutes?: number;
    expected_time?: string;
  }>;
  status: "present" | "late" | "early" | "late_approved" | "early_approved";
  is_excused?: boolean;
  late_requests?: LateEarlyRequest[];
}

export interface AttendanceSummary {
  totalCheckIns: number;
  onTimeRate: number;
  lateCount: number;
  approvedLateCount?: number;
}

export interface AttendanceReport {
  date: string;
  timeModes?: TimeModeColumn[];
  summary: AttendanceSummary;
  rows: AttendanceRow[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const getAttendanceReport = async (
  arg?: string | {
    date?: string;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    employeeId?: string;
    page?: number;
    limit?: number;
  }
) => {
  const q = new URLSearchParams();
  if (typeof arg === "string") {
    q.append("date", arg);
  } else if (arg) {
    if (arg.date) q.append("date", arg.date);
    if (arg.startDate) q.append("startDate", arg.startDate);
    if (arg.endDate) q.append("endDate", arg.endDate);
    if (arg.departmentId) q.append("departmentId", arg.departmentId);
    if (arg.employeeId) q.append("employeeId", arg.employeeId);
    if (arg.page !== undefined) q.append("page", String(arg.page));
    if (arg.limit !== undefined) q.append("limit", String(arg.limit));
  }
  const queryStr = q.toString() ? `?${q.toString()}` : "";
  const res = await api.get(`/api/attendance/report${queryStr}`);
  return res.data as { result: boolean; data: AttendanceReport };
};
