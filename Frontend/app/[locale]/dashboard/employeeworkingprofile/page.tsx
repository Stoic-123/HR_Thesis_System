"use client";

import React, { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/routing";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";

import { Plus, Pencil, Clock, MapPinOff, MapPin } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAllEmployeeWorkingProfiles,
  createEmployeeWorkingProfile,
  deleteEmployeeWorkingProfile,
  type EmployeeWorkingProfile,
} from "@/services/employeeworkingprofile.services";
import { getAllDayOfWeeks, type DayOfWeek } from "@/services/dayofweek.services";
import { getAllEmployee } from "@/services/employee.services";
import type { TimeSheet } from "@/services/timesheet.services";

type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

const daysWithTranslations = (t: ReturnType<typeof useTranslations<"workingProfile">>) => [
  { key: "monday" as const,    label: t("monday"),     short: "Mon" },
  { key: "tuesday" as const,   label: t("tuesday"),    short: "Tue" },
  { key: "wednesday" as const, label: t("wednesday"),   short: "Wed" },
  { key: "thursday" as const,  label: t("thursday"),    short: "Thu" },
  { key: "friday" as const,    label: t("friday"),      short: "Fri" },
  { key: "saturday" as const,  label: t("saturday"),    short: "Sat" },
  { key: "sunday" as const,    label: t("sunday"),      short: "Sun" },
];

const isWeekend = (key: DayKey) => key === "saturday" || key === "sunday";

