"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useTimeModes } from "@/hooks/useTimeMode";
import {
  createTimeMode,
  updateTimeMode,
  deleteTimeMode,
  TimeModeData,
} from "@/services/timemode.services";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  Check,
  Loader2,
  X,
  MessageSquare,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

export default function TimeModePage() {
  const t = useTranslations("timemode");
  const tc = useTranslations("common");
  const queryClient = useQueryClient();
  const { data: timeModesRes, isLoading, isError } = useTimeModes();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedTimeMode, setSelectedTimeMode] = useState<TimeModeData | null>(null);
  
  const [form, setForm] = useState({
    name: "",
    remark: "",
  });

  const timeModes = timeModesRes?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: { name: string; remark?: string }) => createTimeMode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeModes"] });
      toast.success(t("created"));
      setIsFormDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t("createFailed"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; remark?: string } }) =>
      updateTimeMode(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeModes"] });
      toast.success(t("updated"));
      setIsFormDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t("updateFailed"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTimeMode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeModes"] });
      toast.success(t("deleted"));
      setIsDeleteConfirmOpen(false);
      setSelectedTimeMode(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t("deleteFailed"));
    },
  });

  // Helpers
  const resetForm = () => {
    setSelectedTimeMode(null);
    setForm({ name: "", remark: "" });
  };

  const handleEditClick = (mode: TimeModeData) => {
    setSelectedTimeMode(mode);
    setForm({
      name: mode.name,
      remark: mode.remark || "",
    });
    setIsFormDialogOpen(true);
  };

  const handleDeleteClick = (mode: TimeModeData) => {
    setSelectedTimeMode(mode);
    setIsDeleteConfirmOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.warning(t("enterName"));
      return;
    }

    const payload = {
      name: form.name.trim(),
      remark: form.remark.trim() || undefined,
    };

    if (selectedTimeMode && selectedTimeMode.id) {
      updateMutation.mutate({ id: selectedTimeMode.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isLoading) return <LoadingState variant="table" count={4} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("subtitle")}
          </p>
        </div>
        <Button
          className="rounded-2xl gap-2 h-11 px-6 shadow-lg shadow-primary/20 bg-primary text-white"
          onClick={() => {
            resetForm();
            setIsFormDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          {t("addTimeMode")}
        </Button>
      </div>

      <Card className="border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl rounded-3xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-gray-800">{t("timeModeList")}</CardTitle>
          <CardDescription>
            {t("timeModeListDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-left text-gray-600 font-semibold">
                  <th className="px-6 py-4">{t("modeName")}</th>
                  <th className="px-6 py-4">{t("remarkLabel")}</th>
                  <th className="px-6 py-4">{tc("status")}</th>
                  <th className="px-6 py-4 text-right">{tc("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {timeModes.map((mode: TimeModeData) => (
                  <tr key={mode.id} className="border-b border-gray-50 hover:bg-gray-50/50 last:border-0 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-primary/5 text-primary flex items-center justify-center">
                        <Clock size={16} />
                      </div>
                      {mode.name}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {mode.remark || <span className="text-muted-foreground/30 text-xs italic">{t("noDescription")}</span>}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100 font-semibold px-2.5 py-0.5">
                        {tc("active")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(mode)}
                        className="h-8 w-8 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(mode)}
                        className="h-8 w-8 rounded-xl hover:bg-rose-50 text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
                {timeModes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="h-36 text-center text-muted-foreground italic">
                      <div className="flex flex-col items-center justify-center space-y-2 py-6">
                        <Clock size={24} className="text-muted-foreground/20 animate-pulse" />
                        <span>{t("noTimeModes")}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Form Dialog */}
      <Dialog
        open={isFormDialogOpen}
        onOpenChange={(open) => {
          setIsFormDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md border-white/60 bg-white/95 shadow-2xl backdrop-blur-xl rounded-3xl">
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Clock className="size-5 text-primary" />
                {selectedTimeMode ? t("editTimeMode") : t("addTimeModeTitle")}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {t("formDesc")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="mode-name" className="text-sm font-bold text-gray-700">
                  {t("modeName")} <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="mode-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("namePlaceholder")}
                  required
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mode-remark" className="text-sm font-bold text-gray-700">
                  {t("remarkLabel")}
                </Label>
                <Input
                  id="mode-remark"
                  value={form.remark}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                  placeholder={t("remarkPlaceholder")}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="rounded-2xl">
                  {tc("cancel")}
                </Button>
              </DialogClose>
              <Button
                type="submit"
                className="rounded-2xl gap-2 shadow-lg shadow-primary/10 px-6 bg-primary text-white"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {tc("saving")}
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    {tc("save")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteConfirmOpen}
        onOpenChange={(open) => {
          setIsDeleteConfirmOpen(open);
          if (!open) setSelectedTimeMode(null);
        }}
      >
        <DialogContent className="sm:max-w-sm border-white/60 bg-white/95 shadow-2xl backdrop-blur-xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold text-rose-600">
              <Trash2 className="size-5 text-rose-500" />
              {t("deleteTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {t("deleteDesc", { name: selectedTimeMode?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-2xl">
                {tc("cancel")}
              </Button>
            </DialogClose>
            <Button
              onClick={() => selectedTimeMode?.id && deleteMutation.mutate(selectedTimeMode.id)}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-2xl"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t("deleteBtn")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
