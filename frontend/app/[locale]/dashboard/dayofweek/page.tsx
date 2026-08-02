"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";

import { Plus, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  getAllDayOfWeeks,
  createDayOfWeek,
  updateDayOfWeek,
  deleteDayOfWeek,
  type DayOfWeek
} from "@/services/dayofweek.services";
import { getAllTimeSheets, type TimeSheet } from "@/services/timesheet.services";

export const DayOfWeekPage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const t = useTranslations("dayofweek");
  const tc = useTranslations("common");

  const [formData, setFormData] = React.useState({
    name: "",
    code: "",
    is_default: false,
    monday_id: "none",
    tuesday_id: "none",
    wednesday_id: "none",
    thursday_id: "none",
    friday_id: "none",
    saturday_id: "none",
    sunday_id: "none",
  });

  const { data: dayOfWeeks, isLoading } = useQuery({
    queryKey: ["dayofweeks"],
    queryFn: () => getAllDayOfWeeks(1, 100),
  });

  const { data: timeSheets } = useQuery({
    queryKey: ["timesheets"],
    queryFn: () => getAllTimeSheets(1, 100),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createDayOfWeek({
      ...data,
      monday_id: data.monday_id === "none" ? null : Number(data.monday_id),
      tuesday_id: data.tuesday_id === "none" ? null : Number(data.tuesday_id),
      wednesday_id: data.wednesday_id === "none" ? null : Number(data.wednesday_id),
      thursday_id: data.thursday_id === "none" ? null : Number(data.thursday_id),
      friday_id: data.friday_id === "none" ? null : Number(data.friday_id),
      saturday_id: data.saturday_id === "none" ? null : Number(data.saturday_id),
      sunday_id: data.sunday_id === "none" ? null : Number(data.sunday_id),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dayofweeks"] });
      toast.success(t("created"));
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t("createFailed"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateDayOfWeek(id, {
      ...data,
      monday_id: data.monday_id === "none" ? null : Number(data.monday_id),
      tuesday_id: data.tuesday_id === "none" ? null : Number(data.tuesday_id),
      wednesday_id: data.wednesday_id === "none" ? null : Number(data.wednesday_id),
      thursday_id: data.thursday_id === "none" ? null : Number(data.thursday_id),
      friday_id: data.friday_id === "none" ? null : Number(data.friday_id),
      saturday_id: data.saturday_id === "none" ? null : Number(data.saturday_id),
      sunday_id: data.sunday_id === "none" ? null : Number(data.sunday_id),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dayofweeks"] });
      toast.success(t("updated"));
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t("updateFailed"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDayOfWeek,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dayofweeks"] });
      toast.success(t("deleted"));
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t("deleteFailed"));
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      is_default: false,
      monday_id: "none",
      tuesday_id: "none",
      wednesday_id: "none",
      thursday_id: "none",
      friday_id: "none",
      saturday_id: "none",
      sunday_id: "none",
    });
    setEditingId(null);
  };

  const handleEdit = (dow: DayOfWeek) => {
    setFormData({
      name: dow.name,
      code: dow.code,
      is_default: dow.is_default ?? false,
      monday_id: dow.monday_id?.toString() || "none",
      tuesday_id: dow.tuesday_id?.toString() || "none",
      wednesday_id: dow.wednesday_id?.toString() || "none",
      thursday_id: dow.thursday_id?.toString() || "none",
      friday_id: dow.friday_id?.toString() || "none",
      saturday_id: dow.saturday_id?.toString() || "none",
      sunday_id: dow.sunday_id?.toString() || "none",
    });
    setEditingId(dow.id.toString());
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = { ...formData };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const getTimeSheetName = (tsId: number | undefined | null) => {
    if (!tsId) return t("none");
    const ts = timeSheets?.data?.find((item: TimeSheet) => item.id === tsId);
    return ts?.name || t("none");
  };

  const days = [
    { key: "Monday", label: t("monday") },
    { key: "Tuesday", label: t("tuesday") },
    { key: "Wednesday", label: t("wednesday") },
    { key: "Thursday", label: t("thursday") },
    { key: "Friday", label: t("friday") },
    { key: "Saturday", label: t("saturday") },
    { key: "Sunday", label: t("sunday") },
  ] as const;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t("title")}</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className="rounded-2xl gap-2 h-11 px-6 shadow-lg shadow-primary/20"
              onClick={resetForm}
            >
              <Plus className="size-4" />
              {t("addSetup")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {editingId ? t("editSetup") : t("addNewSetup")}
                </DialogTitle>
                <DialogDescription>
                  {editingId ? t("editDesc") : t("addDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="col-span-1 space-y-2">
                  <Label htmlFor="name">{t("nameLabel")}</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="col-span-1 space-y-2">
                  <Label htmlFor="code">{t("codeLabel")}</Label>
                  <Input
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label>{t("setDefault")}</Label>
              </div>
              <div className="mt-6 space-y-4">
                <h4 className="font-semibold">{t("assignSchedule")}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {days.map((day) => {
                    const fieldName = `${day.key.toLowerCase()}_id` as keyof typeof formData;
                    return (
                      <div key={day.key} className="space-y-2">
                        <Label htmlFor={fieldName}>{day.label}</Label>
                        <Select
                          value={formData[fieldName] as string}
                          onValueChange={(v) => setFormData({ ...formData, [fieldName]: v })}
                        >
                          <SelectTrigger id={fieldName} className="w-full">
                            <SelectValue placeholder={t("selectSchedule")} />
                          </SelectTrigger>
                          <SelectContent position="popper" className="z-[100]">
                            <SelectGroup>
                              <SelectItem value="none">{t("none")}</SelectItem>
                              {timeSheets?.data?.map((ts: TimeSheet) => (
                                <SelectItem key={ts.id} value={ts.id.toString()}>
                                  {ts.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
              <DialogFooter className="mt-8">
                <DialogClose asChild>
                  <Button variant="outline">{tc("cancel")}</Button>
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending ? tc("saving") : tc("save")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("setupList")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">{tc("loading")}</div>
          ) : dayOfWeeks?.data?.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">{t("noSetups")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead>
                  <tr className="border-b border-white/35 text-left text-muted-foreground">
                    <th className="py-3 px-2">{t("nameLabel")}</th>
                    <th className="py-3 px-2">{t("codeLabel")}</th>
                    <th className="py-3 px-2">{t("defaultCol")}</th>
                    {days.map((day) => (
                      <th key={day.key} className="py-3 px-2">{day.label}</th>
                    ))}
                    <th className="py-3 px-2 text-right">{tc("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {dayOfWeeks?.data?.map((dow: DayOfWeek) => (
                    <tr key={dow.id} className="border-b border-white/30">
                      <td className="py-3 px-2 font-semibold">{dow.name}</td>
                      <td className="py-3 px-2 text-muted-foreground">{dow.code}</td>
                      <td className="py-3 px-2">
                        {dow.is_default ? (
                          <span className="text-emerald-600 font-medium">{t("yes")}</span>
                        ) : (
                          <span className="text-muted-foreground">{t("no")}</span>
                        )}
                      </td>
                      {days.map((day) => (
                        <td key={day.key} className="py-3 px-2 text-muted-foreground">
                          {getTimeSheetName(dow[`${day.key.toLowerCase()}_id` as keyof DayOfWeek] as number | undefined)}
                        </td>
                      ))}
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(dow)} className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(dow.id.toString())}
                            className="h-8 w-8 text-red-500"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
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
    </div>
  );
};

// Redirect component
import { useEffect } from "react";
import { useRouter } from "@/src/i18n/routing";

const DayOfWeekRedirectPage = () => {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/dashboard/time-attendance/setup");
  }, [router]);
  
  return null;
};

export default DayOfWeekRedirectPage;
