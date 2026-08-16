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
  const [isEditing, setIsEditing] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<string>("");
  const [selectedDayOfWeek, setSelectedDayOfWeek] = React.useState<string>("");
  const [allowBypassLocation, setAllowBypassLocation] = React.useState<boolean>(false);
  const [profileToDelete, setProfileToDelete] = React.useState<EmployeeWorkingProfile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

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

  // Calculate assigned employee IDs to filter out duplicates in "+ Set Working Hours"
  const assignedEmployeeIds = React.useMemo(() => {
    return new Set(profiles?.data?.map((p: any) => p.employee_id) || []);
  }, [profiles?.data]);

  // Only show unassigned employees when creating; show all / current when editing
  const availableEmployees = React.useMemo(() => {
    const list = employees?.data || [];
    if (isEditing) return list;
    return list.filter((emp: any) => !assignedEmployeeIds.has(emp.id));
  }, [employees?.data, assignedEmployeeIds, isEditing]);

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      createEmployeeWorkingProfile({
        employee_id: Number(data.employee_id),
        day_of_week_id: Number(data.day_of_week_id),
        allow_online_bypass_location: Boolean(data.allow_online_bypass_location),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeeworkingprofiles"] });
      toast.success(isEditing ? "Working profile updated successfully." : t("created"));
      setOpen(false);
      setIsEditing(false);
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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEmployeeWorkingProfile(id.toString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeeworkingprofiles"] });
      toast.success("Working profile removed successfully.");
      setIsDeleteDialogOpen(false);
      setProfileToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to remove working profile.");
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

  const handleDelete = () => {
    if (!profileToDelete) return;
    deleteMutation.mutate(profileToDelete.id);
  };

  const getEmployeeInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const selectedEmployeeObj = employees?.data?.find(
    (emp: any) => emp.id.toString() === selectedEmployee
  );

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

        <Button
          onClick={() => {
            setIsEditing(false);
            setSelectedEmployee("");
            setSelectedDayOfWeek("");
            setAllowBypassLocation(false);
            setOpen(true);
          }}
          className="rounded-2xl gap-2 h-11 px-6 shadow-lg shadow-primary/20"
        >
          <Plus className="size-4" />
          {t("assignButton")}
        </Button>

        {/* Create / Edit Working Profile Modal */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-xl rounded-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  {isEditing ? "Edit Working Hours" : t("assignTitle")}
                </DialogTitle>
                <DialogDescription>
                  {isEditing
                    ? "Update the assigned working week schedule or location bypass for this employee."
                    : t("assignDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Field>
                  <Label htmlFor="employee" className="font-semibold text-xs text-foreground">
                    {t("employeeLabel")} *
                  </Label>
                  {isEditing && selectedEmployeeObj ? (
                    <div className="p-3 bg-muted/40 border border-border/50 rounded-xl flex items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage
                          src={
                            selectedEmployeeObj.profile_path
                              ? `${process.env.NEXT_PUBLIC_API_URL}${selectedEmployeeObj.profile_path}`
                              : undefined
                          }
                          alt={`${selectedEmployeeObj.first_name} ${selectedEmployeeObj.last_name}`}
                        />
                        <AvatarFallback className="text-xs font-bold">
                          {getEmployeeInitials(selectedEmployeeObj.first_name, selectedEmployeeObj.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-foreground truncate">
                          {selectedEmployeeObj.first_name} {selectedEmployeeObj.last_name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {selectedEmployeeObj.email || "No email"}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 font-semibold">
                        Locked
                      </Badge>
                    </div>
                  ) : (
                    <Select
                      value={selectedEmployee}
                      onValueChange={setSelectedEmployee}
                      disabled={availableEmployees.length === 0}
                    >
                      <SelectTrigger id="employee" className="w-full rounded-xl">
                        <SelectValue
                          placeholder={
                            availableEmployees.length === 0
                              ? "All employees already assigned"
                              : t("selectEmployee")
                          }
                        />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[100] rounded-xl">
                        <SelectGroup>
                          {availableEmployees.map((emp: any) => (
                            <SelectItem key={emp.id} value={emp.id.toString()} className="text-xs">
                              {emp.first_name} {emp.last_name} ({emp.email || "No email"})
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                  {!isEditing && availableEmployees.length === 0 && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                      ℹ️ All active employees have already been assigned a working profile. Use the edit button in the table below to modify an existing schedule.
                    </p>
                  )}
                </Field>

                <Field>
                  <Label htmlFor="dayofweek" className="font-semibold text-xs text-foreground">
                    {t("workingWeekLabel")} *
                  </Label>
                  <Select
                    value={selectedDayOfWeek}
                    onValueChange={setSelectedDayOfWeek}
                    required
                  >
                    <SelectTrigger id="dayofweek" className="w-full rounded-xl">
                      <SelectValue placeholder={t("selectWorkingWeek")} />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[100] rounded-xl">
                      <SelectGroup>
                        {dayOfWeeks?.data?.map((dow: DayOfWeek) => (
                          <SelectItem key={dow.id} value={dow.id.toString()} className="text-xs">
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
              <DialogFooter className="mt-8 gap-2">
                <DialogClose asChild>
                  <Button variant="outline" className="rounded-xl">{tc("cancel")}</Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={!selectedEmployee || !selectedDayOfWeek || createMutation.isPending}
                  className="rounded-xl font-bold px-6"
                >
                  {createMutation.isPending
                    ? (isEditing ? "Updating..." : t("assigning"))
                    : (isEditing ? "Update Profile" : t("assign"))}
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
          <Badge variant="outline" className="rounded-full text-xs bg-muted/50 border-border/60">
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
              <table className="w-full min-w-[1320px] text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3.5 pl-6 pr-3 min-w-[220px]">{t("employeeLabel")}</th>
                    <th className="py-3.5 px-3 min-w-[160px]">{t("weekLabel")}</th>
                    {days.map((day) => (
                      <th
                        key={day.key}
                        className={`py-3.5 px-3 text-center min-w-[115px] whitespace-nowrap ${
                          isWeekend(day.key) ? "text-amber-600/90 dark:text-amber-400/90" : ""
                        }`}
                      >
                        <span className="block">{day.label}</span>
                        <span className="block text-[10px] font-normal normal-case text-muted-foreground/60">
                          {day.short}
                        </span>
                      </th>
                    ))}
                    <th className="py-3.5 px-3 text-center min-w-[170px] whitespace-nowrap">{t("onlineAttendance")}</th>
                    <th className="py-3.5 pl-3 pr-6 text-right min-w-[110px]">{tc("actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {profiles?.data?.map((profile: EmployeeWorkingProfile) => (
                    <tr
                      key={profile.id}
                      className="group transition-colors hover:bg-muted/25"
                    >
                      {/* ── Employee ── */}
                      <td className="py-3.5 pl-6 pr-3 align-middle">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm shrink-0">
                            <AvatarImage
                              src={
                                profile.employee?.profile_path
                                  ? `${process.env.NEXT_PUBLIC_API_URL}${profile.employee.profile_path}`
                                  : undefined
                              }
                              alt={`${profile.employee?.first_name} ${profile.employee?.last_name}`}
                            />
                            <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
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
                      <td className="py-3.5 px-3 align-middle">
                        <Badge
                          variant="outline"
                          className="rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40 whitespace-nowrap"
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
                          <td key={key} className="py-3.5 px-3 text-center align-middle">
                            {hasSchedule ? (
                              <div className="inline-flex flex-col items-center gap-0.5">
                                <span className="text-xs font-medium leading-tight whitespace-nowrap">
                                  {timeSheet!.name}
                                </span>
                                {timeIn && timeOut && (
                                  <span className="inline-flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground whitespace-nowrap">
                                    <Clock className="size-3 text-slate-400 dark:text-slate-500 shrink-0" />
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
                      <td className="py-3.5 px-3 text-center align-middle">
                        {profile.allow_online_bypass_location ? (
                          <Badge className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 shadow-none whitespace-nowrap">
                            <MapPinOff className="mr-1 size-3 text-emerald-500 shrink-0" />
                            {t("noLocation")}
                          </Badge>
                        ) : (
                          <Badge className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-none whitespace-nowrap">
                            <MapPin className="mr-1 size-3 text-slate-400 shrink-0" />
                            {t("locationRequired")}
                          </Badge>
                        )}
                      </td>

                      {/* ── Actions ── */}
                      <td className="py-3.5 pl-3 pr-6 text-right align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setIsEditing(true);
                              setSelectedEmployee(profile.employee_id.toString());
                              setSelectedDayOfWeek(profile.day_of_week_id.toString());
                              setAllowBypassLocation(
                                profile.allow_online_bypass_location ?? false
                              );
                              setOpen(true);
                            }}
                            className="size-8 rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                            title={tc("edit")}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setProfileToDelete(profile);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="size-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                            title={tc("delete")}
                          >
                            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{tc("confirmDelete")}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to remove the working schedule for <strong className="text-foreground">{profileToDelete?.employee?.first_name} {profileToDelete?.employee?.last_name}</strong>? They will no longer have an assigned shift.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="rounded-xl"
              disabled={deleteMutation.isPending}
            >
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              type="button"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="rounded-xl"
            >
              {deleteMutation.isPending ? tc("deleting") : tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
