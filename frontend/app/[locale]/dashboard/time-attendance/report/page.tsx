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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await getAttendanceReport({
        startDate: toISODate(startDate),
        endDate: toISODate(endDate),
        departmentId: selectedDeptId,
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
  }, [startDate, endDate, selectedDeptId, selectedEmpId, page, limit]);

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
        const scansCells = timeModes.length > 0
          ? timeModes.map(tm => {
              const scan = row.scans?.[tm.id];
              let scanText = "Missed";
              let colorClass = "text-rose";
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
                  : `<span class="text-rose font-mono">Missed</span>`,
                align: "center" as const
              },
              {
                text: (row.checkOut && row.checkOut !== "--:--" && row.checkOut !== "Missed")
                  ? `<span class="text-rose font-mono">${row.checkOut}</span>`
                  : `<span class="text-rose font-mono">Missed</span>`,
                align: "center" as const
              }
            ];

        const statusLabel = row.status === "present" ? "មកទាន់ពេល" : row.status === "late" ? "យឺតយ៉ាវ" : "ចេញមុន";
        const statusColor = row.status === "present" ? "text-emerald" : row.status === "late" ? "text-amber" : "text-rose";

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
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    late: {
      label: t("late"),
      dot: "bg-amber-500",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
    },
    early: {
      label: t("early"),
      dot: "bg-rose-500",
      className: "bg-rose-50 text-rose-700 ring-rose-200",
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
        if (!r.scans) return acc;
        return acc + Object.values(r.scans).filter((s: any) => !s || !s.time || s.time === "--:--").length;
      }, 0)),
      icon: Clock3,
      iconBg: "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
      accent: "from-rose-500/10 to-transparent",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("pageTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("pageDescription")}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {/* Date Range Picker (From / To) */}
          <DateRangePicker
            startDate={toISODate(startDate)}
            endDate={toISODate(endDate)}
            onStartDateChange={(val) => setStartDate(parseLocalDate(val))}
            onEndDateChange={(val) => setEndDate(parseLocalDate(val))}
            fromLabel={locale === "km" ? "ពី" : "From"}
            toLabel={locale === "km" ? "ដល់" : "To"}
          />

          {/* Department Select */}
          <div className="flex flex-col gap-1.5 min-w-[160px]">
            <Label className="text-xs font-medium text-muted-foreground">{t("department")}</Label>
            <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
              <SelectTrigger className="h-10 rounded-xl shadow-xs bg-background border-gray-200/80">
                <SelectValue placeholder={t("department")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all")}</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Employee Select */}
          <div className="flex flex-col gap-1.5 min-w-[160px]">
            <Label className="text-xs font-medium text-muted-foreground">{t("employee")}</Label>
            <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
              <SelectTrigger className="h-10 rounded-xl shadow-xs bg-background border-gray-200/80">
                <SelectValue placeholder={t("employee")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all")}</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={String(emp.id)}>
                    {`${emp.first_name} ${emp.last_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5 justify-end">
            <span className="text-xs font-medium opacity-0 select-none hidden sm:inline-block">Action</span>
            <Button
              onClick={handleExportPDF}
              className="h-10 flex items-center gap-2 rounded-xl shadow-xs bg-primary hover:bg-primary/90 text-white font-medium cursor-pointer"
              disabled={!report || rows.length === 0}
            >
              <Printer className="size-4" />
              {t("exportPDF") || "Export PDF"}
            </Button>
          </div>
        </div>
      </div>

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
                    <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 pl-4 pr-6 text-right border-b border-border/50">{t("statusCol")}</th>
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
                            let scanText = t("missed") || "Missed";
                            let textClass = "text-red-500 font-semibold";
                            
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
                                  <Clock3 className="size-3.5 shrink-0" />
                                  {scanText}
                                </span>
                              </td>
                            );
                          })
                        ) : (
                          <>
                            <td className="py-3.5 px-4">
                              {(!row.checkIn || row.checkIn === "--:--" || row.checkIn === "Missed") ? (
                                <span className="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums text-red-500 font-semibold">
                                  <Clock3 className="size-3.5 text-red-500" />
                                  {t("missed") || "Missed"}
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
                                <span className="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums text-red-500 font-semibold">
                                  <Clock3 className="size-3.5 text-red-500" />
                                  {t("missed") || "Missed"}
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

                        <td className="py-3.5 pl-4 pr-6 text-right">
                          <Badge
                            className={`rounded-full px-3 ring-1 ${badge.className}`}
                          >
                            <span
                              className={`mr-1.5 inline-block size-1.5 rounded-full ${badge.dot}`}
                            />
                            {badge.label}
                          </Badge>
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
    </div>
  );
};

export default TimeAttendanceReportPage;
