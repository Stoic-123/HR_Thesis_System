"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDepartments } from "@/services/department.services";
import { getAllEmployees } from "@/services/employee.services";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Info,
  Check,
  Search,
  X,
  Filter,
} from "lucide-react";

export default function AnnouncementPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState<number[]>([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Fetch departments
  const { data: deptRes, isLoading: isLoadingDepts } = useQuery({
    queryKey: ["announcement-departments"],
    queryFn: () => getDepartments(1, 1, 100),
  });
  const departments = deptRes?.data || [];

  // 2. Fetch employees
  const { data: empRes, isLoading: isLoadingEmps } = useQuery({
    queryKey: ["announcement-employees"],
    queryFn: () => getAllEmployees(1, 1000),
  });
  const employees = empRes?.data?.rows || empRes?.data || [];

  // 3. Fetch previous announcements
  const { data: annRes, isLoading: isLoadingAnns } = useQuery({
    queryKey: ["announcements-list"],
    queryFn: async () => {
      const res = await api.get("/api/announcement");
      return res.data;
    },
  });
  const announcements = annRes?.data || [];

  // Mutation to create announcement
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/api/announcement", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Announcement created and notifications pushed successfully!");
      setTitle("");
      setContent("");
      setSelectedDates([]);
      setSelectedEmpIds([]);
      setSelectedDeptIds([]);
      setSearchQuery("");
      setIsCreateOpen(false); // Close dialog
      queryClient.invalidateQueries({ queryKey: ["announcements-list"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to create announcement.");
    },
  });

  // Mutation to delete announcement
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/api/announcement/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Announcement deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["announcements-list"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete announcement.");
    },
  });

  // Handle department checkbox click (Auto selects all employees in that department)
  const handleDepartmentToggle = (deptId: number, checked: boolean) => {
    let updatedDepts = [...selectedDeptIds];
    if (checked) {
      updatedDepts.push(deptId);
    } else {
      updatedDepts = updatedDepts.filter((id) => id !== deptId);
    }
    setSelectedDeptIds(updatedDepts);

    const deptEmpIds = employees
      .filter((emp: any) => emp.department_id === deptId)
      .map((emp: any) => emp.id);

    let updatedEmps = [...selectedEmpIds];
    if (checked) {
      updatedEmps = Array.from(new Set([...updatedEmps, ...deptEmpIds]));
    } else {
      updatedEmps = updatedEmps.filter((id) => !deptEmpIds.includes(id));
    }
    setSelectedEmpIds(updatedEmps);
  };

  // Handle individual employee toggle
  const handleEmployeeToggle = (empId: number, checked: boolean) => {
    if (checked) {
      setSelectedEmpIds((prev) => [...prev, empId]);
    } else {
      setSelectedEmpIds((prev) => prev.filter((id) => id !== empId));
    }
  };

  const filteredEmployees = employees.filter((emp: any) => {
    const fullName = `${emp.first_name || ""} ${emp.last_name || ""}`.toLowerCase();
    const username = (emp.telegram_username || "").toLowerCase();
    const dept = departments.find((d: any) => d.id === emp.department_id);
    const deptName = (dept?.name || "").toLowerCase();
    
    return (
      fullName.includes(searchQuery.toLowerCase()) ||
      username.includes(searchQuery.toLowerCase()) ||
      deptName.includes(searchQuery.toLowerCase())
    );
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in both title and announcement content.");
      return;
    }

    const dateStrings = selectedDates.map((d) => format(d, "yyyy-MM-dd"));
    
    const payload = {
      title,
      announcement: content,
      dates: dateStrings.length > 0 ? dateStrings : null,
      target_employee_ids: selectedEmpIds.length > 0 ? selectedEmpIds : null,
    };

    createMutation.mutate(payload);
  };

  const isLoading = isLoadingDepts || isLoadingEmps || isLoadingAnns;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Premium Header Block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-primary animate-bounce" />
            Announcements
          </h1>
          <p className="text-muted-foreground mt-1">
            Broadcast updates, company newsletters, and targeted notifications in real-time.
          </p>
        </div>

        {/* Small modal trigger button */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 rounded-2xl bg-primary px-5 text-primary-foreground hover:bg-primary/95 flex items-center gap-2 cursor-pointer shadow-lg transition-transform hover:scale-[1.02]">
              <Plus className="h-4.5 w-4.5" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 custom-scrollbar bg-white/95 backdrop-blur-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Create Announcement
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Title</label>
                <Input
                  required
                  placeholder="E.g. Company Retreat / Holiday Notice"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 rounded-2xl border-white/60 bg-white/70 shadow-sm"
                />
              </div>

              {/* Announcement Body */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Announcement Content</label>
                <Textarea
                  required
                  placeholder="Enter announcement details here..."
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="rounded-2xl border-white/60 bg-white/70 shadow-sm"
                />
              </div>

              {/* Calendar Date Picker */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  Target Dates (Optional)
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-11 justify-start text-left font-normal rounded-2xl border-white/60 bg-white/70 shadow-sm w-full md:w-[280px] flex items-center gap-2",
                          selectedDates.length === 0 && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="h-4 w-4 shrink-0 text-gray-400" />
                        {selectedDates.length > 0 ? (
                          <span>{selectedDates.length} date(s) selected</span>
                        ) : (
                          <span>Select multiple dates</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-3xl bg-white shadow-xl border border-gray-100" align="start">
                      <Calendar
                        mode="multiple"
                        selected={selectedDates}
                        onSelect={(dates) => setSelectedDates(dates || [])}
                        className="rounded-2xl p-3"
                      />
                    </PopoverContent>
                  </Popover>

                  {selectedDates.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDates([])}
                      className="h-8 rounded-full text-xs text-muted-foreground hover:text-red-500 flex items-center gap-1 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                      Clear dates
                    </Button>
                  )}
                </div>

                {selectedDates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 bg-gray-50/50 p-2.5 rounded-2xl border border-gray-100 max-h-24 overflow-y-auto custom-scrollbar">
                    {selectedDates.map((date, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="rounded-full bg-primary/5 hover:bg-primary/10 text-primary border-primary/10 pl-2.5 pr-1.5 py-0.5 flex items-center gap-1 text-xs"
                      >
                        {format(date, "MMM dd, yyyy")}
                        <button
                          type="button"
                          onClick={() => setSelectedDates(selectedDates.filter((_, i) => i !== idx))}
                          className="hover:bg-primary/20 rounded-full p-0.5 transition-colors cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Department Selector */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Target Departments (Auto-selects members)
                </label>
                <div className="flex flex-wrap gap-2 bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                  {departments.map((dept: any) => {
                    const isSelected = selectedDeptIds.includes(dept.id);
                    return (
                      <button
                        type="button"
                        key={dept.id}
                        onClick={() => handleDepartmentToggle(dept.id, !isSelected)}
                        className={cn(
                          "px-4 py-2 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-xs select-none",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground shadow-sm scale-[1.02]"
                            : "bg-white border-gray-200 hover:border-primary/40 hover:bg-primary/5 text-gray-600"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 animate-in fade-in zoom-in" />}
                        {dept.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Employee Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Target Members
                  </label>
                  <span className="text-xs text-muted-foreground font-medium">
                    {selectedEmpIds.length === 0
                      ? "Broadcast to all employees"
                      : `${selectedEmpIds.length} employee(s) selected`}
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    placeholder="Search employees by name, department, or telegram..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 rounded-xl border-gray-200/80 bg-white/70 shadow-sm text-sm"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Select All / Deselect All actions */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allIds = employees.map((e: any) => e.id);
                      setSelectedEmpIds(allIds);
                      // Select all depts too
                      setSelectedDeptIds(departments.map((d: any) => d.id));
                    }}
                    className="h-8 text-[11px] rounded-lg cursor-pointer text-gray-600 hover:text-primary"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedEmpIds([]);
                      setSelectedDeptIds([]);
                    }}
                    className="h-8 text-[11px] rounded-lg cursor-pointer text-gray-600 hover:text-red-500"
                  >
                    Clear All
                  </Button>
                </div>

                {/* Employees Selection Box */}
                <div className="max-h-60 overflow-y-auto p-2 border border-gray-100 bg-gray-50/30 rounded-2xl custom-scrollbar space-y-1 shadow-inner">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No employees found matching "{searchQuery}"
                    </div>
                  ) : (
                    filteredEmployees.map((emp: any) => {
                      const isChecked = selectedEmpIds.includes(emp.id);
                      const dept = departments.find((d: any) => d.id === emp.department_id);
                      
                      // Initial monogram for avatar representation
                      const monogram = `${emp.first_name?.[0] || ""}${emp.last_name?.[0] || ""}`.toUpperCase();

                      return (
                        <div
                          key={emp.id}
                          onClick={() => handleEmployeeToggle(emp.id, !isChecked)}
                          className={cn(
                            "flex items-center justify-between p-2.5 rounded-xl border transition-all duration-150 cursor-pointer select-none",
                            isChecked
                              ? "bg-primary/5 border-primary/20 text-primary shadow-xs"
                              : "bg-white border-transparent hover:bg-gray-50 text-gray-800"
                          )}
                        >
                          <div className="flex items-center space-x-3">
                            {/* Custom styled checkbox indicator */}
                            <div
                              className={cn(
                                "h-5 w-5 rounded-md border flex items-center justify-center transition-all",
                                isChecked
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-gray-300 bg-white"
                              )}
                            >
                              {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                            
                            {/* Avatar circle */}
                            <div
                              className={cn(
                                "h-7 w-7 rounded-full text-[10px] font-bold flex items-center justify-center border shrink-0",
                                isChecked
                                  ? "bg-primary/20 text-primary border-primary/25"
                                  : "bg-gray-100 text-gray-500 border-gray-200"
                              )}
                            >
                              {monogram}
                            </div>

                            <span className="text-sm font-medium">
                              {emp.first_name} {emp.last_name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {dept && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] rounded-full px-2 py-0.5",
                                  isChecked
                                    ? "bg-primary/10 border-primary/20 text-primary"
                                    : "bg-gray-50 border-gray-200 text-gray-500"
                                )}
                              >
                                {dept.name}
                              </Badge>
                            )}
                            {emp.telegram_username && (
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-[10px] rounded-full px-2 py-0.5",
                                  isChecked
                                    ? "bg-sky-100 text-sky-700 border-sky-200"
                                    : "bg-sky-50 text-sky-600 border-sky-100"
                                )}
                              >
                                @{emp.telegram_username.replace(/^@+/, "")}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full h-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/95 flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer shadow-md"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Announcement...
                  </>
                ) : (
                  <>
                    <Megaphone className="h-4 w-4" />
                    Create & Push Announcement
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Enlarged Announcement History (Full width layout) */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" />
          Announcement Logs
        </h2>

        {announcements.length === 0 ? (
          <Card className="border-dashed border-gray-200 bg-white/40 p-12 text-center rounded-3xl shadow-sm">
            <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base text-gray-500 font-medium">No previous announcements</p>
            <p className="text-xs text-gray-400 mt-1">Announcements created by Admins/HR will appear here.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {announcements.map((ann: any) => {
                let parsedDates: string[] = [];
                let parsedEmpIds: number[] = [];
                try {
                  parsedDates = typeof ann.dates === "string" ? JSON.parse(ann.dates) : ann.dates || [];
                  parsedEmpIds = typeof ann.target_employee_ids === "string" ? JSON.parse(ann.target_employee_ids) : ann.target_employee_ids || [];
                } catch (_) {}

                return (
                  <motion.div
                    key={ann.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="border border-white/50 bg-white/70 p-6 rounded-3xl shadow-md hover:shadow-xl transition-all relative group flex flex-col justify-between hover:border-primary/20 backdrop-blur-md"
                  >
                    {/* Delete button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          disabled={deleteMutation.isPending}
                          className="absolute right-4 top-4 p-2 text-gray-400 hover:text-red-500 bg-white hover:bg-red-50 border border-gray-100 rounded-xl opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-sm"
                          title="Delete announcement"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this announcement? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl font-medium">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(ann.id)}
                            variant="destructive"
                            className="rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <div className="space-y-4">
                      {/* Title & Icon Header */}
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Megaphone className="h-4.5 w-4.5" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg leading-snug group-hover:text-primary transition-colors pr-6">
                          {ann.title}
                        </h3>
                      </div>

                      {/* Content Body */}
                      <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {ann.announcement}
                      </p>
                    </div>

                    <div className="border-t border-gray-100 mt-6 pt-4 space-y-3.5">
                      {/* Dates section */}
                      {Array.isArray(parsedDates) && parsedDates.length > 0 && (
                        <div className="flex flex-wrap gap-1 items-center">
                          <span className="text-[10px] font-bold text-gray-400 mr-1 flex items-center gap-0.5">
                            <CalendarIcon className="h-3 w-3" />
                            Dates:
                          </span>
                          {parsedDates.map((dateStr, idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px] rounded-full border-gray-200">
                              {dateStr}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Target status indicators */}
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center gap-1.5 font-medium text-gray-500">
                          <Users className="h-3.5 w-3.5 text-primary" />
                          <span>
                            {Array.isArray(parsedEmpIds) && parsedEmpIds.length > 0
                              ? `Sent to ${parsedEmpIds.length} members`
                              : "Company wide broadcast"}
                          </span>
                        </div>
                        
                        {!(Array.isArray(parsedEmpIds) && parsedEmpIds.length > 0) && (
                          <Badge variant="outline" className="text-[9px] font-bold text-green-600 border-green-200 bg-green-50 rounded-full">
                            Public
                          </Badge>
                        )}
                      </div>

                      {/* Footer timestamps */}
                      <div className="text-[10px] text-gray-400 font-medium">
                        Created {format(new Date(ann.created_at), "PPP 'at' p")}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
