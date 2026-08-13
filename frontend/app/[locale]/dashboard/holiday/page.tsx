"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Plus,
  Trash2,
  Sparkles,
  Calendar as CalendarIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { DateRangePicker } from "@/components/ui/date-range-picker";

import {
  getHolidays,
  createHoliday,
  deleteHoliday,
  type Holiday,
} from "@/services/holiday.services";

/* ───────────────────────── helpers ────────────────────────────── */

const expandDateRange = (start: string, end: string): Date[] => {
  const dates: Date[] = [];
  const s = new Date(start);
  const e = new Date(end);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d));
  }
  return dates;
};

const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatRange = (start: string, end: string, locale: string) => {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  const lang = locale === "km" ? "km-KH" : "en-US";
  const sameDay = toISO(s) === toISO(e);
  if (sameDay) return s.toLocaleDateString(lang, { ...opts, year: "numeric" });
  return `${s.toLocaleDateString(lang, opts)} – ${e.toLocaleDateString(lang, { ...opts, year: "numeric" })}`;
};

const holidayDuration = (start: string, end: string) => {
  const s = new Date(start);
  const e = new Date(end);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
};

/* ───────────────────────── component ──────────────────────────── */

export default function HolidayPage() {
  const t = useTranslations("holiday");
  const tc = useTranslations("common");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<Date>(new Date());

  // Create dialog state
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  /* ── data ── */
  const { data, isLoading } = useQuery({
    queryKey: ["holidays", year],
    queryFn: () => getHolidays(year, 1, 200),
  });

  const holidays = data?.data ?? [];

  const createMut = useMutation({
    mutationFn: (d: { name: string; start_date: string; end_date: string }) =>
      createHoliday(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast.success(t("created"));
      setOpen(false);
      setNewName("");
      setNewStart("");
      setNewEnd("");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || t("createFailed")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteHoliday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast.success(t("deleted"));
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || t("deleteFailed")),
  });

  /* ── calendar modifiers ── */
  const holidayDates = useMemo(
    () => holidays.flatMap((h) => expandDateRange(h.start_date, h.end_date)),
    [holidays]
  );

  /* ── selected-date detail ── */
  const [selected, setSelected] = useState<Date | undefined>(undefined);
  const selectedHolidays = useMemo(() => {
    if (!selected) return [];
    const iso = toISO(selected);
    return holidays.filter((h) => {
      const dates = expandDateRange(h.start_date, h.end_date).map(toISO);
      return dates.includes(iso);
    });
  }, [selected, holidays]);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gap-2 h-10 px-5 shadow-sm font-medium bg-primary hover:bg-primary/90 text-white cursor-pointer">
              <Plus className="size-4" />
              {t("addHoliday")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{t("addNewHoliday")}</DialogTitle>
              <DialogDescription>
                {t("addHolidayDesc")}
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newName || !newStart || !newEnd) return;
                createMut.mutate({
                  name: newName,
                  start_date: newStart,
                  end_date: newEnd,
                });
              }}
              className="space-y-4 mt-2"
            >
              <div className="space-y-1.5">
                <Label className="font-semibold text-sm">{t("nameLabel")}</Label>
                <Input
                  className="rounded-xl"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                />
              </div>
              <DateRangePicker
                startDate={newStart}
                endDate={newEnd}
                onStartDateChange={(val) => {
                  setNewStart(val);
                  if (!newEnd || val > newEnd) setNewEnd(val);
                }}
                onEndDateChange={(val) => setNewEnd(val)}
                fromLabel={t("fromDate")}
                toLabel={t("toDate")}
              />
              <DialogFooter className="pt-2 gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button variant="outline" className="rounded-xl">{tc("cancel")}</Button>
                </DialogClose>
                <Button
                  type="submit"
                  className="rounded-xl bg-primary hover:bg-primary/90 text-white cursor-pointer"
                  disabled={!newName || !newStart || !newEnd || createMut.isPending}
                >
                  {createMut.isPending ? t("creating") : t("create")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Body ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* ── Calendar ── */}
        <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="flex-row items-center gap-2 pb-2">
            <CalendarDays className="size-5 text-primary" />
            <CardTitle className="text-base font-semibold">
              {t("calendar", { year })}
            </CardTitle>
          </CardHeader>

          <CardContent className="pb-4 flex-1">
            {isLoading ? (
              <div className="space-y-3 py-4 animate-pulse">
                <div className="flex justify-between items-center px-2">
                  <Skeleton className="h-6 w-24 rounded-md" />
                  <div className="flex gap-2">
                    <Skeleton className="h-7 w-7 rounded" />
                    <Skeleton className="h-7 w-7 rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {[...Array(7)].map((_, i) => (
                    <Skeleton key={i} className="h-4 rounded" />
                  ))}
                  {[...Array(35)].map((_, i) => (
                    <Skeleton key={i} className="h-8 rounded-lg" />
                  ))}
                </div>
              </div>
            ) : (
              <Calendar
                mode="single"
                selected={selected}
                onSelect={setSelected}
                month={month}
                onMonthChange={(m) => {
                  setMonth(m);
                  setYear(m.getFullYear());
                }}
                showOutsideDays={false}
                modifiers={{ holiday: holidayDates }}
                modifiersClassNames={{
                  holiday:
                    "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300 font-bold after:content-[''] after:absolute after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:size-1.5 after:rounded-full after:bg-rose-500 after:pointer-events-none",
                }}
                className="w-full rounded-2xl [--cell-size:4.5rem] p-0"
                classNames={{
                  month_grid:
                    "border border-border/50 rounded-xl overflow-hidden w-full",
                  weekdays: "bg-muted/40",
                  weekday:
                    "text-[11px] font-bold uppercase tracking-widest text-muted-foreground py-2.5 text-center flex-1",
                  week: "border-t border-border/30 first:border-t-0",
                  day: "border-r border-border/30 last:border-r-0 [&_button]:text-lg [&_button]:font-bold [&_button]:h-full [&_button]:w-full [&_button]:rounded-none [&_button]:flex [&_button]:items-center [&_button]:justify-center [&_button]:relative",
                  caption_label: "text-lg font-extrabold",
                  today: "bg-primary/10 text-primary font-bold",
                }}
              />
            )}
          </CardContent>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-5 border-t border-border/40 px-6 py-4 bg-muted/10">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <span className="inline-block size-3 rounded bg-rose-50 ring-1 ring-rose-200" />
              {t("holidayLegend")}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <span className="inline-block size-3 rounded bg-primary ring-1 ring-primary/30" />
              {t("selectedLegend")}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <span className="inline-block size-3 rounded bg-primary/10 ring-1 ring-primary/20" />
              {t("todayLegend")}
            </div>
          </div>
        </Card>

        {/* ── Sidebar: Holiday List ── */}
        <div className="space-y-4">
          {/* Selected-day detail */}
          {selected && selectedHolidays.length > 0 && (
            <Card className="rounded-3xl border border-rose-200 bg-rose-50/40 shadow-sm overflow-hidden">
              <CardContent className="py-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 mb-2.5">
                  {selected.toLocaleDateString(locale === "km" ? "km-KH" : "en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <div className="space-y-3">
                  {selectedHolidays.map((h) => (
                    <div key={h.id} className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-sm text-rose-900">{h.name}</span>
                      <Badge className="rounded-full bg-rose-100/80 text-rose-700 hover:bg-rose-100/80 border border-rose-200">
                        {locale === "km"
                          ? `${holidayDuration(h.start_date, h.end_date)} ថ្ងៃ`
                          : `${holidayDuration(h.start_date, h.end_date)} ${holidayDuration(h.start_date, h.end_date) === 1 ? "day" : "days"}`}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Full list */}
          <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
            <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="size-4 text-amber-500" />
                {t("holidayList")}
              </CardTitle>
              <Badge variant="secondary" className="rounded-full text-xs font-semibold px-2 py-0.5 bg-muted/60">
                {holidays.length}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {isLoading ? (
                <div className="space-y-2.5 animate-pulse">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between rounded-2xl border border-border/40 bg-background/30 px-4 py-3">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/3 rounded" />
                        <Skeleton className="h-3 w-1/4 rounded" />
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full shrink-0" />
                    </div>
                  ))}
                </div>
              ) : holidays.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center justify-center">
                  <div className="rounded-full bg-muted p-4 mb-3">
                    <CalendarIcon className="size-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    {t("noHolidays", { year })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                    {t("addHint")}
                  </p>
                </div>
              ) : (
                holidays.map((h) => (
                  <div
                    key={h.id}
                    className="group flex items-center justify-between rounded-2xl border border-border/45 bg-background/60 px-4 py-3 transition-all hover:bg-muted/20"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-sm leading-snug">
                        {h.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatRange(h.start_date, h.end_date, locale)}
                        <span className="ml-1.5 text-muted-foreground/60">
                          ({locale === "km"
                            ? `${holidayDuration(h.start_date, h.end_date)} ថ្ងៃ`
                            : `${holidayDuration(h.start_date, h.end_date)} ${holidayDuration(h.start_date, h.end_date) === 1 ? "day" : "days"}`})
                        </span>
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:!bg-rose-100 hover:!text-rose-600 rounded-lg cursor-pointer"
                      onClick={() => deleteMut.mutate(h.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
