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
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import {
  getAttendanceReport,
  type AttendanceReport,
} from "@/services/attendance.services";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

/* ────────────────────────── helpers ──────────────────────────── */

const formatKhmerDate = (isoDate: string) => {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("km-KH", {
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
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const t = useTranslations("timeAttendanceReport");
  const tc = useTranslations("common");

  const selectedDate = toISODate(calendarDate);

  const fetchReport = async (date: string) => {
    setLoading(true);
    try {
      const res = await getAttendanceReport(date);
      if (res.result) {
        setReport(res.data);
      } else {
        setReport(null);
      }
    } catch (err) {
      console.error("Failed to fetch attendance report:", err);
      toast.error(t("loadFailed"));
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(selectedDate);
  }, [selectedDate]);

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
      iconBg: "bg-blue-100 text-blue-600",
      accent: "from-blue-500/10 to-transparent",
    },
    {
      title: t("onTimeRate"),
      value: loading ? "…" : `${summary?.onTimeRate ?? 0}%`,
      icon: UserCheck,
      iconBg: "bg-emerald-100 text-emerald-600",
      accent: "from-emerald-500/10 to-transparent",
    },
    {
      title: t("lateEmployees"),
      value: loading ? "…" : String(summary?.lateCount ?? 0),
      icon: Clock3,
      iconBg: "bg-amber-100 text-amber-600",
      accent: "from-amber-500/10 to-transparent",
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

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "min-w-[230px] justify-start gap-2 rounded-xl shadow-sm",
                !calendarDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="size-4 text-muted-foreground" />
              {calendarDate
                ? calendarDate.toLocaleDateString("km-KH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : tc("selectDate")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={calendarDate}
              onSelect={(date) => date && setCalendarDate(date)}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        {stats.map((s) => (
          <Card
            key={s.title}
            className="relative overflow-hidden rounded-3xl border border-border/50 shadow-sm transition-shadow hover:shadow-md"
          >
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${s.accent}`}
            />
            <CardContent className="relative flex items-center gap-4 py-6 pl-6">
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

        <CardContent>
          {loading ? (
            <LoadingState variant="table" count={5} />
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3 pr-4">{t("employeeCol")}</th>
                    <th className="pb-3 pr-4">{t("dateCol")}</th>
                    {timeModes.length > 0 ? (
                      timeModes.map((tm) => (
                        <th key={tm.id} className="pb-3 pr-4">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="size-3.5" />
                            {formatTimeModeName(tm.name)}
                          </span>
                        </th>
                      ))
                    ) : (
                      <>
                        <th className="pb-3 pr-4">
                          <span className="inline-flex items-center gap-1">
                            <LogIn className="size-3.5" /> {t("checkInCol")}
                          </span>
                        </th>
                        <th className="pb-3 pr-4">
                          <span className="inline-flex items-center gap-1">
                            <LogOut className="size-3.5" /> {t("checkOutCol")}
                          </span>
                        </th>
                      </>
                    )}
                    <th className="pb-3 text-right">{t("statusCol")}</th>
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
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {initials(row.employee)}
                            </div>
                            <span className="font-medium leading-tight">
                              {row.employee}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 pr-4 text-muted-foreground">
                          {formatKhmerDate(row.date)}
                        </td>

                        {timeModes.length > 0 ? (
                          timeModes.map((tm) => {
                            const scan = row.scans?.[tm.id];
                            let scanText = "--:--";
                            let textClass = "text-muted-foreground";
                            
                            if (scan) {
                              scanText = scan.time;
                              if (scan.is_late) {
                                textClass = "text-amber-500 font-semibold";
                              } else if (scan.is_early) {
                                textClass = "text-rose-500 font-semibold";
                              } else {
                                textClass = "text-emerald-500 font-medium";
                              }
                            }

                            return (
                              <td key={tm.id} className="py-3.5 pr-4">
                                <span className={cn("inline-flex items-center gap-1.5 font-mono text-sm tabular-nums", textClass)}>
                                  <Clock3 className="size-3.5 shrink-0" />
                                  {scanText}
                                </span>
                              </td>
                            );
                          })
                        ) : (
                          <>
                            <td className="py-3.5 pr-4">
                              <span className="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums text-emerald-500">
                                <Clock3 className="size-3.5 text-emerald-500" />
                                {row.checkIn}
                              </span>
                            </td>

                            <td className="py-3.5 pr-4">
                              <span className="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums text-rose-400">
                                <Clock3 className="size-3.5 text-rose-400" />
                                {row.checkOut}
                              </span>
                            </td>
                          </>
                        )}

                        <td className="py-3.5 text-right">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeAttendanceReportPage;