export const EmployeeWorkingProfilePage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<string>("");
  const [selectedDayOfWeek, setSelectedDayOfWeek] = React.useState<string>("");
  const [allowBypassLocation, setAllowBypassLocation] = React.useState<boolean>(false);
  const t = useTranslations("workingProfile");
  const tc = useTranslations("common");
  const days = daysWithTranslations(t);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["employeeworkingprofiles"],
    queryFn: () => getAllEmployeeWorkingProfiles(1, 100),
  });

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: () => getAllEmployee(1, 100),
  });

  const { data: dayOfWeeks } = useQuery({
    queryKey: ["dayofweeks"],
    queryFn: () => getAllDayOfWeeks(1, 100),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      createEmployeeWorkingProfile({
        employee_id: Number(data.employee_id),
        day_of_week_id: Number(data.day_of_week_id),
        allow_online_bypass_location: Boolean(data.allow_online_bypass_location),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeeworkingprofiles"] });
      toast.success(t("created"));
      setOpen(false);
      setSelectedEmployee("");
      setSelectedDayOfWeek("");
      setAllowBypassLocation(false);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || t("createFailed")
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !selectedDayOfWeek) return;
    createMutation.mutate({
      employee_id: selectedEmployee,
      day_of_week_id: selectedDayOfWeek,
      allow_online_bypass_location: allowBypassLocation,
    });
  };

  const getEmployeeInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t("title")}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl gap-2 h-11 px-6 shadow-lg shadow-primary/20">
              <Plus className="size-4" />
              {t("assignButton")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-2xl">{t("assignTitle")}</DialogTitle>
                <DialogDescription>
                  {t("assignDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Field>
                  <Label htmlFor="employee">{t("employeeLabel")}</Label>
                  <Select
                    value={selectedEmployee}
                    onValueChange={setSelectedEmployee}
                  >
                    <SelectTrigger id="employee" className="w-full">
                      <SelectValue placeholder={t("selectEmployee")} />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[100]">
                      <SelectGroup>
                        {employees?.data?.map((emp: any) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.first_name} {emp.last_name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <Label htmlFor="dayofweek">{t("workingWeekLabel")}</Label>
                  <Select
                    value={selectedDayOfWeek}
                    onValueChange={setSelectedDayOfWeek}
                  >
                    <SelectTrigger id="dayofweek" className="w-full">
                      <SelectValue placeholder={t("selectWorkingWeek")} />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[100]">
                      <SelectGroup>
                        {dayOfWeeks?.data?.map((dow: DayOfWeek) => (
                          <SelectItem key={dow.id} value={dow.id.toString()}>
                            {dow.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                {/* Location bypass toggle */}
                <div
                  className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 cursor-pointer select-none transition-colors hover:bg-muted/60"
                  onClick={() => setAllowBypassLocation(!allowBypassLocation)}
                >
                  <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${allowBypassLocation ? 'border-primary bg-primary' : 'border-muted-foreground bg-background'}`}>
                    {allowBypassLocation && (
                      <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-none mb-1">{t("allowBypassLabel")}</p>
                    <p className="text-xs text-muted-foreground">{t("allowBypassDesc")}</p>
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-8">
                <DialogClose asChild>
                  <Button variant="outline">{tc("cancel")}</Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={!selectedEmployee || !selectedDayOfWeek || createMutation.isPending}
                >
                  {createMutation.isPending ? t("assigning") : t("assign")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Table Card ── */}
      <Card className="overflow-hidden rounded-3xl border border-border/50 shadow-sm">
        <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
          <CardTitle className="text-base font-semibold">{t("profileList")}</CardTitle>
          <Badge variant="secondary" className="rounded-full text-xs">
            {profiles?.data?.length ?? 0} {t("employees")}
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-3 text-sm">{tc("loading")}</p>
            </div>
          ) : profiles?.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4">
                <Clock className="size-8 text-muted-foreground" />
              </div>
              <p className="mt-4 font-medium">{t("noProfiles")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("clickAssign")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3.5 pl-6 pr-3">{t("employeeLabel")}</th>
                    <th className="py-3.5 px-3">{t("weekLabel")}</th>
                    {days.map((day) => (
                      <th
                        key={day.key}
                        className={`py-3.5 px-3 text-center ${
                          isWeekend(day.key) ? "text-rose-400/80" : ""
                        }`}
                      >
                        <span className="block">{day.label}</span>
                        <span className="block text-[10px] font-normal normal-case text-muted-foreground/60">
                          {day.short}
                        </span>
                      </th>
                    ))}
                    <th className="py-3.5 px-3 text-center">{t("onlineAttendance")}</th>
                    <th className="py-3.5 pl-3 pr-6 text-right">{tc("actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {profiles?.data?.map((profile: EmployeeWorkingProfile) => (
                    <tr
                      key={profile.id}
                      className="group transition-colors hover:bg-muted/25"
                    >
                      {/* ── Employee ── */}
                      <td className="py-3.5 pl-6 pr-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm">
                            <AvatarImage
                              src={
                                profile.employee?.profile_path
                                  ? `${process.env.NEXT_PUBLIC_API_URL}${profile.employee.profile_path}`
                                  : undefined
                              }
                              alt={`${profile.employee?.first_name} ${profile.employee?.last_name}`}
                            />
                            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                              {profile.employee
                                ? getEmployeeInitials(
                                    profile.employee.first_name,
                                    profile.employee.last_name
                                  )
                                : "UN"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="truncate font-semibold leading-tight">
                              {profile.employee?.first_name}{" "}
                              {profile.employee?.last_name}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {profile.employee?.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* ── Schedule Name ── */}
                      <td className="py-3.5 px-3">
                        <Badge
                          variant="secondary"
                          className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                        >
                          {profile.dayofweek?.name ?? "—"}
                        </Badge>
                      </td>

                      {/* ── Day Columns ── */}
                      {days.map(({ key }) => {
                        const timeSheet = profile.dayofweek?.[key] as
                          | TimeSheet
                          | undefined;
                        const timeIn = timeSheet?.time_in;
                        const timeOut = timeSheet?.time_out;
                        const hasSchedule = !!timeSheet;

                        return (
                          <td key={key} className="py-3.5 px-3 text-center">
                            {hasSchedule ? (
                              <div className="inline-flex flex-col items-center gap-0.5">
                                <span className="text-xs font-medium leading-tight">
                                  {timeSheet!.name}
                                </span>
                                {timeIn && timeOut && (
                                  <span className="inline-flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
                                    <Clock className="size-3 text-emerald-500" />
                                    {timeIn}–{timeOut}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* ── Online Attendance ── */}
                      <td className="py-3.5 px-3 text-center">
                        {profile.allow_online_bypass_location ? (
                          <Badge className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                            <MapPinOff className="mr-1 size-3" />
                            {t("noLocation")}
                          </Badge>
                        ) : (
                          <Badge className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border/50">
                            <MapPin className="mr-1 size-3" />
                            {t("locationRequired")}
                          </Badge>
                        )}
                      </td>

                      {/* ── Actions ── */}
                      <td className="py-3.5 pl-3 pr-6 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedEmployee(profile.employee_id.toString());
                            setSelectedDayOfWeek(profile.day_of_week_id.toString());
                            setAllowBypassLocation(
                              profile.allow_online_bypass_location ?? false
                            );
                            setOpen(true);
                          }}
                          className="size-8 rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const EmployeeWorkingProfileRedirectPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/time-attendance/setup");
  }, [router]);

  return null;
};

export default EmployeeWorkingProfileRedirectPage;
