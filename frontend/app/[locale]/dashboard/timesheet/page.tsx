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
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  getAllTimeSheets,
  createTimeSheet,
  updateTimeSheet,
  deleteTimeSheet,
  type TimeSheet
} from "@/services/timesheet.services";

const generateTimeOptions = () => {
  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = h.toString().padStart(2, "0");
      const minute = m.toString().padStart(2, "0");
      times.push(`${hour}:${minute}`);
    }
  }
  return times;
};

const TimeSelect = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  // Extract just HH:mm if backend returns seconds
  const displayValue = value ? value.substring(0, 5) : "";

  return (
    <Select value={displayValue} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="--:--" />
      </SelectTrigger>
      <SelectContent className="max-h-[280px]">
        {generateTimeOptions().map((time) => (
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export const TimeSheetPage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const t = useTranslations("timesheet");
  const tc = useTranslations("common");

  const [formData, setFormData] = React.useState({
    name: "",
    code: "",
    time_in: "",
    time_out: "",
    lunch_out: "",
    lunch_in: "",
    require_time_in: true,
    require_lunch_out: false,
    require_lunch_in: false,
    require_time_out: true,
  });

  const { data: timeSheets, isLoading } = useQuery({
    queryKey: ["timesheets"],
    queryFn: () => getAllTimeSheets(1, 100),
  });

  const createMutation = useMutation({
    mutationFn: createTimeSheet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      toast.success(t("created"));
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t("createFailed"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTimeSheet(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      toast.success(t("updated"));
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t("updateFailed"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTimeSheet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
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
      time_in: "",
      time_out: "",
      lunch_out: "",
      lunch_in: "",
      require_time_in: true,
      require_lunch_out: false,
      require_lunch_in: false,
      require_time_out: true,
    });
    setEditingId(null);
  };

  const handleEdit = (ts: TimeSheet) => {
    setFormData({
      name: ts.name,
      code: ts.code,
      time_in: ts.time_in || "",
      time_out: ts.time_out || "",
      lunch_out: ts.lunch_out || "",
      lunch_in: ts.lunch_in || "",
      require_time_in: ts.require_time_in ?? true,
      require_lunch_out: ts.require_lunch_out ?? false,
      require_lunch_in: ts.require_lunch_in ?? false,
      require_time_out: ts.require_time_out ?? true,
    });
    setEditingId(ts.id.toString());
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

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
              {t("addSchedule")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {editingId ? t("editSchedule") : t("addNewSchedule")}
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
                <div className="col-span-1 space-y-2">
                  <Label htmlFor="time_in">{t("timeIn")}</Label>
                  <TimeSelect
                    value={formData.time_in}
                    onChange={(val) => setFormData({ ...formData, time_in: val })}
                  />
                </div>
                <div className="col-span-1 space-y-2">
                  <Label htmlFor="time_out">{t("timeOut")}</Label>
                  <TimeSelect
                    value={formData.time_out}
                    onChange={(val) => setFormData({ ...formData, time_out: val })}
                  />
                </div>
                <div className="col-span-1 space-y-2">
                  <Label htmlFor="lunch_out">{t("lunchOut")}</Label>
                  <TimeSelect
                    value={formData.lunch_out}
                    onChange={(val) => setFormData({ ...formData, lunch_out: val })}
                  />
                </div>
                <div className="col-span-1 space-y-2">
                  <Label htmlFor="lunch_in">{t("lunchIn")}</Label>
                  <TimeSelect
                    value={formData.lunch_in}
                    onChange={(val) => setFormData({ ...formData, lunch_in: val })}
                  />
                </div>
              </div>
              <div className="mt-6 space-y-4">
                <h4 className="font-semibold">{t("requireAttendance")}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label>{t("timeIn")}</Label>
                    <input
                      type="checkbox"
                      checked={formData.require_time_in}
                      onChange={(e) => setFormData({ ...formData, require_time_in: e.target.checked })}
                      className="h-4 w-4"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{t("lunchOut")}</Label>
                    <input
                      type="checkbox"
                      checked={formData.require_lunch_out}
                      onChange={(e) => setFormData({ ...formData, require_lunch_out: e.target.checked })}
                      className="h-4 w-4"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{t("lunchIn")}</Label>
                    <input
                      type="checkbox"
                      checked={formData.require_lunch_in}
                      onChange={(e) => setFormData({ ...formData, require_lunch_in: e.target.checked })}
                      className="h-4 w-4"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{t("timeOut")}</Label>
                    <input
                      type="checkbox"
                      checked={formData.require_time_out}
                      onChange={(e) => setFormData({ ...formData, require_time_out: e.target.checked })}
                      className="h-4 w-4"
                    />
                  </div>
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
          <CardTitle>{t("scheduleList")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">{tc("loading")}</div>
          ) : timeSheets?.data?.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">{t("noSchedules")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead>
                  <tr className="border-b border-white/35 text-left text-muted-foreground">
                    <th className="py-3 px-2">{t("nameLabel")}</th>
                    <th className="py-3 px-2">{t("codeLabel")}</th>
                    <th className="py-3 px-2">{t("timeIn")}</th>
                    <th className="py-3 px-2">{t("lunchOut")}</th>
                    <th className="py-3 px-2">{t("lunchIn")}</th>
                    <th className="py-3 px-2">{t("timeOut")}</th>
                    <th className="py-3 px-2">{t("required")}</th>
                    <th className="py-3 px-2 text-right">{tc("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {timeSheets?.data?.map((ts: TimeSheet) => (
                    <tr key={ts.id} className="border-b border-white/30">
                      <td className="py-3 px-2 font-semibold">{ts.name}</td>
                      <td className="py-3 px-2 text-muted-foreground">{ts.code}</td>
                      <td className="py-3 px-2">{ts.time_in || "-"}</td>
                      <td className="py-3 px-2">{ts.lunch_out || "-"}</td>
                      <td className="py-3 px-2">{ts.lunch_in || "-"}</td>
                      <td className="py-3 px-2">{ts.time_out || "-"}</td>
                      <td className="py-3 px-2">
                        <div className="flex flex-wrap gap-1">
                          {ts.require_time_in && <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">{t("timeIn")}</span>}
                          {ts.require_lunch_out && <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">{t("lunchOut")}</span>}
                          {ts.require_lunch_in && <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">{t("lunchIn")}</span>}
                          {ts.require_time_out && <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">{t("timeOut")}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(ts)} className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(ts.id.toString())}
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

const TimeSheetRedirectPage = () => {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/dashboard/time-attendance/setup");
  }, [router]);
  
  return null;
};

export default TimeSheetRedirectPage;
