"use client";

import React, { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
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
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Printer,
  CalendarRange,
  CalendarIcon,
} from "lucide-react";
import {
  getAllOvertimes,
  type Overtime,
} from "@/services/overtime.services";
import { getDepartments } from "@/services/department.services";
import { getAllEmployees } from "@/services/employee.services";
import { toast } from "sonner";
import { useMe } from "@/hooks/useMe";
import { exportReportToPDF } from "@/lib/pdf-export";
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

export default function OvertimeReportPage() {
  const tReport = useTranslations("overtimeReport");
  const tOt = useTranslations("overtime");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { data: user } = useMe();

  const getFirstDayOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  };

  const [overtimes, setOvertimes] = useState<Overtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  
  // Date range states
  const [startDate, setStartDate] = useState<Date>(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: getFirstDayOfMonth(),
    to: new Date(),
  });

  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: number; first_name: string; last_name: string }[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>("all");
  const [selectedEmpId, setSelectedEmpId] = useState<string>("all");

  const rawRole = (user as any)?.data?.employee?.role ?? (user as any)?.employee?.role;
  const roleName = (typeof rawRole === "string" ? rawRole : rawRole?.name || "").toLowerCase();
  const userPermissions = (user as any)?.data?.employee?.permissions || (user as any)?.employee?.permissions || [];
  const isHrOrAdmin =
    roleName.includes("admin") ||
    roleName.includes("superadmin") ||
    roleName.includes("hr") ||
    roleName.includes("general manager") ||
    roleName.includes("director") ||
    userPermissions.includes("*");
  const userDeptId = (user as any)?.data?.employee?.department_id || (user as any)?.data?.employee?.department_employee_department_idTodepartment?.id || (user as any)?.employee?.department_id || (user as any)?.employee?.department_employee_department_idTodepartment?.id;

  useEffect(() => {
    if (!isHrOrAdmin && userDeptId) {
      setSelectedDeptId(String(userDeptId));
    }
  }, [isHrOrAdmin, userDeptId]);

  const visibleEmployees = isHrOrAdmin
    ? (selectedDeptId === "all" ? employees : employees.filter((e: any) => e.department_id === Number(selectedDeptId)))
    : employees.filter((e: any) => e.department_id === Number(userDeptId));

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });

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

  const fetchData = async () => {
    try {
      setLoading(true);
      const effectiveDeptId = !isHrOrAdmin && userDeptId ? String(userDeptId) : selectedDeptId;
      const data = await getAllOvertimes({
        page,
        limit,
        startDate: toISODate(startDate),
        endDate: toISODate(endDate),
        departmentId: effectiveDeptId,
        employeeId: selectedEmpId,
        status: filter,
      });
      if (data?.result) {
        setOvertimes(data.data);
        if (data.stats) setStats(data.stats);
        if (data.pagination) {
          setTotal(data.pagination.total);
          setTotalPages(data.pagination.totalPages);
        }
      }
    } catch (error) {
      console.error("Failed to fetch overtimes", error);
      toast.error("Failed to load overtime requests");
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
      } catch (err) {
        console.error("Failed to load filter data:", err);
      }
    };
    loadFilters();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border border-yellow-200">
            {tOt("pending")}
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 border border-green-200">
            {tOt("approved")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800 border border-red-200">
            {tOt("rejected")}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800 border border-gray-200">
            {tOt("unknown")}
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleString(locale === "km" ? "km-KH" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredOvertimes = overtimes;

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, selectedDeptId, selectedEmpId, filter]);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedDeptId, selectedEmpId, filter, page, limit]);

  const handleExportPDF = () => {
    const userFullName = user?.employee ? `${user.employee.first_name} ${user.employee.last_name}` : "";

    const formattedDateRange = startDate.toDateString() === endDate.toDateString()
      ? formatDate(startDate.toISOString()).split(",")[0]
      : `${formatDate(startDate.toISOString()).split(",")[0]} - ${formatDate(endDate.toISOString()).split(",")[0]}`;

    const filterLabel = filter === "all"
      ? (locale === "km" ? "ទាំងអស់" : "All")
      : filter === "approved"
      ? (locale === "km" ? "បានអនុម័ត" : "Approved")
      : filter === "pending"
      ? (locale === "km" ? "កំពុងរង់ចាំ" : "Pending")
      : (locale === "km" ? "បានបដិសេធ" : "Rejected");

    const deptLabel = isHrOrAdmin
      ? (selectedDeptId === "all"
          ? (locale === "km" ? "គ្រប់ផ្នែក" : "All Departments")
          : departments.find(d => String(d.id) === selectedDeptId)?.name || (locale === "km" ? "នាយកដ្ឋាន" : "Department"))
      : departments.find(d => d.id === Number(userDeptId))?.name || (user as any)?.employee?.department_employee_department_idTodepartment?.name || (locale === "km" ? "នាយកដ្ឋាន" : "Department");

    const apiBaseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const companyLogo = user?.employee?.company?.logo_path
      ? (user.employee.company.logo_path.startsWith("http")
          ? user.employee.company.logo_path
          : `${apiBaseURL}${user.employee.company.logo_path}`)
      : "";

    exportReportToPDF({
      titleKh: "របាយការណ៍សំណើការងារបន្ថែមម៉ោង",
      titleEn: "Overtime Request Report",
      companyName: user?.employee?.company?.name || "ក្រុមហ៊ុន សារណៈ",
      companyLogo,
      orientation: "landscape",
      metadata: [
        { labelKh: "កាលបរិច្ឆេទ", labelEn: "Date Range", value: formattedDateRange },
        { labelKh: "ស្ថានភាពតម្រង", labelEn: "Status Filter", value: filterLabel },
        { labelKh: "ផ្នែក/នាយកដ្ឋាន", labelEn: "Department", value: deptLabel },
        { labelKh: "រៀបចំដោយ", labelEn: "Prepared By", value: userFullName || "រដ្ឋបាល / Admin" }
      ],
      tableHeaders: [
        { kh: "ឈ្មោះបុគ្គលិក", en: "Employee Name" },
        { kh: "ចាប់ផ្តើម", en: "From Date", align: "center" },
        { kh: "បញ្ចប់", en: "To Date", align: "center" },
        { kh: "មូលហេតុ", en: "Reason" },
        { kh: "ស្ថានភាព", en: "Status", align: "center" }
      ],
      tableRows: filteredOvertimes.map(ot => {
        const empName = ot.employee_overtime_employee_idToemployee
          ? `${ot.employee_overtime_employee_idToemployee.first_name} ${ot.employee_overtime_employee_idToemployee.last_name}`
          : `Employee #${ot.employee_id}`;

        const statusLabel = ot.status === "approved" ? "បានអនុម័ត" : ot.status === "pending" ? "កំពុងរង់ចាំ" : "បានបដិសេធ";
        const statusColor = ot.status === "approved" ? "text-emerald" : ot.status === "pending" ? "text-amber" : "text-rose";

        return {
          cells: [
            { text: `<strong>${empName}</strong>`, align: "left" as const },
            { text: formatDate(ot.start_date), align: "center" as const },
            { text: formatDate(ot.end_date), align: "center" as const },
            { text: ot.reason || "—", align: "left" as const },
            { text: `<span class="${statusColor}">${statusLabel}</span>`, align: "center" as const }
          ]
        };
      }),
      preparedBy: userFullName
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{tReport("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{tReport("description")}</p>
        </div>
        <Button
          onClick={handleExportPDF}
          size="lg"
          className="rounded-2xl shadow-sm bg-primary hover:bg-primary/90 text-white font-semibold gap-2 self-start sm:self-auto cursor-pointer"
          disabled={filteredOvertimes.length === 0}
        >
          <Printer className="size-4" />
          {tReport("exportPDF") || "Export PDF"}
        </Button>
      </div>

      {/* Filter Control Bar */}
      <Card className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isHrOrAdmin ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-4 items-end`}>
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

          {/* Department Select (Only for Admin/HR) */}
          {isHrOrAdmin && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{locale === "km" ? "នាយកដ្ឋាន" : "Department"}</Label>
              <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                <SelectTrigger className="h-10 rounded-xl shadow-xs bg-background border-border/60">
                  <SelectValue placeholder={locale === "km" ? "នាយកដ្ឋាន" : "Department"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{locale === "km" ? "ទាំងអស់" : "All"}</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={String(dept.id)}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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

          {/* Status Filter */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">{locale === "km" ? "ស្ថានភាព" : "Status"}</Label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-10 rounded-xl shadow-xs bg-background border-border/60">
                <SelectValue placeholder={locale === "km" ? "ស្ថានភាព" : "Status"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{locale === "km" ? "ទាំងអស់" : "All"}</SelectItem>
                <SelectItem value="pending">{tOt("pending")}</SelectItem>
                <SelectItem value="approved">{tOt("approved")}</SelectItem>
                <SelectItem value="rejected">{tOt("rejected")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Summary Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2 grid-cols-1">
        <Card className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <CalendarRange className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {locale === "km" ? "សរុបសំណើ" : "Total Requests"}
              </p>
              <p className="text-2xl font-bold tracking-tight">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-600">
              <CheckCircle className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">{tReport("approvedCount")}</p>
              <p className="text-2xl font-bold tracking-tight text-emerald-600">{stats.approved}</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-600">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">{tReport("pendingCount")}</p>
              <p className="text-2xl font-bold tracking-tight text-amber-600">{stats.pending}</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-rose-500/10 p-3 text-rose-600">
              <XCircle className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {locale === "km" ? "បដិសេធ" : "Rejected"}
              </p>
              <p className="text-2xl font-bold tracking-tight text-rose-600">{stats.rejected}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <CardHeader className="pb-3 px-6 pt-6">
          <CardTitle className="text-lg font-bold">{tOt("overtimeList")}</CardTitle>
          <CardDescription className="text-xs">{tOt("overtimeListDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-8 px-6">
              <LoadingState variant="table" count={6} />
            </div>
          ) : (
            <>
              <div className="max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                <table className="w-full min-w-[700px] text-sm border-collapse text-left">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/20 border-b border-border/50">
                      <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 pl-6 pr-4 border-b border-border/50">{tOt("employeeLabel")}</th>
                      <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 px-4 border-b border-border/50 text-center">{tOt("from")}</th>
                      <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 px-4 border-b border-border/50 text-center">{tOt("to")}</th>
                      <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 px-4 border-b border-border/50">{tOt("reason")}</th>
                      <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 pl-4 pr-6 border-b border-border/50 text-right">{tc("status")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {filteredOvertimes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-gray-500 py-10">
                          {tOt("noRequests")}
                        </td>
                      </tr>
                    ) : (
                      filteredOvertimes.map((ot) => (
                        <tr key={ot.id} className="group transition-colors hover:bg-muted/40">
                          <td className="py-3.5 pl-6 pr-4 font-medium leading-tight">
                            {ot.employee_overtime_employee_idToemployee
                              ? `${ot.employee_overtime_employee_idToemployee.first_name} ${ot.employee_overtime_employee_idToemployee.last_name}`
                              : ot.employee_id
                              ? `Employee #${ot.employee_id}`
                              : "Unknown Employee"}
                          </td>
                          <td className="py-3.5 px-4 text-center text-muted-foreground">{formatDate(ot.start_date)}</td>
                          <td className="py-3.5 px-4 text-center text-muted-foreground">{formatDate(ot.end_date)}</td>
                          <td className="py-3.5 px-4">{ot.reason || tOt("noReason")}</td>
                          <td className="py-3.5 pl-4 pr-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {getStatusIcon(ot.status)}
                              {getStatusBadge(ot.status)}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody >
                </table>
              </div>

              {/* Pagination Controls */}
              {total > 0 && (
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
}
