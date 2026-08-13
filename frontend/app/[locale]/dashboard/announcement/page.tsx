"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { getDepartments } from "@/services/department.services";
import { getAllEmployees } from "@/services/employee.services";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Megaphone,
  CalendarIcon,
  Trash2,
  Users,
  Loader2,
  Plus,
  Bell,
  Check,
  Search,
  X,
  Eye,
  Pencil,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// ─── Reusable "Create / Edit" form ────────────────────────────────────────────
function AnnouncementForm({
  initial,
  departments,
  employees,
  onSubmit,
  isPending,
  mode,
}: {
  initial?: any;
  departments: any[];
  employees: any[];
  onSubmit: (fd: FormData) => void;
  isPending: boolean;
  mode: "create" | "edit";
}) {
  const t = useTranslations("announcement");
  const tCommon = useTranslations("common");

  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.announcement ?? "");
  const [selectedDates, setSelectedDates] = useState<Date[]>(() => {
    try {
      const raw = initial?.dates;
      const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Array.isArray(arr) ? arr.map((d: string) => new Date(d)) : [];
    } catch { return []; }
  });
  const [selectedEmpIds, setSelectedEmpIds] = useState<number[]>(() => {
    try {
      const raw = initial?.target_employee_ids;
      const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Array.isArray(arr) ? arr.map(Number) : [];
    } catch { return []; }
  });
  const [selectedDeptIds, setSelectedDeptIds] = useState<number[]>(() => {
    try {
      const raw = initial?.target_employee_ids;
      const empIds = (typeof raw === "string" ? JSON.parse(raw) : raw) || [];
      const numericEmpIds = empIds.map(Number);
      if (numericEmpIds.length === 0) return [];
      
      const activeDepts = departments.filter((dept: any) => {
        const deptEmpIds = employees
          .filter((emp: any) => emp.department_id === dept.id && emp.is_active === "active")
          .map((emp: any) => emp.id);
        return deptEmpIds.length > 0 && deptEmpIds.every((id) => numericEmpIds.includes(id));
      });
      return activeDepts.map((d: any) => d.id);
    } catch {
      return [];
    }
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const filteredEmployees = employees.filter((emp: any) => {
    const q = searchQuery.toLowerCase();
    const fullName = `${emp.first_name || ""} ${emp.last_name || ""}`.toLowerCase();
    const username = (emp.telegram_username || "").toLowerCase();
    const dept = departments.find((d: any) => d.id === emp.department_id);
    return fullName.includes(q) || username.includes(q) || (dept?.name || "").toLowerCase().includes(q);
  });

  const handleDeptToggle = (deptId: number, checked: boolean) => {
    setSelectedDeptIds((prev) => checked ? [...prev, deptId] : prev.filter((id) => id !== deptId));
    const deptEmpIds = employees.filter((e: any) => e.department_id === deptId).map((e: any) => e.id);
    setSelectedEmpIds((prev) =>
      checked ? Array.from(new Set([...prev, ...deptEmpIds])) : prev.filter((id) => !deptEmpIds.includes(id))
    );
  };

  const handleEmpToggle = (empId: number, checked: boolean) => {
    setSelectedEmpIds((prev) => checked ? [...prev, empId] : prev.filter((id) => id !== empId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error(t("fillBothTitleAndContent"));
      return;
    }
    const dateStrings = selectedDates.map((d) => format(d, "yyyy-MM-dd"));
    const fd = new FormData();
    fd.append("title", title);
    fd.append("announcement", content);
    if (dateStrings.length > 0) fd.append("dates", JSON.stringify(dateStrings));
    if (selectedEmpIds.length > 0) fd.append("target_employee_ids", JSON.stringify(selectedEmpIds));
    if (selectedImage) fd.append("image", selectedImage);
    onSubmit(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 mt-4">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">{t("formTitle")}</label>
        <Input required placeholder={t("formTitlePlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-2xl border-white/60 bg-white/70 shadow-sm" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">{t("formContent")}</label>
        <Textarea required placeholder={t("formContentPlaceholder")} rows={4} value={content} onChange={(e) => setContent(e.target.value)} className="rounded-2xl border-white/60 bg-white/70 shadow-sm" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">{t("formImage")} {mode === "edit" ? t("leaveEmptyKeep") : t("optional")}</label>
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => setSelectedImage(e.target.files?.[0] ?? null)}
          className="rounded-2xl border-white/60 bg-white/70 shadow-sm"
        />
        {mode === "edit" && initial?.image_path && !selectedImage && (
          <div className="h-20 w-32 rounded-xl overflow-hidden border border-gray-100 mt-1">
            <img src={`${API_BASE}${initial.image_path}`} alt="current" className="h-full w-full object-cover" />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" /> {t("targetDates")}
        </label>
        <div className="flex flex-wrap gap-2 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className={cn("h-10 justify-start text-left font-normal rounded-xl border-gray-200 bg-white/70 w-full md:w-[260px] flex items-center gap-2", selectedDates.length === 0 && "text-muted-foreground")}>
                <CalendarIcon className="h-4 w-4 shrink-0 text-gray-400" />
                {selectedDates.length > 0 ? <span>{t("datesSelected", { count: selectedDates.length })}</span> : <span>{t("selectDates")}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-3xl bg-white shadow-xl border border-gray-100" align="start">
              <Calendar mode="multiple" selected={selectedDates} onSelect={(dates) => setSelectedDates(dates || [])} className="rounded-2xl p-3" />
            </PopoverContent>
          </Popover>
          {selectedDates.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedDates([])} className="h-8 rounded-full text-xs text-muted-foreground hover:text-red-500 flex items-center gap-1 cursor-pointer">
              <X className="h-3 w-3" /> {t("clear")}
            </Button>
          )}
        </div>
        {selectedDates.length > 0 && (
          <div className="flex flex-wrap gap-1.5 bg-gray-50/50 p-2 rounded-xl border border-gray-100 max-h-20 overflow-y-auto">
            {selectedDates.map((date, idx) => (
              <Badge key={idx} variant="secondary" className="rounded-full bg-primary/5 text-primary border-primary/10 pl-2.5 pr-1.5 py-0.5 flex items-center gap-1 text-xs">
                {format(date, "MMM dd, yyyy")}
                <button type="button" onClick={() => setSelectedDates(selectedDates.filter((_, i) => i !== idx))} className="hover:bg-primary/20 rounded-full p-0.5 cursor-pointer"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> {t("targetDepartments")}
        </label>
        <div className="flex flex-wrap gap-2 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
          {departments.map((dept: any) => {
            const isSelected = selectedDeptIds.includes(dept.id);
            return (
              <button type="button" key={dept.id} onClick={() => handleDeptToggle(dept.id, !isSelected)} className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 select-none", isSelected ? "bg-primary border-primary text-primary-foreground" : "bg-white border-gray-200 hover:border-primary/40 hover:bg-primary/5 text-gray-600")}>
                {isSelected && <Check className="h-3 w-3" />}{dept.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> {t("targetMembers")}
          </label>
          <span className="text-xs text-muted-foreground font-medium">
            {selectedEmpIds.length === 0 ? t("allEmployees") : t("membersSelected", { count: selectedEmpIds.length })}
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input placeholder={t("searchEmployees")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-9 rounded-xl border-gray-200/80 bg-white/70 text-sm" />
          {searchQuery && <button type="button" onClick={() => setSearchQuery("")} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => { setSelectedEmpIds(employees.map((e: any) => e.id)); setSelectedDeptIds(departments.map((d: any) => d.id)); }} className="h-8 text-[11px] rounded-lg cursor-pointer">{t("selectAll")}</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => { setSelectedEmpIds([]); setSelectedDeptIds([]); }} className="h-8 text-[11px] rounded-lg cursor-pointer hover:text-red-500">{t("clearAll")}</Button>
        </div>
        <div className="max-h-48 overflow-y-auto p-2 border border-gray-100 bg-gray-50/30 rounded-xl custom-scrollbar space-y-1">
          {filteredEmployees.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">{t("noEmployeesFound")}</div>
          ) : filteredEmployees.map((emp: any) => {
            const isChecked = selectedEmpIds.includes(emp.id);
            const dept = departments.find((d: any) => d.id === emp.department_id);
            const monogram = `${emp.first_name?.[0] || ""}${emp.last_name?.[0] || ""}`.toUpperCase();
            return (
              <div key={emp.id} onClick={() => handleEmpToggle(emp.id, !isChecked)} className={cn("flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none", isChecked ? "bg-primary/5 border-primary/20 text-primary" : "bg-white border-transparent hover:bg-gray-50 text-gray-800")}>
                <div className="flex items-center space-x-2.5">
                  <div className={cn("h-5 w-5 rounded-md border flex items-center justify-center", isChecked ? "bg-primary border-primary text-primary-foreground" : "border-gray-300 bg-white")}>
                    {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                  <div className={cn("h-6 w-6 rounded-full text-[10px] font-bold flex items-center justify-center border shrink-0", isChecked ? "bg-primary/20 text-primary border-primary/25" : "bg-gray-100 text-gray-500 border-gray-200")}>{monogram}</div>
                  <span className="text-sm font-medium">{emp.first_name} {emp.last_name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {dept && <Badge variant="outline" className="text-[10px] rounded-full px-2 py-0">{dept.name}</Badge>}
                  {emp.telegram_username && <Badge variant="secondary" className="text-[10px] rounded-full px-2 py-0">@{emp.telegram_username.replace(/^@+/, "")}</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/95 flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer shadow-md">
        {isPending ? (<><Loader2 className="h-4 w-4 animate-spin" />{mode === "create" ? t("creating") : t("saving")}</>) : (<><Megaphone className="h-4 w-4" />{mode === "create" ? t("createAndPush") : t("saveChanges")}</>)}
      </Button>
    </form>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AnnouncementPage() {
  const t = useTranslations("announcement");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editAnn, setEditAnn] = useState<any | null>(null);
  const [viewAnn, setViewAnn] = useState<any | null>(null);
  const [tableSearch, setTableSearch] = useState("");

  const { data: deptRes, isLoading: isLoadingDepts } = useQuery({
    queryKey: ["announcement-departments"],
    queryFn: () => getDepartments(1, 1, 100),
  });
  const departments = deptRes?.data || [];

  const { data: empRes, isLoading: isLoadingEmps } = useQuery({
    queryKey: ["announcement-employees"],
    queryFn: () => getAllEmployees(1, 1000),
  });
  const employees = empRes?.data?.rows || empRes?.data || [];

  const { data: annRes, isLoading: isLoadingAnns } = useQuery({
    queryKey: ["announcements-list"],
    queryFn: async () => {
      const res = await api.get("/api/announcement");
      return res.data;
    },
  });
  const announcements = annRes?.data || [];

  const createMutation = useMutation({
    mutationFn: async (fd: FormData) => {
      const res = await api.post("/api/announcement", fd, { headers: { "Content-Type": "multipart/form-data" } });
      return res.data;
    },
    onSuccess: () => {
      toast.success(t("toastCreated"));
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["announcements-list"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || t("toastCreateFailed")),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, fd }: { id: number; fd: FormData }) => {
      const res = await api.put(`/api/announcement/${id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      return res.data;
    },
    onSuccess: () => {
      toast.success(t("toastUpdated"));
      setEditAnn(null);
      queryClient.invalidateQueries({ queryKey: ["announcements-list"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || t("toastUpdateFailed")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/api/announcement/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success(t("toastDeleted"));
      queryClient.invalidateQueries({ queryKey: ["announcements-list"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || t("toastDeleteFailed")),
  });

  const isLoading = isLoadingDepts || isLoadingEmps || isLoadingAnns;
  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredAnnouncements = announcements.filter((ann: any) =>
    ann.title?.toLowerCase().includes(tableSearch.toLowerCase()) ||
    ann.announcement?.toLowerCase().includes(tableSearch.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-primary animate-bounce" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("subtitle")}
          </p>
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 rounded-2xl bg-primary px-5 text-primary-foreground hover:bg-primary/95 flex items-center gap-2 cursor-pointer shadow-lg transition-transform hover:scale-[1.02]">
              <Plus className="h-4.5 w-4.5" /> {t("newAnnouncement")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 custom-scrollbar bg-white/95 backdrop-blur-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" /> {t("createAnnouncement")}
              </DialogTitle>
            </DialogHeader>
            <AnnouncementForm
              departments={departments}
              employees={employees}
              onSubmit={(fd) => createMutation.mutate(fd)}
              isPending={createMutation.isPending}
              mode="create"
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editAnn} onOpenChange={(open) => { if (!open) setEditAnn(null); }}>
        <DialogContent className="sm:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 custom-scrollbar bg-white/95 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" /> {t("editAnnouncement")}
            </DialogTitle>
          </DialogHeader>
          {editAnn && (
            <AnnouncementForm
              key={editAnn.id}
              initial={editAnn}
              departments={departments}
              employees={employees}
              onSubmit={(fd) => updateMutation.mutate({ id: editAnn.id, fd })}
              isPending={updateMutation.isPending}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Announcement Logs — Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" /> {t("announcementLogs")}
          </h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl text-sm border-gray-200 bg-white/70"
            />
            {tableSearch && (
              <button onClick={() => setTableSearch("")} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {filteredAnnouncements.length === 0 ? (
          <Card className="border-dashed border-gray-200 bg-white/40 p-12 text-center rounded-3xl shadow-sm">
            <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base text-gray-500 font-medium">{t("noAnnouncementsFound")}</p>
            <p className="text-xs text-gray-400 mt-1">{t("noAnnouncementsDesc")}</p>
          </Card>
        ) : (
          <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide w-10">#</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{t("formTitle")}</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide hidden md:table-cell">{t("view")}</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide hidden lg:table-cell">{t("targetMembers")}</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide hidden lg:table-cell">{t("createdOn", { date: "" }).trim()}</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{tCommon("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnnouncements.map((ann: any, idx: number) => {
                  let parsedDates: string[] = [];
                  let parsedEmpIds: number[] = [];
                  try {
                    parsedDates = typeof ann.dates === "string" ? JSON.parse(ann.dates) : ann.dates || [];
                    parsedEmpIds = typeof ann.target_employee_ids === "string" ? JSON.parse(ann.target_employee_ids) : ann.target_employee_ids || [];
                  } catch (_) {}

                  const isPublic = !(Array.isArray(parsedEmpIds) && parsedEmpIds.length > 0);
                  const preview = ann.announcement?.length > 80 ? ann.announcement.slice(0, 80) + "…" : ann.announcement;

                  return (
                    <tr
                      key={ann.id}
                      onClick={() => setViewAnn({ ...ann, parsedDates, parsedEmpIds })}
                      className="border-b border-gray-50 last:border-0 hover:bg-primary/[0.025] transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3.5 text-xs text-gray-400 font-medium">{idx + 1}</td>
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <div className="flex items-center gap-2.5">
                          {ann.image_path ? (
                            <div className="h-9 w-9 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                              <img src={`${API_BASE}${ann.image_path}`} alt={ann.title} className="h-full w-full object-cover" />
                            </div>
                          ) : (
                            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Megaphone className="h-4 w-4" />
                            </div>
                          )}
                          <span className="font-semibold text-gray-900 group-hover:text-primary transition-colors line-clamp-1 text-sm">{ann.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-400 text-xs hidden md:table-cell max-w-xs">
                        <span className="line-clamp-2 leading-relaxed">{preview}</span>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        {isPublic ? (
                          <Badge variant="outline" className="text-[10px] font-bold text-green-600 border-green-200 bg-green-50 rounded-full">{t("public")}</Badge>
                        ) : (
                          <span className="text-xs text-gray-500">{t("membersCount", { count: parsedEmpIds.length })}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-400 hidden lg:table-cell whitespace-nowrap">
                        {ann.created_at ? format(new Date(ann.created_at), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewAnn({ ...ann, parsedDates, parsedEmpIds })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                            title={t("view")}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditAnn(ann)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors cursor-pointer"
                            title={t("edit")}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                disabled={deleteMutation.isPending}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                title={t("delete")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("deleteConfirmDesc")}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl font-medium">{t("cancel")}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(ann.id)}
                                  variant="destructive"
                                  className="rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white"
                                >
                                  {t("delete")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Detail Modal */}
      <Dialog open={!!viewAnn} onOpenChange={(open) => { if (!open) setViewAnn(null); }}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl custom-scrollbar bg-white p-6">
          {viewAnn && (
            <div className="space-y-5">
              {viewAnn.image_path && (
                <div className="w-full rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                  <img
                    src={`${API_BASE}${viewAnn.image_path}`}
                    alt={viewAnn.title}
                    className="w-full object-contain max-h-64"
                  />
                </div>
              )}

              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-900 flex items-start gap-2.5 leading-snug">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Megaphone className="h-4 w-4" />
                  </div>
                  {viewAnn.title}
                </DialogTitle>
              </DialogHeader>

              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {viewAnn.announcement}
              </p>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                {Array.isArray(viewAnn.parsedDates) && viewAnn.parsedDates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-xs font-bold text-gray-400 flex items-center gap-1 mr-1">
                      <CalendarIcon className="h-3 w-3" /> {t("targetDates")}:
                    </span>
                    {viewAnn.parsedDates.map((d: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px] rounded-full border-gray-200">{d}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-gray-500">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>{Array.isArray(viewAnn.parsedEmpIds) && viewAnn.parsedEmpIds.length > 0 ? t("sentToMembers", { count: viewAnn.parsedEmpIds.length }) : t("companyWideBroadcast")}</span>
                  </div>
                  {!(Array.isArray(viewAnn.parsedEmpIds) && viewAnn.parsedEmpIds.length > 0) && (
                    <Badge variant="outline" className="text-[9px] font-bold text-green-600 border-green-200 bg-green-50 rounded-full">{t("public")}</Badge>
                  )}
                </div>
                <div className="text-[11px] text-gray-400">
                  {t("createdOn", { date: viewAnn.created_at ? format(new Date(viewAnn.created_at), "PPP 'at' p") : "—" })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl mt-1 flex items-center gap-2"
                  onClick={() => { setEditAnn(viewAnn); setViewAnn(null); }}
                >
                  <Pencil className="h-3.5 w-3.5" /> {t("editThisAnnouncement")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
