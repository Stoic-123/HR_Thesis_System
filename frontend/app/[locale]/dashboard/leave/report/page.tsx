"use client";

import React, { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LoadingState } from "@/components/ui/loading-state";
import {
  CalendarIcon,
  Printer,
  CalendarRange,
  CalendarCheck2,
  CalendarClock,
  XCircle,
} from "lucide-react";
import { getAllLeaves } from "@/services/leave.services";
import { getDepartments } from "@/services/department.services";
import { getAllEmployees } from "@/services/employee.services";
import { getAllLeaveTypes } from "@/services/leavetype.services";
import { useMe } from "@/hooks/useMe";
import { exportReportToPDF } from "@/lib/pdf-export";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { type DateRange } from "react-day-picker";

const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseLocalDate = (val: string): Date => {
  if (!val) return new Date();
  const [y, m, d] = val.split("-").map(Number);
  if (y && m && d) return new Date(y, m - 1, d);
  return new Date(val);
};

interface LeaveRequest {
  id: number;
  employee: string;
  type: string;
  from: string;
  to: string;
  status: "pending" | "approved" | "rejected";
  department?: string;
  department_id?: number;
}

const LeaveReportPage = () => {
  const t = useTranslations("leaveReport");
  const tl = useTranslations("leave");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { data: user } = useMe();

  const getFirstDayOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  };

  const getLastDayOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0);
  };

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date>(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState<Date>(getLastDayOfMonth());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: getFirstDayOfMonth(),
    to: getLastDayOfMonth(),
  });

  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: number; first_name: string; last_name: string }[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<{ id: number; name: string; code: string }[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>("all");
  const [selectedEmpId, setSelectedEmpId] = useState<string>("all");
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const roleName = (user as any)?.data?.employee?.role?.name?.toLowerCase() || (user as any)?.employee?.role?.name?.toLowerCase() || "";
  const isHrOrAdmin = roleName.includes("admin") || roleName.includes("superadmin") || roleName.includes("hr") || roleName.includes("general manager") || roleName.includes("director");
  const userDeptId = (user as any)?.data?.employee?.department_id || (user as any)?.data?.employee?.department_employee_department_idTodepartment?.id || (user as any)?.employee?.department_id || (user as any)?.employee?.department_employee_department_idTodepartment?.id;

  useEffect(() => {
    if (!isHrOrAdmin && userDeptId) {
      setSelectedDeptId(String(userDeptId));
    }
  }, [isHrOrAdmin, userDeptId]);

  const visibleDepartments = isHrOrAdmin
    ? departments
    : departments.filter((d) => d.id === Number(userDeptId));

  const visibleEmployees = isHrOrAdmin
    ? (selectedDeptId === "all" ? employees : employees.filter((e: any) => e.department_id === Number(selectedDeptId)))
    : employees.filter((e: any) => e.department_id === Number(userDeptId));

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range) {
      if (range.from) {
        setStartDate(range.from);
      }
      if (range.to) {
        setEndDate(range.to);
      } else if (range.from) {
        setEndDate(range.from);
      }
    }
  };

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const effectiveDeptId = !isHrOrAdmin && userDeptId ? String(userDeptId) : (selectedDeptId !== "all" ? selectedDeptId : undefined);
      const res = await getAllLeaves({
        department_id: effectiveDeptId,
      });
      if (res.result) {
        setLeaves(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch leaves:", error);
      toast.error("Failed to fetch leaves");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const deptsRes = await getDepartments(1, 1, 100);
        if (deptsRes?.result) {
          setDepartments(deptsRes.data);
        }
        const empsRes = await getAllEmployees(1, 1000);
        if (empsRes?.result) {
          setEmployees(empsRes.data);
        }
        const leaveTypesRes = await getAllLeaveTypes(1, 100);
        if (leaveTypesRes?.result) {
          setLeaveTypes(leaveTypesRes.data);
        }
      } catch (err) {
        console.error("Failed to load filter data:", err);
      }
    };
    loadFilters();
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [isHrOrAdmin, userDeptId, selectedDeptId]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, selectedDeptId, selectedEmpId, selectedLeaveTypeId, selectedStatus]);

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return tl("pending") || "Pending";
      case "approved": return tl("approved") || "Approved";
      case "rejected": return tl("rejected") || "Rejected";
      default: return status;
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(locale === "km" ? "km-KH" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDuration = (fromStr: string, toStr: string, loc: string) => {
    const fromDate = new Date(fromStr);
    const toDate = new Date(toStr);
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return loc === "km" ? `${diffDays} ថ្ងៃ` : `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
  };

  // Client-side filtering logic
  const filteredLeaves = leaves.filter((leave) => {
    // 1. Status Filter
    if (selectedStatus !== "all" && leave.status !== selectedStatus) {
      return false;
    }

    // 2. Department Filter
    const effectiveDeptId = !isHrOrAdmin && userDeptId ? String(userDeptId) : selectedDeptId;
    if (effectiveDeptId !== "all" && String(leave.department_id) !== effectiveDeptId) {
      return false;
    }

    // 3. Employee Filter
    if (selectedEmpId !== "all") {
      const emp = employees.find((e) => String(e.id) === selectedEmpId);
      if (emp) {
        const fullName = `${emp.first_name} ${emp.last_name}`;
        if (leave.employee !== fullName) {
          return false;
        }
      }
    }

    // 4. Leave Type Filter
    if (selectedLeaveTypeId !== "all") {
      const selectedLt = leaveTypes.find((lt) => String(lt.id) === selectedLeaveTypeId);
      if (selectedLt && leave.type !== selectedLt.name) {
        return false;
      }
    }

    // 5. Date Range Overlap Filter
    if (leave.from && leave.to) {
      const leaveFrom = parseLocalDate(leave.from);
      leaveFrom.setHours(0, 0, 0, 0);

      const leaveTo = parseLocalDate(leave.to);
      leaveTo.setHours(23, 59, 59, 999);

      const filterStart = new Date(startDate);
      filterStart.setHours(0, 0, 0, 0);

      const filterEnd = new Date(endDate);
      filterEnd.setHours(23, 59, 59, 999);

      if (leaveFrom > filterEnd || leaveTo < filterStart) {
        return false;
      }
    }

    return true;
  });

  // Calculate statistics based on filtered results
  const stats = {
    total: filteredLeaves.length,
    approved: filteredLeaves.filter((l) => l.status === "approved").length,
    pending: filteredLeaves.filter((l) => l.status === "pending").length,
    rejected: filteredLeaves.filter((l) => l.status === "rejected").length,
  };

  // Pagination calculations
  const totalItems = filteredLeaves.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const paginatedLeaves = filteredLeaves.slice((page - 1) * limit, page * limit);

  const handleExportPDF = () => {
    const userFullName = user?.employee ? `${user.employee.first_name} ${user.employee.last_name}` : "";

    const formattedDateRange = startDate.toDateString() === endDate.toDateString()
      ? formatDate(startDate.toISOString())
      : `${formatDate(startDate.toISOString())} - ${formatDate(endDate.toISOString())}`;

    const deptLabel = selectedDeptId === "all"
      ? (locale === "km" ? "គ្រប់ផ្នែក" : "All Departments")
      : departments.find(d => String(d.id) === selectedDeptId)?.name || (locale === "km" ? "នាយកដ្ឋាន" : "Department");

    const statusLabel = selectedStatus === "all"
      ? (locale === "km" ? "ទាំងអស់" : "All")
      : selectedStatus === "approved"
      ? (locale === "km" ? "បានអនុម័ត" : "Approved")
      : selectedStatus === "pending"
      ? (locale === "km" ? "កំពុងរង់ចាំ" : "Pending")
      : (locale === "km" ? "បានបដិសេធ" : "Rejected");

    const leaveTypeLabel = selectedLeaveTypeId === "all"
      ? (locale === "km" ? "ទាំងអស់" : "All")
      : leaveTypes.find(lt => String(lt.id) === selectedLeaveTypeId)?.name || (locale === "km" ? "ប្រភេទច្បាប់" : "Leave Type");

    const apiBaseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const companyLogo = user?.employee?.company?.logo_path
      ? (user.employee.company.logo_path.startsWith("http")
          ? user.employee.company.logo_path
          : `${apiBaseURL}${user.employee.company.logo_path}`)
      : "";

    exportReportToPDF({
      titleKh: "របាយការណ៍សំណើច្បាប់ឈប់សម្រាក",
      titleEn: "Leave Request Report",
      companyName: user?.employee?.company?.name || "ក្រុមហ៊ុន សារណៈ",
      companyLogo,
      orientation: "landscape",
      metadata: [
        { labelKh: "កាលបរិច្ឆេទ", labelEn: "Date Range", value: formattedDateRange },
        { labelKh: "ស្ថានភាពតម្រង", labelEn: "Status Filter", value: statusLabel },
        { labelKh: "ផ្នែក/នាយកដ្ឋាន", labelEn: "Department", value: deptLabel },
        { labelKh: "ប្រភេទច្បាប់", labelEn: "Leave Type", value: leaveTypeLabel },
        { labelKh: "រៀបចំដោយ", labelEn: "Prepared By", value: userFullName || "រដ្ឋបាល / Admin" }
      ],
      tableHeaders: [
        { kh: "ឈ្មោះបុគ្គលិក", en: "Employee Name" },
        { kh: "ប្រភេទច្បាប់", en: "Leave Type", align: "center" },
        { kh: "ចាប់ផ្តើម", en: "From Date", align: "center" },
        { kh: "បញ្ចប់", en: "To Date", align: "center" },
        { kh: "រយៈពេល", en: "Duration", align: "center" },
        { kh: "ស្ថានភាព", en: "Status", align: "center" }
      ],
      tableRows: filteredLeaves.map((leave) => {
        return {
          cells: [
            { text: `<strong>${leave.employee}</strong>`, align: "left" as const },
            { text: leave.type, align: "center" as const },
            { text: formatDate(leave.from), align: "center" as const },
            { text: formatDate(leave.to), align: "center" as const },
            { text: formatDuration(leave.from, leave.to, locale), align: "center" as const },
            {
              text: `<span class="${
                leave.status === "approved"
                  ? "text-emerald"
                  : leave.status === "pending"
                  ? "text-amber"
                  : "text-rose"
              }">${getStatusLabel(leave.status)}</span>`,
              align: "center" as const,
            },
          ],
        };
      }),
      preparedBy: userFullName,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("description")}</p>
        </div>
        <Button
          onClick={handleExportPDF}
          size="lg"
          className="rounded-2xl shadow-sm bg-primary hover:bg-primary/90 text-white font-semibold gap-2 self-start sm:self-auto cursor-pointer"
          disabled={filteredLeaves.length === 0}
        >
          <Printer className="size-4" />
          {t("exportPDF") || "Export PDF"}
        </Button>
      </div>

      {/* Filter Control Bar */}
      <Card className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          {/* Date Range Picker (From / To) */}
          <div className="space-y-1.5 lg:col-span-2">
            <Label className="text-xs font-semibold text-muted-foreground">{locale === "km" ? "កាលបរិច្ឆេទ" : "Date Range"}</Label>
            <DateRangePicker
              startDate={toISODate(startDate)}
              endDate={toISODate(endDate)}
              onStartDateChange={(val) => setStartDate(parseLocalDate(val))}
              onEndDateChange={(val) => setEndDate(parseLocalDate(val))}
              fromLabel={locale === "km" ? "ពី" : "From"}
              toLabel={locale === "km" ? "ដល់" : "To"}
            />
          </div>

          {/* Department Select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">{locale === "km" ? "នាយកដ្ឋាន" : "Department"}</Label>
            <Select 
              value={!isHrOrAdmin && userDeptId ? String(userDeptId) : selectedDeptId} 
              onValueChange={setSelectedDeptId}
              disabled={!isHrOrAdmin}
            >
              <SelectTrigger className="h-10 rounded-xl shadow-xs bg-background border-border/60">
                <SelectValue placeholder={locale === "km" ? "នាយកដ្ឋាន" : "Department"} />
              </SelectTrigger>
              <SelectContent>
                {isHrOrAdmin && (
                  <SelectItem value="all">{locale === "km" ? "ទាំងអស់" : "All"}</SelectItem>
                )}
                {visibleDepartments.map((dept) => (
                  <SelectItem key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Employee Select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">{locale === "km" ? "បុគ្គលិក" : "Employee"}</Label>
            <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
              <SelectTrigger className="h-10 rounded-xl shadow-xs bg-background border-border/60">
                <SelectValue placeholder={locale === "km" ? "បុគ្គលិក" : "Employee"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{locale === "km" ? "ទាំងអស់" : "All"}</SelectItem>
                {visibleEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={String(emp.id)}>
                    {`${emp.first_name} ${emp.last_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Leave Type Select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">{locale === "km" ? "ប្រភេទច្បាប់" : "Leave Type"}</Label>
            <Select value={selectedLeaveTypeId} onValueChange={setSelectedLeaveTypeId}>
              <SelectTrigger className="h-10 rounded-xl shadow-xs bg-background border-border/60">
                <SelectValue placeholder={locale === "km" ? "ប្រភេទច្បាប់" : "Leave Type"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{locale === "km" ? "ទាំងអស់" : "All"}</SelectItem>
                {leaveTypes.map((lt) => (
                  <SelectItem key={lt.id} value={String(lt.id)}>
                    {lt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">{locale === "km" ? "ស្ថានភាព" : "Status"}</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-10 rounded-xl shadow-xs bg-background border-border/60">
                <SelectValue placeholder={locale === "km" ? "ស្ថានភាព" : "Status"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{locale === "km" ? "ទាំងអស់" : "All"}</SelectItem>
                <SelectItem value="pending">{tl("pending") || "Pending"}</SelectItem>
                <SelectItem value="approved">{tl("approved") || "Approved"}</SelectItem>
                <SelectItem value="rejected">{tl("rejected") || "Rejected"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Stats Cards Section */}
      <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2 grid-cols-1">
        {/* Total Request Card */}
        <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <CalendarRange className="size-4.5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {locale === "km" ? "សរុបសំណើ" : "Total Requests"}
              </p>
              <p className="text-xl font-semibold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        {/* Approved Card */}
        <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
              <CalendarCheck2 className="size-4.5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("approvedCount")}</p>
              <p className="text-xl font-semibold">{stats.approved}</p>
            </div>
          </CardContent>
        </Card>

        {/* Pending Card */}
        <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
              <CalendarClock className="size-4.5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("pendingCount")}</p>
              <p className="text-xl font-semibold">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>

        {/* Rejected Card */}
        <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-xl bg-red-100 p-2.5 text-red-700">
              <XCircle className="size-4.5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {locale === "km" ? "បដិសេធ" : "Rejected"}
              </p>
              <p className="text-xl font-semibold">{stats.rejected}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table Card */}
      <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
        <CardHeader className="flex-row items-center justify-between pb-3 px-6">
          <div>
            <CardTitle>{t("allRequests")}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {locale === "km"
                ? `បង្ហាញសំណើឈប់សម្រាកចំនួន ${totalItems} នៅក្នុងបញ្ជី`
                : `Showing ${totalItems} leave requests in the list`}
            </p>
          </div>
          <Badge className="rounded-full bg-primary/10 text-primary">
            {locale === "km" ? "បញ្ជីច្បាប់ឈប់សម្រាក" : "Leave List"}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-8 px-6">
              <LoadingState variant="table" count={5} />
            </div>
          ) : paginatedLeaves.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center justify-center px-6">
              <div className="rounded-full bg-muted p-4 mb-4">
                <CalendarRange className="size-8 text-muted-foreground" />
              </div>
              <p className="font-semibold text-gray-700">
                {locale === "km" ? "រកមិនឃើញទិន្នន័យទេ" : "No records found"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {locale === "km"
                  ? "សូមជ្រើសរើសចន្លោះកាលបរិច្ឆេទ ឬតម្រងផ្សេងទៀត។"
                  : "Please select a different date range or filter criteria."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                <table className="w-full min-w-[700px] text-sm border-collapse text-left">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/20 border-b border-border/50">
                      <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 pl-6 pr-4 border-b border-border/50">{locale === "km" ? "ឈ្មោះបុគ្គលិក" : "Employee Name"}</th>
                      <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 px-4 border-b border-border/50 text-center">{locale === "km" ? "ប្រភេទច្បាប់" : "Leave Type"}</th>
                      <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 px-4 border-b border-border/50 text-center">{locale === "km" ? "ចាប់ផ្តើម" : "From Date"}</th>
                      <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 px-4 border-b border-border/50 text-center">{locale === "km" ? "បញ្ចប់" : "To Date"}</th>
                      <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 px-4 border-b border-border/50 text-center">{locale === "km" ? "រយៈពេល" : "Duration"}</th>
                      <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 pl-4 pr-6 border-b border-border/50 text-right">{locale === "km" ? "ស្ថានភាព" : "Status"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {paginatedLeaves.map((row) => (
                      <tr key={row.id} className="group transition-colors hover:bg-muted/40">
                        <td className="py-3.5 pl-6 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {initials(row.employee)}
                            </div>
                            <span className="font-medium leading-tight">{row.employee}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge variant="outline" className="font-medium bg-background">
                            {row.type}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-center text-muted-foreground">
                          {formatDate(row.from)}
                        </td>
                        <td className="py-3.5 px-4 text-center text-muted-foreground">
                          {formatDate(row.to)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium">
                          {formatDuration(row.from, row.to, locale)}
                        </td>
                        <td className="py-3.5 pl-4 pr-6 text-right">
                          <Badge
                            className={`rounded-full px-2.5 py-0.5 border font-semibold text-xs ${
                              row.status === "approved"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900"
                                : row.status === "pending"
                                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900"
                                : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900"
                            }`}
                          >
                            {getStatusLabel(row.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/30 px-6 py-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Select
                      value={String(limit)}
                      onValueChange={(val) => {
                        setLimit(Number(val));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[80px] h-8 rounded-xl shadow-sm">
                        <SelectValue placeholder="10" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">
                      {locale === "km" ? "ជួរក្នុងមួយទំព័រ" : "Rows per page"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-xl shadow-sm text-xs font-medium cursor-pointer"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      {tc("previous") || "មុន"}
                    </Button>
                    <span className="text-xs text-muted-foreground font-semibold px-2">
                      {tc("page") || "ទំព័រ"} {page} {tc("of") || "នៃ"} {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-xl shadow-sm text-xs font-medium cursor-pointer"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      {tc("next") || "បន្ទាប់"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveReportPage;
