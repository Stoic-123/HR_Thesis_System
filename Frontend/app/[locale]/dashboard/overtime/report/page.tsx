"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
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

const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function OvertimeReportPage() {
  const tReport = useTranslations("overtimeReport");
  const tOt = useTranslations("overtime");
  const tc = useTranslations("common");
  const [overtimes, setOvertimes] = useState<Overtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  
  // New filters states
  const [startDate, setStartDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1); // default to 1st of current month
  });
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: number; first_name: string; last_name: string }[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>("all");
  const [selectedEmpId, setSelectedEmpId] = useState<string>("all");

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });

  const { data: user } = useMe();

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getAllOvertimes({
        page,
        limit,
        startDate: toISODate(startDate),
        endDate: toISODate(endDate),
        departmentId: selectedDeptId,
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
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            {tOt("pending")}
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {tOt("approved")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            {tOt("rejected")}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            {tOt("unknown")}
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleString("en-US", {
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

    const totalCount = filteredOvertimes.length;
    const approvedCount = filteredOvertimes.filter(ot => ot.status === "approved").length;
    const pendingCount = filteredOvertimes.filter(ot => ot.status === "pending").length;
    const rejectedCount = filteredOvertimes.filter(ot => ot.status === "rejected").length;

    const filterLabel = filter === "all" ? "ទាំងអស់ / All" : filter === "approved" ? "បានអនុម័ត / Approved" : filter === "pending" ? "រង់ចាំ / Pending" : "បានបដិសេធ / Rejected";
    const deptLabel = selectedDeptId === "all"
      ? "គ្រប់ផ្នែក / All Departments"
      : departments.find(d => String(d.id) === selectedDeptId)?.name || "នាយកដ្ឋាន / Department";
    const formattedDateRange = `${startDate.toLocaleDateString("km-KH")} - ${endDate.toLocaleDateString("km-KH")}`;

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
      summary: [
        { labelKh: "សំណើសរុប", labelEn: "Total Requests", value: String(totalCount) },
        { labelKh: "បានអនុម័ត", labelEn: "Approved", value: String(approvedCount) },
        { labelKh: "កំពុងរង់ចាំ", labelEn: "Pending", value: String(pendingCount) },
        { labelKh: "បានបដិសេធ", labelEn: "Rejected", value: String(rejectedCount) }
      ],
      tableHeaders: [
        { kh: "ឈ្មោះបុគ្គលិក", en: "Employee Name" },
        { kh: "ចាប់ផ្តើម", en: "From Date" },
        { kh: "បញ្ចប់", en: "To Date" },
        { kh: "មូលហេតុ", en: "Reason" },
        { kh: "ស្ថានភាព", en: "Status", align: "right" }
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
            { text: formatDate(ot.start_date), align: "left" as const },
            { text: formatDate(ot.end_date), align: "left" as const },
            { text: ot.reason || "—", align: "left" as const },
            { text: `<span class="${statusColor}">${statusLabel}</span>`, align: "right" as const }
          ]
        };
      }),
      preparedBy: userFullName
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{tReport("title")}</h1>
          <p className="text-gray-500">{tReport("description")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Start Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="min-w-[190px] justify-start gap-2 rounded-xl shadow-sm"
              >
                <CalendarIcon className="size-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">ចាប់ផ្តើម / Start:</span>
                {startDate.toLocaleDateString("km-KH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => date && setStartDate(date)}
              />
            </PopoverContent>
          </Popover>

          {/* End Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="min-w-[190px] justify-start gap-2 rounded-xl shadow-sm"
              >
                <CalendarIcon className="size-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">បញ្ចប់ / End:</span>
                {endDate.toLocaleDateString("km-KH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => date && setEndDate(date)}
              />
            </PopoverContent>
          </Popover>

          {/* Department Select */}
          <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
            <SelectTrigger className="w-[180px] rounded-xl shadow-sm">
              <SelectValue placeholder={`${tc("department") || "នាយកដ្ឋាន"} / Department`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{`${tc("all") || "ទាំងអស់"} / All`}</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={String(dept.id)}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Employee Select */}
          <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
            <SelectTrigger className="w-[180px] rounded-xl shadow-sm">
              <SelectValue placeholder="បុគ្គលិក / Employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{`${tc("all") || "ទាំងអស់"} / All`}</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={String(emp.id)}>
                  {`${emp.first_name} ${emp.last_name}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px] rounded-xl shadow-sm">
              <SelectValue placeholder={tOt("filterByStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tOt("allRequests")}</SelectItem>
              <SelectItem value="pending">{tOt("pending")}</SelectItem>
              <SelectItem value="approved">{tOt("approved")}</SelectItem>
              <SelectItem value="rejected">{tOt("rejected")}</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleExportPDF}
            className="flex items-center gap-2 rounded-xl shadow-sm bg-primary hover:bg-primary/90 text-white font-medium cursor-pointer"
            disabled={filteredOvertimes.length === 0}
          >
            <Printer className="size-4" />
            {tOt("exportPDF") || "Export PDF"}
          </Button>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <CalendarRange className="size-4.5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{tReport("thisMonthRequests")}</p>
              <p className="text-xl font-semibold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
              <CheckCircle className="size-4.5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{tReport("approvedCount")}</p>
              <p className="text-xl font-semibold">{stats.approved}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
              <Clock className="size-4.5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{tReport("pendingCount")}</p>
              <p className="text-xl font-semibold">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-xl bg-red-100 p-2.5 text-red-700">
              <XCircle className="size-4.5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{tOt("rejected")}</p>
              <p className="text-xl font-semibold">{stats.rejected}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tOt("overtimeList")}</CardTitle>
          <CardDescription>{tOt("overtimeListDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState variant="table" count={6} />
          ) : (
            <>
              <div className="max-h-[500px] overflow-y-auto relative">
                <Table>
                  <TableHeader className="sticky top-0 bg-white dark:bg-zinc-950 z-10">
                    <TableRow>
                      <TableHead className="bg-white dark:bg-zinc-950">{tOt("employeeLabel")}</TableHead>
                      <TableHead className="bg-white dark:bg-zinc-950">{tOt("from")}</TableHead>
                      <TableHead className="bg-white dark:bg-zinc-950">{tOt("to")}</TableHead>
                      <TableHead className="bg-white dark:bg-zinc-950">{tOt("reason")}</TableHead>
                      <TableHead className="bg-white dark:bg-zinc-950">{tc("status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                {filteredOvertimes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500">
                      {tOt("noRequests")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOvertimes.map((ot) => (
                    <TableRow key={ot.id}>
                      <TableCell className="font-medium">
                        {ot.employee_overtime_employee_idToemployee
                          ? `${ot.employee_overtime_employee_idToemployee.first_name} ${ot.employee_overtime_employee_idToemployee.last_name}`
                          : ot.employee_id
                          ? `Employee #${ot.employee_id}`
                          : "Unknown Employee"}
                      </TableCell>
                      <TableCell>{formatDate(ot.start_date)}</TableCell>
                      <TableCell>{formatDate(ot.end_date)}</TableCell>
                      <TableCell>{ot.reason || tOt("noReason")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(ot.status)}
                          {getStatusBadge(ot.status)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

            {/* Pagination Controls */}
            {overtimes.length > 0 && (
              <div className="flex items-center justify-between border-t border-border/30 px-2 py-4 mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">បង្ហាញ / Show:</span>
                  <Select
                    value={String(limit)}
                    onValueChange={(val) => {
                      setLimit(Number(val));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[85px] h-8 rounded-xl shadow-sm">
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
                    ជួរក្នុងមួយទំព័រ / Rows per page
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
                    {tc("previous")}
                  </Button>
                  <span className="text-xs text-muted-foreground font-semibold px-2">
                    {tc("page")} {page} {tc("of")} {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-xl shadow-sm text-xs font-medium cursor-pointer"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    {tc("next")}
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
