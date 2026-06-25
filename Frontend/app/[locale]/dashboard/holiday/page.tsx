"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Plus,
  Trash2,
  Sparkles,
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
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import {
  getHolidays,
  createHoliday,
  deleteHoliday,
  type Holiday,
} from "@/services/holiday.services";

/* ───────────────────────── helpers ────────────────────────────── */

/** Expand a start/end range into individual Date objects (midnight UTC) */
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

const formatRange = (start: string, end: string) => {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  const sameDay = toISO(s) === toISO(e);
  if (sameDay) return s.toLocaleDateString("en-US", { ...opts, year: "numeric" });
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
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
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl gap-2 h-11 px-6 shadow-lg shadow-primary/20">
              <Plus className="size-4" />
              {t("addHoliday")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">{t("addNewHoliday")}</DialogTitle>
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
                <Label>{t("nameLabel")}</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("fromDate")}</Label>
                  <Input
                    type="date"
                    value={newStart}
                    onChange={(e) => {
                      setNewStart(e.target.value);
                      if (!newEnd || e.target.value > newEnd)
                        setNewEnd(e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("toDate")}</Label>
                  <Input
                    type="date"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    min={newStart || undefined}
                  />
                </div>
              </div>
              <DialogFooter className="pt-2">
                <DialogClose asChild>
                  <Button variant="outline">{tc("cancel")}</Button>
                </DialogClose>
                <Button
                  type="submit"
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
        <Card className="rounded-3xl border border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="flex-row items-center gap-2 pb-2">
            <CalendarDays className="size-5 text-primary" />
            <CardTitle className="text-base font-semibold">
              {t("calendar", { year })}
            </CardTitle>
          </CardHeader>

          <CardContent className="pb-4">
            {isLoading ? (
              <LoadingState variant="card" count={1} />
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
                    "bg-rose-100 text-rose-700 dark:text-rose-300 font-bold after:content-[''] after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:size-1.5 after:rounded-full after:bg-rose-500 after:pointer-events-none",
                }}
                className="w-full rounded-2xl [--cell-size:4.5rem] p-4"
                classNames={{
                  month_grid:
                    "border border-border/50 rounded-xl overflow-hidden",
                  weekdays: "bg-muted/40",
                  weekday:
                    "text-[11px] font-bold uppercase tracking-widest text-muted-foreground py-2.5",
                  week: "border-t border-border/30 first:border-t-0",
                  day: "border-r border-border/30 last:border-r-0 [&>button>span]:text-lg [&>button>span]:font-bold [&>button]:relative",
                  caption_label: "text-lg font-extrabold",
                  today: "bg-primary/15 text-primary",
                }}
              />
            )}
          </CardContent>

          {/* Legend */}
          <div className="flex items-center gap-5 border-t border-border/40 px-6 py-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block size-3 rounded-sm bg-rose-100 ring-1 ring-rose-300" />
              {t("holidayLegend")}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block size-3 rounded-sm bg-primary ring-1 ring-primary/40" />
              {t("selectedLegend")}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block size-3 rounded-sm bg-primary/15 ring-1 ring-primary/30" />
              {t("todayLegend")}
            </div>
          </div>
        </Card>

        {/* ── Sidebar: Holiday List ── */}
        <div className="space-y-4">
          {/* Selected-day detail */}
          {selected && selectedHolidays.length > 0 && (
            <Card className="rounded-3xl border border-rose-200 bg-rose-50/50 shadow-sm">
              <CardContent className="py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-500 mb-2">
                  {selected.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                {selectedHolidays.map((h) => (
                  <div key={h.id} className="flex items-center justify-between">
                    <span className="font-semibold text-rose-800">{h.name}</span>
                    <Badge className="rounded-full bg-rose-100 text-rose-700 ring-1 ring-rose-200">
                      {t("durationDays", { count: holidayDuration(h.start_date, h.end_date) })}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Full list */}
          <Card className="rounded-3xl border border-border/50 shadow-sm">
            <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="size-4 text-amber-500" />
                {t("holidayList")}
              </CardTitle>
              <Badge variant="secondary" className="rounded-full text-xs">
                {holidays.length}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {isLoading ? (
                <LoadingState variant="table" count={3} />
              ) : holidays.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="rounded-full bg-muted p-3">
                    <CalendarDays className="size-6 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-sm font-medium">
                    {t("noHolidays", { year })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("addHint")}
                  </p>
                </div>
              ) : (
                holidays.map((h) => (
                  <div
                    key={h.id}
                    className="group flex items-center justify-between rounded-2xl border border-border/40 bg-background/60 px-4 py-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold leading-tight">
                        {h.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatRange(h.start_date, h.end_date)}
                        <span className="ml-1.5 text-muted-foreground/60">
                          ({t("durationDays", { count: holidayDuration(h.start_date, h.end_date) })})
                        </span>
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:!bg-rose-100 hover:!text-rose-600"
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
