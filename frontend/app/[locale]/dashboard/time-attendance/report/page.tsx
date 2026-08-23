"use client";

import React, { useEffect, useState } from "react";
import {
  CalendarIcon,
  Clock3,
  Fingerprint,
  LogIn,
  LogOut,
  UserCheck,
  Users,
  Printer,
  Eye,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import {
  getAttendanceReport,
  type AttendanceReport,
  type AttendanceRow,
} from "@/services/attendance.services";
import { getDepartments } from "@/services/department.services";
import { getAllEmployees } from "@/services/employee.services";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { useMe } from "@/hooks/useMe";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { exportReportToPDF } from "@/lib/pdf-export";
import { type DateRange } from "react-day-picker";

const parseLocalDate = (val: string): Date => {
  if (!val) return new Date();
  const [y, m, d] = val.split("-").map(Number);
  if (y && m && d) return new Date(y, m - 1, d);
  return new Date(val);
};


/* ────────────────────────── helpers ──────────────────────────── */

const formatLateMinutes = (mins: number) => {
  const hrs = Math.floor(mins / 60);
  const m = mins % 60;
  return `+${String(hrs).padStart(2, "0")}:${String(m).padStart(2, "0")}min`;
};

const formatKhmerDate = (isoDate: string): string => {
  if (isoDate.includes(" to ")) {
    const [start, end] = isoDate.split(" to ");
    return `${formatKhmerDate(start)} - ${formatKhmerDate(end)}`;
  }
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("km-KH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatReportDate = (isoDate: string, locale: string): string => {
  if (isoDate.includes(" to ")) {
    const [start, end] = isoDate.split(" to ");
    return `${formatReportDate(start, locale)} - ${formatReportDate(end, locale)}`;
  }
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(locale === "km" ? "km-KH" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

/* ────────────────────────── component ─────────────────────────── */

const TimeAttendanceReportPage = () => {
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: number; first_name: string; last_name: string }[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>("all");
  const [selectedEmpId, setSelectedEmpId] = useState<string>("all");
  
  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  // Selected row for Late/Early details modal
  const [selectedRowForDetails, setSelectedRowForDetails] = useState<AttendanceRow | null>(null);

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range) {
      if (range.from) {
        setStartDate(range.from);
      }
      if (range.to) {
        setEndDate(range.to);
      } else if (range.from) {
        setEndDate(range.from);
      }
    }
  };

  const t = useTranslations("timeAttendanceReport");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { data: user } = useMe();

  const roleName = (user as any)?.data?.employee?.role?.name?.toLowerCase() || (user as any)?.employee?.role?.name?.toLowerCase() || "";
  const isHrOrAdmin = roleName.includes("admin") || roleName.includes("superadmin") || roleName.includes("hr") || roleName.includes("general manager") || roleName.includes("director");
  const userDeptId = (user as any)?.data?.employee?.department_id || (user as any)?.data?.employee?.department_employee_department_idTodepartment?.id || (user as any)?.employee?.department_id || (user as any)?.employee?.department_employee_department_idTodepartment?.id;

  useEffect(() => {
    if (!isHrOrAdmin && userDeptId) {
      setSelectedDeptId(String(userDeptId));
    }
  }, [isHrOrAdmin, userDeptId]);

  const visibleDepartments = isHrOrAdmin
    ? departments
    : departments.filter((d) => d.id === Number(userDeptId));

  const visibleEmployees = isHrOrAdmin
    ? (selectedDeptId === "all" ? employees : employees.filter((e: any) => e.department_id === Number(selectedDeptId)))
    : employees.filter((e: any) => e.department_id === Number(userDeptId));

  const fetchReport = async () => {
    setLoading(true);
    try {
      const effectiveDeptId = !isHrOrAdmin && userDeptId ? String(userDeptId) : selectedDeptId;
      const res = await getAttendanceReport({
        startDate: toISODate(startDate),
        endDate: toISODate(endDate),
        departmentId: effectiveDeptId,
        employeeId: selectedEmpId,
        page,
        limit,
      });
      if (res.result) {
        setReport(res.data);
      } else {
        setReport(null);
      }
    } catch (err) {
      console.error("Failed to fetch attendance report:", err);
      toast.error(t("loadFailed") || "Failed to load report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const deptsRes = await getDepartments(1, 1, 100);
        if (deptsRes?.result) {
          setDepartments(deptsRes.data);
        }
        const empsRes = await getAllEmployees(1, 1000);
        if (empsRes?.result) {
          setEmployees(empsRes.data);
        }
      } catch (err) {
        console.error("Failed to load filter data:", err);
      }
    };
    loadFilters();
  }, []);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, selectedDeptId, selectedEmpId]);

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, selectedDeptId, selectedEmpId, page, limit, isHrOrAdmin, userDeptId]);

  const handleExportPDF = () => {
    if (!report) return;

    const formattedDate = startDate.toDateString() === endDate.toDateString()
      ? startDate.toLocaleDateString("km-KH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : `${formatKhmerDate(toISODate(startDate))} - ${formatKhmerDate(toISODate(endDate))}`;

    const deptLabel = selectedDeptId === "all"
      ? "គ្រប់ផ្នែក / All Departments"
      : departments.find(d => String(d.id) === selectedDeptId)?.name || "នាយកដ្ឋាន / Department";

    const userFullName = user?.employee ? `${user.employee.first_name} ${user.employee.last_name}` : "";

    const apiBaseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const companyLogo = user?.employee?.company?.logo_path
      ? (user.employee.company.logo_path.startsWith("http")
          ? user.employee.company.logo_path
          : `${apiBaseURL}${user.employee.company.logo_path}`)
      : "";

    exportReportToPDF({
      titleKh: "របាយការណ៍វត្តមានការងារ",
      titleEn: "Time Attendance Report",
      companyName: user?.employee?.company?.name || "ក្រុមហ៊ុន សារណៈ",
      companyLogo,
      orientation: "landscape",
      metadata: [
        { labelKh: "កាលបរិច្ឆេទ", labelEn: "Date", value: formattedDate },
        { labelKh: "ផ្នែក/នាយកដ្ឋាន", labelEn: "Department", value: deptLabel },
        { labelKh: "រៀបចំដោយ", labelEn: "Prepared By", value: userFullName || "រដ្ឋបាល / Admin" }
      ],
      tableHeaders: [
        { kh: "ឈ្មោះបុគ្គលិក", en: "Employee Name" },
        { kh: "កាលបរិច្ឆេទ", en: "Date", align: "center" },
        ...(timeModes.length > 0
          ? timeModes.map(tm => {
              const key = tm.name.toLowerCase().replace(/_/g, "").replace(/\s/g, "");
              let kh = tm.name;
              let en = tm.name.replace(/([A-Z])/g, ' $1').trim();
              if (key.includes("in") && !key.includes("lunch")) {
                kh = "ម៉ោងចូល";
                en = "Time In";
              } else if (key.includes("out") && !key.includes("lunch")) {
                kh = "ម៉ោងចេញ";
                en = "Time Out";
              } else if (key.includes("lunchout")) {
                kh = "សម្រាកអាហារថ្ងៃត្រង់";
                en = "Lunch Out";
              } else if (key.includes("lunchin")) {
                kh = "ចូលធ្វើការវិញ";
                en = "Lunch In";
              }
              return { kh, en, align: "center" as const };
            })
          : [
              { kh: "ម៉ោងចូល", en: "Check In", align: "center" as const },
              { kh: "ម៉ោងចេញ", en: "Check Out", align: "center" as const }
            ]
        ),
        { kh: "ស្ថានភាព", en: "Status", align: "center" }
      ],
      tableRows: rows.map(row => {
        const isTodayOrFuture = row.date >= toISODate(new Date());
        const scansCells = timeModes.length > 0
          ? timeModes.map(tm => {
              const scan = row.scans?.[tm.id];
              let scanText = isTodayOrFuture ? "—" : "Missed";
              let colorClass = isTodayOrFuture ? "text-muted" : "text-rose";
              if (scan) {
                if (scan.late_minutes && scan.late_minutes > 0) {
                  scanText = `${scan.time} <span style="font-size: 7.5pt; font-weight: normal; color: #ef4444;">(${formatLateMinutes(scan.late_minutes)})</span>`;
                  colorClass = "text-rose";
                } else if (scan.early_minutes && scan.early_minutes > 0) {
                  scanText = `${scan.time} <span style="font-size: 7.5pt; font-weight: normal; color: #ef4444;">(-${formatLateMinutes(scan.early_minutes)})</span>`;
                  colorClass = "text-rose";
                } else {
                  scanText = scan.time;
                  if (scan.is_late) colorClass = "text-amber";
                  else if (scan.is_early) colorClass = "text-rose";
                  else colorClass = "text-emerald";
                }
              }
              return {
                text: `<span class="${colorClass} font-mono">${scanText}</span>`,
                align: "center" as const
              };
            })
          : [
              {
                text: (row.checkIn && row.checkIn !== "--:--" && row.checkIn !== "Missed")
                  ? `<span class="text-emerald font-mono">${row.checkIn}</span>`
                  : `<span class="${isTodayOrFuture ? 'text-muted' : 'text-rose'} font-mono">${isTodayOrFuture ? '—' : 'Missed'}</span>`,
                align: "center" as const
              },
              {
                text: (row.checkOut && row.checkOut !== "--:--" && row.checkOut !== "Missed")
                  ? `<span class="text-rose font-mono">${row.checkOut}</span>`
                  : `<span class="${isTodayOrFuture ? 'text-muted' : 'text-rose'} font-mono">${isTodayOrFuture ? '—' : 'Missed'}</span>`,
                align: "center" as const
              }
            ];

        const statusLabel =
          row.status === "present"
            ? "មកទាន់ពេល"
            : row.status === "late_approved"
            ? "យឺត (បានអនុម័ត)"
            : row.status === "early_approved"
            ? "ចេញមុន (បានអនុម័ត)"
            : row.status === "late"
            ? "យឺតយ៉ាវ"
            : "ចេញមុន";

        const statusColor =
          row.status === "present" || row.status === "late_approved" || row.status === "early_approved"
            ? "text-emerald"
            : row.status === "late"
            ? "text-amber"
            : "text-rose";

        return {
          cells: [
            { text: `<strong>${row.employee}</strong>`, align: "left" as const },
            { text: formatKhmerDate(row.date), align: "center" as const },
            ...scansCells,
            { text: `<span class="${statusColor}">${statusLabel}</span>`, align: "center" as const }
          ]
        };
      }),
      preparedBy: userFullName
    });
  };

  const summary = report?.summary;
  const rows = report?.rows ?? [];
  const timeModes = report?.timeModes ?? [];

  const formatTimeModeName = (name: string) => {
    const key = name.toLowerCase().replace(/_/g, "");
    if (key.includes("in") && !key.includes("lunch")) return t("checkInCol");
    if (key.includes("out") && !key.includes("lunch")) return t("checkOutCol");
    if (key.includes("lunchout") || key.includes("breakout")) return t("lunchOutCol");
    if (key.includes("lunchin") || key.includes("breakin")) return t("lunchInCol");
    return name.replace(/([A-Z])/g, ' $1').trim();
  };

  const STATUS_MAP = {
    present: {
      label: t("onTime"),
      dot: "bg-emerald-500",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    late: {
      label: t("late"),
      dot: "bg-amber-500",
      className: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
    },
    late_approved: {
      label: t("lateApproved") || "Late (Approved)",
      dot: "bg-emerald-500",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    early: {
      label: t("early"),
      dot: "bg-rose-500",
      className: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300",
    },
    early_approved: {
      label: t("earlyApproved") || "Early (Approved)",
      dot: "bg-emerald-500",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
  } as const;

  const stats = [
    {
      title: t("todayRecords"),
      value: loading ? "…" : String(summary?.totalCheckIns ?? 0),
      icon: Fingerprint,
      iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
      accent: "from-blue-500/10 to-transparent",
    },
    {
      title: t("onTimeRate"),
      value: loading ? "…" : `${summary?.onTimeRate ?? 0}%`,
      icon: UserCheck,
      iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
      accent: "from-emerald-500/10 to-transparent",
    },
    {
      title: t("lateEmployees"),
      value: loading ? "…" : String(summary?.lateCount ?? 0),
      icon: Clock3,
      iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
      accent: "from-amber-500/10 to-transparent",
    },
    {
      title: locale === "km" ? "អវត្តមាន/ខកខាន" : "Missed Scans",
      value: loading ? "…" : String(rows.reduce((acc, r) => {
        const isTodayOrFuture = r.date >= toISODate(new Date());
        if (isTodayOrFuture) return acc;
        if (!r.scans) return acc;
        if (timeModes.length > 0) {
          return acc + timeModes.filter(tm => !r.scans?.[tm.id] || !r.scans[tm.id].time || r.scans[tm.id].time === "--:--" || r.scans[tm.id].time === "Missed").length;
        }
        let missing = 0;
        if (!r.checkIn || r.checkIn === "--:--" || r.checkIn === "Missed") missing++;
        if (!r.checkOut || r.checkOut === "--:--" || r.checkOut === "Missed") missing++;
        return acc + missing;
      }, 0)),
      icon: Clock3,
      iconBg: "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
      accent: "from-rose-500/10 to-transparent",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("pageTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("pageDescription")}</p>
        </div>
        <Button
          onClick={handleExportPDF}
          size="lg"
          className="rounded-2xl shadow-sm bg-primary hover:bg-primary/90 text-white font-semibold gap-2 self-start sm:self-auto cursor-pointer"
          disabled={!report || rows.length === 0}
        >
          <Printer className="size-4" />
          {t("exportPDF") || "Export PDF"}
        </Button>
      </div>

      {/* Filter Control Bar */}
      <Card className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Date Range Picker (From / To) */}
          <div className="space-y-1.5 lg:col-span-2">
            <Label className="text-xs font-semibold text-muted-foreground">{locale === "km" ? "កាលបរិច្ឆេទ" : "Date Range"}</Label>
            <DateRangePicker
              startDate={toISODate(startDate)}
              endDate={toISODate(endDate)}
              onStartDateChange={(val) => setStartDate(parseLocalDate(val))}
              onEndDateChange={(val) => setEndDate(parseLocalDate(val))}
              fromLabel={locale === "km" ? "ពី" : "From"}
              toLabel={locale === "km" ? "ដល់" : "To"}
            />
          </div>

          {/* Department Select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">{t("department")}</Label>
            <Select 
              value={!isHrOrAdmin && userDeptId ? String(userDeptId) : selectedDeptId} 
              onValueChange={setSelectedDeptId}
              disabled={!isHrOrAdmin}
            >
              <SelectTrigger className="h-10 rounded-xl shadow-xs bg-background border-border/60">
                <SelectValue placeholder={t("department")} />
              </SelectTrigger>
              <SelectContent>
                {isHrOrAdmin && <SelectItem value="all">{t("all")}</SelectItem>}
                {visibleDepartments.map((dept) => (
                  <SelectItem key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Employee Select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">{t("employee")}</Label>
            <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
              <SelectTrigger className="h-10 rounded-xl shadow-xs bg-background border-border/60">
                <SelectValue placeholder={t("employee")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all")}</SelectItem>
                {visibleEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={String(emp.id)}>
                    {`${emp.first_name} ${emp.last_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card
            key={s.title}
            className="relative overflow-hidden rounded-3xl border border-border/50 shadow-sm transition-shadow hover:shadow-md"
          >
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${s.accent}`}
            />
            <CardContent className="relative flex items-center gap-4 py-5 pl-5">
              <div className={`rounded-2xl p-3 ${s.iconBg}`}>
                <s.icon className="size-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {s.title}
                </p>
                <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight">
                  {s.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl border border-border/50 shadow-sm">
        <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">
              {t("todayActivity")}
            </CardTitle>
          </div>
          <Badge className="rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
            {report ? formatKhmerDate(report.date) : "—"}
          </Badge>
        </CardHeader>

        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="px-6">
              <LoadingState variant="table" count={5} />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="rounded-full bg-muted p-4">
                <Fingerprint className="size-8 text-muted-foreground" />
              </div>
              <p className="mt-4 font-medium">
                {t("noRecords")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("selectDifferentDate")}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 pl-6 pr-4 border-b border-border/50">{t("employeeCol")}</th>
                    <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 px-4 border-b border-border/50">{t("dateCol")}</th>
                    {timeModes.length > 0 ? (
                      timeModes.map((tm) => (
                        <th key={tm.id} className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 px-4 border-b border-border/50">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="size-3.5" />
                            {formatTimeModeName(tm.name)}
                          </span>
                        </th>
                      ))
                    ) : (
                      <>
                        <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 px-4 border-b border-border/50">
                          <span className="inline-flex items-center gap-1.5">
                            <LogIn className="size-3.5" /> {t("checkInCol")}
                          </span>
                        </th>
                        <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 px-4 border-b border-border/50">
                          <span className="inline-flex items-center gap-1.5">
                            <LogOut className="size-3.5" /> {t("checkOutCol")}
                          </span>
                        </th>
                      </>
                    )}
                    <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 px-4 text-center border-b border-border/50">{t("statusCol")}</th>
                    <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 pl-4 pr-6 text-center border-b border-border/50">{t("actionCol")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {rows.map((row) => {
                    const badge =
                      STATUS_MAP[row.status] ?? STATUS_MAP.present;
                    return (
                      <tr
                        key={row.employee_id}
                        className="group transition-colors hover:bg-muted/40"
                      >
                        <td className="py-3.5 pl-6 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {initials(row.employee)}
                            </div>
                            <span className="font-medium leading-tight">
                              {row.employee}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-muted-foreground">
                          {formatReportDate(row.date, locale)}
                        </td>

                        {timeModes.length > 0 ? (
                          timeModes.map((tm) => {
                            const scan = row.scans?.[tm.id];
                            const isTodayOrFuture = row.date >= toISODate(new Date());
                            let scanText = isTodayOrFuture ? "—" : (t("missed") || "Missed");
                            let textClass = isTodayOrFuture ? "text-muted-foreground/60 font-medium" : "text-red-500 font-semibold";
                            
                            if (scan) {
                              if (scan.late_minutes && scan.late_minutes > 0) {
                                scanText = `${scan.time} (${formatLateMinutes(scan.late_minutes)})`;
                                textClass = "text-red-500 font-bold";
                              } else if (scan.early_minutes && scan.early_minutes > 0) {
                                scanText = `${scan.time} (-${formatLateMinutes(scan.early_minutes)})`;
                                textClass = "text-rose-500 font-semibold";
                              } else {
                                scanText = scan.time;
                                if (scan.is_late) {
                                  textClass = "text-amber-500 font-semibold";
                                } else if (scan.is_early) {
                                  textClass = "text-rose-500 font-semibold";
                                } else {
                                  textClass = "text-emerald-500 font-medium";
                                }
                              }
                            }

                            return (
                              <td key={tm.id} className="py-3.5 px-4">
                                <span className={cn("inline-flex items-center gap-1.5 font-mono text-sm tabular-nums", textClass)}>
                                  <Clock3 className={cn("size-3.5 shrink-0", isTodayOrFuture && !scan ? "text-muted-foreground/40" : "")} />
                                  {scanText}
                                </span>
                              </td>
                            );
                          })
                        ) : (
                          <>
                            <td className="py-3.5 px-4">
                              {(!row.checkIn || row.checkIn === "--:--" || row.checkIn === "Missed") ? (
                                <span className={cn("inline-flex items-center gap-1.5 font-mono text-sm tabular-nums", row.date >= toISODate(new Date()) ? "text-muted-foreground/60 font-medium" : "text-red-500 font-semibold")}>
                                  <Clock3 className={cn("size-3.5", row.date >= toISODate(new Date()) ? "text-muted-foreground/40" : "text-red-500")} />
                                  {row.date >= toISODate(new Date()) ? "—" : (t("missed") || "Missed")}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums text-emerald-500 font-medium">
                                  <Clock3 className="size-3.5 text-emerald-500" />
                                  {row.checkIn}
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              {(!row.checkOut || row.checkOut === "--:--" || row.checkOut === "Missed") ? (
                                <span className={cn("inline-flex items-center gap-1.5 font-mono text-sm tabular-nums", row.date >= toISODate(new Date()) ? "text-muted-foreground/60 font-medium" : "text-red-500 font-semibold")}>
                                  <Clock3 className={cn("size-3.5", row.date >= toISODate(new Date()) ? "text-muted-foreground/40" : "text-red-500")} />
                                  {row.date >= toISODate(new Date()) ? "—" : (t("missed") || "Missed")}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums text-rose-400 font-medium">
                                  <Clock3 className="size-3.5 text-rose-400" />
                                  {row.checkOut}
                                </span>
                              )}
                            </td>
                          </>
                        )}

                        <td className="py-3.5 px-4 text-center">
                          <Badge
                            className={`rounded-full px-3 ring-1 ${badge.className}`}
                          >
                            <span
                              className={`mr-1.5 inline-block size-1.5 rounded-full ${badge.dot}`}
                            />
                            {badge.label}
                          </Badge>
                        </td>

                        <td className="py-3.5 pl-4 pr-6 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 p-0 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
                            onClick={() => setSelectedRowForDetails(row)}
                            title={t("viewDetails")}
                          >
                            <Eye className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {rows.length > 0 && report?.pagination && (
              <div className="flex items-center justify-between border-t border-border/30 px-6 py-4 mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">
                    {locale === "km" ? "បង្ហាញ:" : "Show:"}
                  </span>
                  <Select
                    value={String(limit)}
                    onValueChange={(val) => {
                      setLimit(Number(val));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[85px] h-8 rounded-xl shadow-sm">
                      <SelectValue placeholder="10" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">
                    {locale === "km" ? "ជួរក្នុងមួយទំព័រ" : "Rows per page"}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-xl shadow-sm text-xs font-medium cursor-pointer"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    {tc("previous")}
                  </Button>
                  <span className="text-xs text-muted-foreground font-semibold px-2">
                    {tc("page")} {page} {tc("of")} {report?.pagination?.totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-xl shadow-sm text-xs font-medium cursor-pointer"
                    onClick={() => setPage((p) => Math.min(report?.pagination?.totalPages || 1, p + 1))}
                    disabled={page >= (report?.pagination?.totalPages || 1)}
                  >
                    {tc("next")}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
      </Card>

      {/* Late & Early Request Details Modal */}
      <Dialog
        open={Boolean(selectedRowForDetails)}
        onOpenChange={(open) => {
          if (!open) setSelectedRowForDetails(null);
        }}
      >
        <DialogContent className="sm:max-w-[560px] rounded-3xl p-0 overflow-hidden border-border/60 bg-card shadow-2xl">
          {selectedRowForDetails && (
            <div className="flex flex-col">
              {/* Modal Top Header */}
              <div className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-sm font-extrabold text-primary shadow-xs ring-1 ring-primary/20">
                      {initials(selectedRowForDetails.employee)}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-foreground leading-tight">
                        {selectedRowForDetails.employee}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <CalendarIcon className="size-3.5 text-muted-foreground/70" />
                        {formatReportDate(selectedRowForDetails.date, locale)}
                      </p>
                    </div>
                  </div>

                  <Badge
                    className={cn(
                      "rounded-full px-3 py-1 ring-1 text-xs font-semibold shrink-0",
                      (STATUS_MAP[selectedRowForDetails.status] ?? STATUS_MAP.present).className
                    )}
                  >
                    <span
                      className={cn(
                        "mr-1.5 inline-block size-1.5 rounded-full",
                        (STATUS_MAP[selectedRowForDetails.status] ?? STATUS_MAP.present).dot
                      )}
                    />
                    {(STATUS_MAP[selectedRowForDetails.status] ?? STATUS_MAP.present).label}
                  </Badge>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Attendance Scans Summary */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Clock3 className="size-3.5 text-primary" />
                    {t("attendanceScans")}
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {timeModes.length > 0 ? (
                      timeModes.map((tm) => {
                        const scan = selectedRowForDetails.scans?.[tm.id];
                        const isTodayOrFuture = selectedRowForDetails.date >= toISODate(new Date());
                        return (
                          <div
                            key={tm.id}
                            className="p-3 rounded-2xl bg-muted/30 border border-border/50 text-center"
                          >
                            <span className="text-[11px] font-semibold text-muted-foreground block truncate">
                              {formatTimeModeName(tm.name)}
                            </span>
                            <span
                              className={cn(
                                "mt-1 block font-mono text-sm font-bold",
                                scan ? (scan.is_late ? "text-red-500" : scan.is_early ? "text-rose-500" : "text-emerald-500") : (isTodayOrFuture ? "text-muted-foreground/60" : "text-red-500/70")
                              )}
                            >
                              {scan?.time || (isTodayOrFuture ? "—" : (t("missed") || "Missed"))}
                            </span>
                            {scan?.late_minutes && scan.late_minutes > 0 ? (
                              <span className="text-[10px] font-semibold text-red-500 mt-0.5 block font-mono">
                                ({formatLateMinutes(scan.late_minutes)})
                              </span>
                            ) : null}
                          </div>
                        );
                      })
                    ) : (
                      <>
                        <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 text-center col-span-1">
                          <span className="text-[11px] font-semibold text-muted-foreground block">
                            {t("checkInCol")}
                          </span>
                          <span className={cn("mt-1 block font-mono text-sm font-bold", selectedRowForDetails.checkIn && selectedRowForDetails.checkIn !== "Missed" && selectedRowForDetails.checkIn !== "--:--" ? "text-emerald-500" : (selectedRowForDetails.date >= toISODate(new Date()) ? "text-muted-foreground/60" : "text-red-500"))}>
                            {(selectedRowForDetails.checkIn && selectedRowForDetails.checkIn !== "Missed" && selectedRowForDetails.checkIn !== "--:--") ? selectedRowForDetails.checkIn : (selectedRowForDetails.date >= toISODate(new Date()) ? "—" : t("missed"))}
                          </span>
                        </div>
                        <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 text-center col-span-1">
                          <span className="text-[11px] font-semibold text-muted-foreground block">
                            {t("checkOutCol")}
                          </span>
                          <span className={cn("mt-1 block font-mono text-sm font-bold", selectedRowForDetails.checkOut && selectedRowForDetails.checkOut !== "Missed" && selectedRowForDetails.checkOut !== "--:--" ? "text-rose-500" : (selectedRowForDetails.date >= toISODate(new Date()) ? "text-muted-foreground/60" : "text-red-500"))}>
                            {(selectedRowForDetails.checkOut && selectedRowForDetails.checkOut !== "Missed" && selectedRowForDetails.checkOut !== "--:--") ? selectedRowForDetails.checkOut : (selectedRowForDetails.date >= toISODate(new Date()) ? "—" : t("missed"))}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Late & Early Requests Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="size-3.5 text-primary" />
                      {t("requestsTitle")}
                    </h3>
                    {selectedRowForDetails.late_requests && selectedRowForDetails.late_requests.length > 0 && (
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {selectedRowForDetails.late_requests.length}
                      </span>
                    )}
                  </div>

                  {selectedRowForDetails.late_requests && selectedRowForDetails.late_requests.length > 0 ? (
                    <div className="space-y-3">
                      {selectedRowForDetails.late_requests.map((req) => {
                        const isEarly = req.request_type === "EARLY";
                        const isApproved = req.status === "approved";
                        const isPending = req.status === "pending";
                        const isRejected = req.status === "rejected";
                        const isCancelled = req.status === "cancelled";

                        return (
                          <div
                            key={req.id}
                            className={cn(
                              "p-4 rounded-2xl border transition-all space-y-3",
                              isApproved
                                ? "bg-emerald-500/5 border-emerald-200 dark:border-emerald-900/40"
                                : isPending
                                ? "bg-amber-500/5 border-amber-200 dark:border-amber-900/40"
                                : isCancelled
                                ? "bg-muted/40 border-border/70 opacity-80"
                                : "bg-rose-500/5 border-rose-200 dark:border-rose-900/40"
                            )}
                          >
                            {/* Request Header */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={cn(
                                    "rounded-xl px-2.5 py-1 text-xs font-semibold border shadow-none",
                                    isEarly
                                      ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                                      : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                                  )}
                                >
                                  {isEarly ? (
                                    <>🏃‍♂️ {t("earlyRequest")}</>
                                  ) : (
                                    <>⏰ {t("lateRequest")}</>
                                  )}
                                </Badge>

                                {req.scheduled_time && (
                                  <span className="text-xs font-mono font-bold text-foreground/80 bg-background/80 px-2 py-0.5 rounded-lg border border-border/40">
                                    {req.time_field || "Shift"}: {req.scheduled_time}
                                  </span>
                                )}
                              </div>

                              <Badge
                                className={cn(
                                  "rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 shadow-none",
                                  isApproved && "bg-emerald-100/70 text-emerald-800 ring-emerald-300 dark:bg-emerald-950 dark:text-emerald-300",
                                  isPending && "bg-amber-100/70 text-amber-800 ring-amber-300 dark:bg-amber-950 dark:text-amber-300",
                                  isRejected && "bg-rose-100/70 text-rose-800 ring-rose-300 dark:bg-rose-950 dark:text-rose-300",
                                  isCancelled && "bg-muted text-muted-foreground ring-border/80"
                                )}
                              >
                                {isApproved && `✅ ${t("approved")}`}
                                {isPending && `⏳ ${t("pending")}`}
                                {isRejected && `❌ ${t("rejected")}`}
                                {isCancelled && `🚫 ${t("cancelled") || "Cancelled"}`}
                              </Badge>
                            </div>

                            {/* Reason Box */}
                            <div className="p-3 bg-background/90 rounded-xl border border-border/50 text-xs text-foreground/90 space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                {t("reason")}
                              </span>
                              <p className="font-medium whitespace-pre-wrap leading-relaxed">
                                {req.reason || "—"}
                              </p>
                            </div>

                            {/* Meta details footer */}
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                              <div className="flex items-center gap-1.5">
                                <User className="size-3.5 text-muted-foreground/70" />
                                <span>{t("approver")}:</span>
                                <span className="font-semibold text-foreground">
                                  {req.approver || (isPending ? "—" : "Manager")}
                                </span>
                              </div>

                              {req.created_at && (
                                <span className="font-mono text-[10px]">
                                  {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-muted/20 border border-dashed border-border/60 text-center space-y-2">
                      <div className="p-3 rounded-2xl bg-muted text-muted-foreground shadow-xs">
                        <FileText className="size-6 text-muted-foreground/80" />
                      </div>
                      <p className="text-xs font-semibold text-muted-foreground">
                        {t("noRequestsForDay")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeAttendanceReportPage;
