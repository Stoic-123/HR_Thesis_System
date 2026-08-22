"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  getCompanyKPIOverview,
  getYearlyKPISummary,
  sendKPIReminders,
  KPIEvaluation,
} from "@/services/kpi.services";
import { getDepartments } from "@/services/department.services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import dayjs from "dayjs";
import { useMe } from "@/hooks/useMe";
import { exportReportToPDF } from "@/lib/pdf-export";
import {
  Award,
  Calendar,
  CheckCircle2,
  FileDown,
  Filter,
  RefreshCw,
  Search,
  Send,
  Star,
  TrendingUp,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

const MONTHS = [
  { value: 1, label: "January (មករា)" },
  { value: 2, label: "February (កុម្ភៈ)" },
  { value: 3, label: "March (មីនា)" },
  { value: 4, label: "April (មេសា)" },
  { value: 5, label: "May (ឧសភា)" },
  { value: 6, label: "June (មិថុនា)" },
  { value: 7, label: "July (កក្កដា)" },
  { value: 8, label: "August (សីហា)" },
  { value: 9, label: "September (កញ្ញា)" },
  { value: 10, label: "October (តុលា)" },
  { value: 11, label: "November (វិច្ឆិកា)" },
  { value: 12, label: "December (ធ្នូ)" },
];

const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;

const YEARS = [2024, 2025, 2026, 2027].filter((y) => y <= currentYear);

export default function KPIPage() {
  const locale = useLocale();
  const tc = useTranslations("common");
  const { data: user } = useMe();

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Available months: Only up to current month for the current year, all 12 months for past years
  const availableMonths = useMemo(() => {
    if (selectedYear === currentYear) {
      return MONTHS.filter((m) => m.value <= currentMonth);
    } else if (selectedYear < currentYear) {
      return MONTHS;
    } else {
      return [];
    }
  }, [selectedYear]);

  // Pagination for Monthly Overview
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  // Pagination for Annual Matrix
  const [yearlyPage, setYearlyPage] = useState<number>(1);
  const [yearlyLimit, setYearlyLimit] = useState<number>(10);

  // Detail Modal State (For HR to inspect manager review notes)
  const [selectedEvalDetail, setSelectedEvalDetail] = useState<{
    eval: KPIEvaluation | null;
    employeeName?: string;
  } | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 1. Fetch Departments
  const { data: deptsData } = useQuery({
    queryKey: ["departments", "all"],
    queryFn: () => getDepartments(1, 1, 100),
  });
  const departments: any[] = Array.isArray(deptsData?.data)
    ? deptsData.data
    : Array.isArray(deptsData?.result)
    ? deptsData.result
    : [];

  // 2. Fetch HR Monthly Overview
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ["kpi-overview", selectedMonth, selectedYear, selectedDepartment],
    queryFn: () =>
      getCompanyKPIOverview({
        month: selectedMonth,
        year: selectedYear,
        departmentId: selectedDepartment,
      }),
  });

  // 3. Fetch HR 12-Month Annual Summary
  const {
    data: yearlyData,
    isLoading: isYearlyLoading,
    refetch: refetchYearly,
  } = useQuery({
    queryKey: ["kpi-yearly", selectedYear, selectedDepartment],
    queryFn: () =>
      getYearlyKPISummary({
        year: selectedYear,
        departmentId: selectedDepartment,
      }),
  });

  // 1-Click Reminder to Managers via Telegram & App Notifications
  const remindMutation = useMutation({
    mutationFn: sendKPIReminders,
    onSuccess: (res) => {
      toast.success(
        `Reminders sent to ${res?.remindedManagers || 0} department managers via Telegram & Mobile App!`
      );
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to send reminders");
    },
  });

  // Rating Badge Helper
  const getRatingBadge = (rating?: string | null) => {
    const r = (rating || "").toLowerCase();
    if (r === "good") {
      return (
        <Badge className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium text-[11px] px-2.5 py-0.5 whitespace-nowrap">
          Good (ល្អ)
        </Badge>
      );
    }
    if (r === "average") {
      return (
        <Badge className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium text-[11px] px-2.5 py-0.5 whitespace-nowrap">
          Average (មធ្យម)
        </Badge>
      );
    }
    if (r === "needs_improvement") {
      return (
        <Badge className="rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-medium text-[11px] px-2.5 py-0.5 whitespace-nowrap">
          Needs Imp. (កែលម្អ)
        </Badge>
      );
    }
    return <span className="text-muted-foreground text-xs font-medium whitespace-nowrap">-</span>;
  };

  // Grade Badge Helper
  const getGradeBadge = (grade?: string | null) => {
    const g = (grade || "").toUpperCase();
    if (g === "GOOD") {
      return (
        <Badge className="rounded-full bg-emerald-500 text-white font-semibold text-xs px-2.5 py-0.5 shadow-xs flex items-center gap-1 whitespace-nowrap">
          <Star className="w-3 h-3 fill-current shrink-0" /> GOOD (⭐⭐⭐)
        </Badge>
      );
    }
    if (g === "AVERAGE") {
      return (
        <Badge className="rounded-full bg-amber-500 text-white font-semibold text-xs px-2.5 py-0.5 shadow-xs flex items-center gap-1 whitespace-nowrap">
          <Star className="w-3 h-3 fill-current shrink-0" /> AVERAGE (⭐⭐)
        </Badge>
      );
    }
    if (g === "NEEDS_IMPROVEMENT") {
      return (
        <Badge className="rounded-full bg-rose-500 text-white font-semibold text-xs px-2.5 py-0.5 shadow-xs flex items-center gap-1 whitespace-nowrap">
          <AlertTriangle className="w-3 h-3 shrink-0" /> NEEDS IMP. (⭐)
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="rounded-full text-xs text-muted-foreground whitespace-nowrap">
        Pending
      </Badge>
    );
  };

  // Filtered Overview Records
  const filteredOverviewRecords = useMemo(() => {
    if (!overviewData?.records || !Array.isArray(overviewData.records)) return [];
    return overviewData.records.filter((rec) => {
      if (!rec?.employee) return false;
      const fullName = `${rec.employee.first_name || ""} ${rec.employee.last_name || ""}`.toLowerCase();
      const posName = rec.employee.positions?.name?.toLowerCase() || "";
      const deptName = rec.employee.department_employee_department_idTodepartment?.name?.toLowerCase() || "";
      const q = (searchQuery || "").toLowerCase();
      return fullName.includes(q) || posName.includes(q) || deptName.includes(q);
    });
  }, [overviewData, searchQuery]);

  // Paginated Overview Records
  const totalOverviewPages = Math.max(1, Math.ceil(filteredOverviewRecords.length / limit));
  const paginatedOverviewRecords = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredOverviewRecords.slice(startIndex, startIndex + limit);
  }, [filteredOverviewRecords, page, limit]);

  // Filtered & Paginated Yearly Records
  const filteredYearlyEmployees = useMemo(() => {
    if (!yearlyData?.employees || !Array.isArray(yearlyData.employees)) return [];
    return yearlyData.employees.filter((row) => {
      if (!row?.employee) return false;
      const fullName = `${row.employee.first_name || ""} ${row.employee.last_name || ""}`.toLowerCase();
      const deptName = row.employee.department_employee_department_idTodepartment?.name?.toLowerCase() || "";
      const q = (searchQuery || "").toLowerCase();
      return fullName.includes(q) || deptName.includes(q);
    });
  }, [yearlyData, searchQuery]);

  const totalYearlyPages = Math.max(1, Math.ceil(filteredYearlyEmployees.length / yearlyLimit));
  const paginatedYearlyEmployees = useMemo(() => {
    const startIndex = (yearlyPage - 1) * yearlyLimit;
    return filteredYearlyEmployees.slice(startIndex, startIndex + yearlyLimit);
  }, [filteredYearlyEmployees, yearlyPage, yearlyLimit]);

  // Export to PDF
  const handleExportPDF = () => {
    if (!overviewData?.records || overviewData.records.length === 0) {
      toast.error("No KPI evaluation data available to export");
      return;
    }

    const deptName =
      selectedDepartment === "all"
        ? (locale === "km" ? "គ្រប់នាយកដ្ឋានទាំងអស់" : "All Departments")
        : departments.find((d: any) => d.id.toString() === selectedDepartment)?.name || selectedDepartment;

    exportReportToPDF({
      titleKh: "របាយការណ៍វាយតម្លៃការបំពេញការងារប្រចាំខែ (KPI)",
      titleEn: "Monthly KPI Performance Evaluation Report",
      companyName: user?.company?.name || "Company",
      companyLogo: user?.company?.logo_path
        ? `${process.env.NEXT_PUBLIC_API_URL || ""}${user.company.logo_path}`
        : undefined,
      orientation: "landscape",
      metadata: [
        { labelKh: "ខែ / ឆ្នាំ", labelEn: "Period", value: `${selectedMonthObj.label} ${selectedYear}` },
        { labelKh: "នាយកដ្ឋាន", labelEn: "Department", value: deptName },
        { labelKh: "កាលបរិច្ឆេទបង្កើត", labelEn: "Generated Date", value: dayjs().format("DD/MM/YYYY HH:mm") },
      ],
      summary: [
        { labelKh: "អត្រាបញ្ចប់", labelEn: "Completion Rate", value: `${overviewData?.stats?.completionRate || 0}%` },
        { labelKh: "និទ្ទេស ល្អ (⭐⭐⭐)", labelEn: "Grade Good", value: `${overviewData?.stats?.goodCount || 0} នាក់` },
        { labelKh: "និទ្ទេស មធ្យម (⭐⭐)", labelEn: "Grade Average", value: `${overviewData?.stats?.avgCount || 0} នាក់` },
        { labelKh: "និទ្ទេស កែលម្អ (⭐)", labelEn: "Needs Improvement", value: `${overviewData?.stats?.needsImpCount || 0} នាក់` },
      ],
      tableHeaders: [
        { kh: "ល.រ", en: "No.", align: "center" },
        { kh: "ឈ្មោះបុគ្គលិក", en: "Employee Name", align: "left" },
        { kh: "នាយកដ្ឋាន & តួនាទី", en: "Department & Position", align: "left" },
        { kh: "អ្នកវាយតម្លៃ", en: "Evaluator / Manager", align: "left" },
        { kh: "វិន័យ", en: "Discipline", align: "center" },
        { kh: "លទ្ធផល", en: "Output", align: "center" },
        { kh: "ឥរិយាបថ", en: "Attitude", align: "center" },
        { kh: "ពិន្ទុសរុប", en: "Score", align: "center" },
        { kh: "និទ្ទេស", en: "Grade", align: "center" },
        { kh: "ស្ថានភាព", en: "Status", align: "center" },
      ],
      tableRows: filteredOverviewRecords.map((r: any, index: number) => {
        const emp = r?.employee;
        const ev = r?.evaluation;
        const empName = `${emp?.first_name || ""} ${emp?.last_name || ""}`.trim();
        const deptRole = `${emp?.department_employee_department_idTodepartment?.name || "N/A"} - ${emp?.positions?.name || "N/A"}`;
        const evaluatorName = ev?.evaluator ? `${ev.evaluator.first_name || ""} ${ev.evaluator.last_name || ""}`.trim() : "Unassigned";

        const formatRating = (val?: string) => {
          if (!val) return "-";
          if (val === "good") return "Good (ល្អ)";
          if (val === "average") return "Average (មធ្យម)";
          if (val === "needs_improvement") return "Needs Imp (កែលម្អ)";
          return val;
        };

        const formatGrade = (grade?: string) => {
          if (!grade) return "Pending";
          if (grade === "GOOD") return "GOOD (⭐⭐⭐)";
          if (grade === "AVERAGE") return "AVERAGE (⭐⭐)";
          if (grade === "NEEDS_IMPROVEMENT") return "NEEDS IMP (⭐)";
          return grade;
        };

        return {
          cells: [
            { text: String(index + 1), align: "center" },
            { text: empName || "N/A", align: "left" },
            { text: deptRole, align: "left" },
            { text: evaluatorName, align: "left" },
            { text: formatRating(ev?.discipline_rating), align: "center" },
            { text: formatRating(ev?.output_rating), align: "center" },
            { text: formatRating(ev?.attitude_rating), align: "center" },
            { text: ev?.total_score ? String(ev.total_score) : "-", align: "center" },
            { text: formatGrade(ev?.overall_grade), align: "center" },
            { text: ev?.status ? (ev.status === "approved" ? "Approved (អនុម័ត)" : ev.status) : "Pending", align: "center" },
          ],
        };
      }),
      preparedBy: `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || undefined,
    });
    toast.success("KPI Report exported to PDF successfully!");
  };

  const selectedMonthObj = MONTHS.find((m) => m.value === selectedMonth) || MONTHS[0];

  return (
    <div className="space-y-6">
      {/* Top Header - HR KPI Hub */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Award className="w-6 h-6 text-primary" />
            Performance Evaluation (KPI)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {locale === "km"
              ? "ផ្ទាំងគ្រប់គ្រង និង តាមដានការវាយតម្លៃលទ្ធផលការងារប្រចាំខែ (HR Monitoring & Payroll Integration)"
              : "Company-wide performance monitoring, manager submission tracking, and payroll export."}
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            value={selectedMonth.toString()}
            onValueChange={(val) => {
              setSelectedMonth(Number(val));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px] h-9 rounded-xl text-xs bg-card border-border/60 shadow-xs">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((m) => (
                <SelectItem key={m.value} value={m.value.toString()}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedYear.toString()}
            onValueChange={(val) => {
              const newYear = Number(val);
              setSelectedYear(newYear);
              if (newYear === currentYear && selectedMonth > currentMonth) {
                setSelectedMonth(currentMonth);
              }
              setPage(1);
              setYearlyPage(1);
            }}
          >
            <SelectTrigger className="w-[100px] h-9 rounded-xl text-xs bg-card border-border/60 shadow-xs">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 1-Click Reminder to Managers via Telegram & App */}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              remindMutation.mutate({
                month: selectedMonth,
                year: selectedYear,
              })
            }
            disabled={remindMutation.isPending}
            className="h-9 rounded-xl text-xs border-primary/30 text-primary hover:bg-primary/10 shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Send className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            {remindMutation.isPending ? "Sending..." : "Remind Managers"}
          </Button>

          {/* Export to PDF */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="h-9 rounded-xl text-xs shadow-xs cursor-pointer whitespace-nowrap border-primary/30 text-primary hover:bg-primary/5"
          >
            <FileDown className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Modern HR Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-transparent p-0 gap-2 border-b border-border/40 w-full justify-start rounded-none h-auto pb-3 overflow-x-auto">
          <TabsTrigger
            value="overview"
            className="rounded-full px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-transparent data-[state=active]:border-primary transition-all shadow-xs cursor-pointer whitespace-nowrap"
          >
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            Monthly Overview & Manager Submissions
          </TabsTrigger>

          <TabsTrigger
            value="yearly"
            className="rounded-full px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-transparent data-[state=active]:border-primary transition-all shadow-xs cursor-pointer whitespace-nowrap"
          >
            <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
            Annual 12-Month Matrix
          </TabsTrigger>
        </TabsList>

        {/* ======================================================== */}
        {/* TAB 1: MONTHLY OVERVIEW (HR & ADMIN COMMAND CENTER)       */}
        {/* ======================================================== */}
        <TabsContent value="overview" className="space-y-6">
          {/* 4 Clean Dashboard Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Completion Rate
                </p>
                <div className="rounded-2xl bg-primary/10 p-2 w-9 h-9 flex items-center justify-center text-primary">
                  <Award className="size-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-3xl font-semibold tracking-tight text-foreground">
                  {overviewData?.stats?.completionRate || 0}%
                </p>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {overviewData?.stats?.evaluatedCount || 0}/{overviewData?.stats?.totalEmployees || 0} Evaluated
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mt-2">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${overviewData?.stats?.completionRate || 0}%` }}
                />
              </div>
            </Card>

            <Card className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Grade GOOD (⭐⭐⭐)
                </p>
                <div className="rounded-2xl bg-emerald-500/10 p-2 w-9 h-9 flex items-center justify-center text-emerald-600">
                  <Star className="size-4 fill-current" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-3xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {overviewData?.stats?.goodCount || 0}
                </p>
                <Badge className="rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] px-2 font-medium whitespace-nowrap">
                  Full Bonus
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground whitespace-nowrap">Eligible for performance incentive bonus</p>
            </Card>

            <Card className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Grade AVERAGE (⭐⭐)
                </p>
                <div className="rounded-2xl bg-amber-500/10 p-2 w-9 h-9 flex items-center justify-center text-amber-600">
                  <CheckCircle2 className="size-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-3xl font-semibold tracking-tight text-amber-600 dark:text-amber-400">
                  {overviewData?.stats?.avgCount || 0}
                </p>
                <Badge className="rounded-full bg-amber-500/10 text-amber-600 text-[10px] px-2 font-medium whitespace-nowrap">
                  Standard
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground whitespace-nowrap">Standard baseline performance</p>
            </Card>

            <Card className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Needs Improvement (⭐)
                </p>
                <div className="rounded-2xl bg-rose-500/10 p-2 w-9 h-9 flex items-center justify-center text-rose-600">
                  <AlertTriangle className="size-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-3xl font-semibold tracking-tight text-rose-600 dark:text-rose-400">
                  {overviewData?.stats?.needsImpCount || 0}
                </p>
                <Badge className="rounded-full bg-rose-500/10 text-rose-600 text-[10px] px-2 font-medium whitespace-nowrap">
                  Action Needed
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground whitespace-nowrap">Flagged for supervisor review</p>
            </Card>
          </div>

          {/* Main Table Card */}
          <Card className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
            <CardHeader className="flex-row items-center justify-between pb-3 px-6">
              <div>
                <CardTitle className="text-base font-semibold whitespace-nowrap">
                  Employee Performance Ratings ({selectedMonthObj.label} {selectedYear})
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
                  Manager evaluations and rating statuses across all departments
                </p>
              </div>
              <Badge className="rounded-full bg-primary/10 text-primary whitespace-nowrap">
                HR Master List
              </Badge>
            </CardHeader>

            {/* Filter Bar */}
            <div className="px-6 py-3 border-y border-border/40 flex flex-col sm:flex-row gap-3 items-center justify-between bg-muted/10">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center flex-1">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by employee name..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="pl-9 h-9 rounded-xl text-xs bg-background border-border/60 shadow-xs"
                  />
                </div>

                <Select
                  value={selectedDepartment}
                  onValueChange={(v) => {
                    setSelectedDepartment(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[180px] h-9 rounded-xl text-xs bg-background border-border/60 shadow-xs">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept: any) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchOverview()}
                disabled={isOverviewLoading}
                className="h-9 w-9 p-0 rounded-xl cursor-pointer"
              >
                <RefreshCw
                  className={`w-4 h-4 text-muted-foreground ${isOverviewLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>

            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto max-h-[520px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                <table className="w-full text-xs text-left border-collapse min-w-[850px]">
                  <thead className="sticky top-0 bg-card/95 backdrop-blur-md z-10 font-semibold text-muted-foreground uppercase border-b border-border/40">
                    <tr>
                      <th className="py-3 px-4 whitespace-nowrap">Employee</th>
                      <th className="py-3 px-3 whitespace-nowrap">Department & Role</th>
                      <th className="py-3 px-3 whitespace-nowrap">Evaluator</th>
                      <th className="py-3 px-2 text-center whitespace-nowrap">Discipline</th>
                      <th className="py-3 px-2 text-center whitespace-nowrap">Output</th>
                      <th className="py-3 px-2 text-center whitespace-nowrap">Attitude</th>
                      <th className="py-3 px-3 text-center whitespace-nowrap">Grade</th>
                      <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {paginatedOverviewRecords.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-muted-foreground whitespace-nowrap">
                          {isOverviewLoading ? "Loading KPI records..." : "No employee records found for this period."}
                        </td>
                      </tr>
                    ) : (
                      paginatedOverviewRecords.map((item) => {
                        const emp = item?.employee;
                        const ev = item?.evaluation;
                        if (!emp) return null;

                        const empFullName = `${emp.first_name || ""} ${emp.last_name || ""}`.trim();

                        return (
                          <tr
                            key={emp.id}
                            className="hover:bg-muted/20 transition-colors"
                          >
                            <td className="py-2.5 px-4 font-medium whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="w-8 h-8 border border-border/60 shrink-0">
                                  <AvatarImage src={emp.profile_path || ""} />
                                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                    {emp.first_name?.[0] || "E"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-semibold text-foreground whitespace-nowrap text-xs">
                                    {empFullName}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground whitespace-nowrap font-mono">
                                    EMP-{emp.id.toString().padStart(4, "0")}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <p className="font-medium text-foreground text-xs whitespace-nowrap">
                                {emp.department_employee_department_idTodepartment?.name || "General"}
                              </p>
                              <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {emp.positions?.name || "Staff"}
                              </p>
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground text-xs whitespace-nowrap">
                              {ev?.evaluator ? (
                                <span className="whitespace-nowrap font-medium text-foreground text-xs">
                                  {ev.evaluator.first_name} {ev.evaluator.last_name}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/50 italic text-[11px] whitespace-nowrap">Pending</span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center whitespace-nowrap">
                              {ev ? getRatingBadge(ev.discipline_rating) : <span className="text-muted-foreground text-xs whitespace-nowrap">-</span>}
                            </td>
                            <td className="py-2.5 px-2 text-center whitespace-nowrap">
                              {ev ? getRatingBadge(ev.output_rating) : <span className="text-muted-foreground text-xs whitespace-nowrap">-</span>}
                            </td>
                            <td className="py-2.5 px-2 text-center whitespace-nowrap">
                              {ev ? getRatingBadge(ev.attitude_rating) : <span className="text-muted-foreground text-xs whitespace-nowrap">-</span>}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {ev ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  {getGradeBadge(ev.overall_grade)}
                                  <span className="text-[10px] font-mono text-muted-foreground font-semibold whitespace-nowrap">
                                    {ev.total_score}
                                  </span>
                                </div>
                              ) : (
                                <Badge variant="outline" className="rounded-full text-[10px] text-muted-foreground whitespace-nowrap">
                                  Pending
                                </Badge>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {ev ? (
                                <Badge
                                  className={`rounded-full text-[10px] font-medium whitespace-nowrap capitalize ${
                                    ev.status === "approved"
                                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                      : "bg-primary/10 text-primary border-primary/20"
                                  }`}
                                >
                                  {ev.status}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="rounded-full text-[10px] text-muted-foreground whitespace-nowrap">
                                  Pending
                                </Badge>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right whitespace-nowrap">
                              {ev ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedEvalDetail({ eval: ev, employeeName: empFullName });
                                    setIsDetailOpen(true);
                                  }}
                                  className="h-7 px-2.5 rounded-lg text-xs text-primary hover:bg-primary/10 cursor-pointer font-medium whitespace-nowrap"
                                >
                                  View Note
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground/50 whitespace-nowrap">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls matching time-attendance/report */}
              {filteredOverviewRecords.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/30 px-6 py-4 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                      {locale === "km" ? "បង្ហាញ:" : "Show:"}
                    </span>
                    <Select
                      value={String(limit)}
                      onValueChange={(val) => {
                        setLimit(Number(val));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[85px] h-8 rounded-xl shadow-xs text-xs">
                        <SelectValue placeholder="10" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {locale === "km" ? "ជួរក្នុងមួយទំព័រ" : "Rows per page"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-xl shadow-xs text-xs font-medium cursor-pointer whitespace-nowrap"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      {tc("previous")}
                    </Button>
                    <span className="text-xs text-muted-foreground font-semibold px-2 whitespace-nowrap">
                      {tc("page")} {page} {tc("of")} {totalOverviewPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-xl shadow-xs text-xs font-medium cursor-pointer whitespace-nowrap"
                      onClick={() => setPage((p) => Math.min(totalOverviewPages, p + 1))}
                      disabled={page >= totalOverviewPages}
                    >
                      {tc("next")}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 2: ANNUAL 12-MONTH MATRIX (YEARLY AUDIT & REPORTING)  */}
        {/* ======================================================== */}
        <TabsContent value="yearly" className="space-y-6">
          <Card className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
            <CardHeader className="flex-row items-center justify-between pb-3 px-6">
              <div>
                <CardTitle className="text-base font-semibold whitespace-nowrap">
                  Annual 12-Month Performance Review ({selectedYear})
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
                  Automated yearly average score from 12 monthly reviews
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Select
                  value={selectedDepartment}
                  onValueChange={(v) => {
                    setSelectedDepartment(v);
                    setYearlyPage(1);
                  }}
                >
                  <SelectTrigger className="w-[180px] h-9 rounded-xl text-xs bg-background border-border/60 shadow-xs">
                    <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id.toString()}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchYearly()}
                  disabled={isYearlyLoading}
                  className="h-9 w-9 p-0 rounded-xl cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 text-muted-foreground ${isYearlyLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                <table className="w-full text-xs text-left border-collapse min-w-[1250px]">
                  <thead className="sticky top-0 bg-card/95 backdrop-blur-md z-10 font-semibold text-muted-foreground uppercase border-y border-border/40">
                    <tr>
                      <th className="py-3 px-6 min-w-[220px] whitespace-nowrap">Employee</th>
                      <th className="py-3 px-2 text-center whitespace-nowrap min-w-[50px]">Jan</th>
                      <th className="py-3 px-2 text-center whitespace-nowrap min-w-[50px]">Feb</th>
                      <th className="py-3 px-2 text-center whitespace-nowrap min-w-[50px]">Mar</th>
                      <th className="py-3 px-2 text-center whitespace-nowrap min-w-[50px]">Apr</th>
                      <th className="py-3 px-2 text-center whitespace-nowrap min-w-[50px]">May</th>
                      <th className="py-3 px-2 text-center whitespace-nowrap min-w-[50px]">Jun</th>
                      <th className="py-3 px-2 text-center whitespace-nowrap min-w-[50px]">Jul</th>
                      <th className="py-3 px-2 text-center whitespace-nowrap min-w-[50px]">Aug</th>
                      <th className="py-3 px-2 text-center whitespace-nowrap min-w-[50px]">Sep</th>
                      <th className="py-3 px-2 text-center whitespace-nowrap min-w-[50px]">Oct</th>
                      <th className="py-3 px-2 text-center whitespace-nowrap min-w-[50px]">Nov</th>
                      <th className="py-3 px-2 text-center whitespace-nowrap min-w-[50px]">Dec</th>
                      <th className="py-3 px-3 text-center min-w-[110px] whitespace-nowrap">Yearly Avg</th>
                      <th className="py-3 px-6 text-center min-w-[140px] whitespace-nowrap">Annual Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {isYearlyLoading ? (
                      <tr>
                        <td colSpan={15} className="text-center py-12 text-muted-foreground whitespace-nowrap">
                          Calculating annual averages...
                        </td>
                      </tr>
                    ) : paginatedYearlyEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={15} className="text-center py-12 text-muted-foreground whitespace-nowrap">
                          No employees found for annual review.
                        </td>
                      </tr>
                    ) : (
                      paginatedYearlyEmployees.map((row) => {
                        if (!row?.employee) return null;
                        return (
                          <tr key={row.employee.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 px-6 whitespace-nowrap">
                              <p className="font-semibold text-foreground whitespace-nowrap">
                                {row.employee.first_name} {row.employee.last_name}
                              </p>
                              <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                                {row.employee.department_employee_department_idTodepartment?.name || "General"}
                              </p>
                            </td>

                            {Array.isArray(row.months) &&
                              row.months.map((mObj, idx) => (
                                <td key={idx} className="py-2.5 px-2 text-center whitespace-nowrap">
                                  {mObj ? (
                                    <span
                                      title={`Score: ${mObj.score} / Grade: ${mObj.grade}`}
                                      className={`inline-block w-6 h-6 leading-6 text-[10px] font-bold rounded-lg text-white shadow-xs ${
                                        mObj.grade === "GOOD"
                                          ? "bg-emerald-500"
                                          : mObj.grade === "AVERAGE"
                                          ? "bg-amber-500"
                                          : "bg-rose-500"
                                      }`}
                                    >
                                      {mObj.grade === "GOOD" ? "G" : mObj.grade === "AVERAGE" ? "A" : "NI"}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/30 text-[10px] font-mono">-</span>
                                  )}
                                </td>
                              ))}

                            <td className="py-2.5 px-3 text-center font-mono font-bold text-xs whitespace-nowrap">
                              {row.evaluatedMonths > 0 ? (
                                <span className="text-foreground whitespace-nowrap">
                                  {row.yearlyAverageScore} <span className="text-[10px] font-normal text-muted-foreground">/ 3.0</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs font-normal whitespace-nowrap">N/A</span>
                              )}
                            </td>

                            <td className="py-2.5 px-6 text-center whitespace-nowrap">
                              {row.evaluatedMonths > 0 ? (
                                getGradeBadge(row.yearlyGrade)
                              ) : (
                                <Badge variant="outline" className="rounded-full text-[10px] text-muted-foreground whitespace-nowrap">
                                  No Reviews
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls for Yearly Matrix */}
              {filteredYearlyEmployees.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/30 px-6 py-4 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                      {locale === "km" ? "បង្ហាញ:" : "Show:"}
                    </span>
                    <Select
                      value={String(yearlyLimit)}
                      onValueChange={(val) => {
                        setYearlyLimit(Number(val));
                        setYearlyPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[85px] h-8 rounded-xl shadow-xs text-xs">
                        <SelectValue placeholder="10" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {locale === "km" ? "ជួរក្នុងមួយទំព័រ" : "Rows per page"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-xl shadow-xs text-xs font-medium cursor-pointer whitespace-nowrap"
                      onClick={() => setYearlyPage((p) => Math.max(1, p - 1))}
                      disabled={yearlyPage === 1}
                    >
                      {tc("previous")}
                    </Button>
                    <span className="text-xs text-muted-foreground font-semibold px-2 whitespace-nowrap">
                      {tc("page")} {yearlyPage} {tc("of")} {totalYearlyPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-xl shadow-xs text-xs font-medium cursor-pointer whitespace-nowrap"
                      onClick={() => setYearlyPage((p) => Math.min(totalYearlyPages, p + 1))}
                      disabled={yearlyPage >= totalYearlyPages}
                    >
                      {tc("next")}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Evaluation Detail Modal (For HR inspection) */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Award className="w-4 h-4 text-primary" /> Evaluation Detail
            </DialogTitle>
            <DialogDescription className="text-xs">
              Manager ratings breakdown and feedback comment
            </DialogDescription>
          </DialogHeader>

          {selectedEvalDetail?.eval && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl border border-border/40">
                <div>
                  <p className="font-semibold text-sm text-foreground whitespace-nowrap">
                    {selectedEvalDetail.employeeName || selectedEvalDetail.eval.employee?.first_name || "Employee"}
                  </p>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    Month {selectedEvalDetail.eval.month} / {selectedEvalDetail.eval.year}
                  </p>
                </div>
                <div>{getGradeBadge(selectedEvalDetail.eval.overall_grade)}</div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 bg-muted/20 rounded-2xl border border-border/30">
                  <p className="text-muted-foreground text-[10px] whitespace-nowrap">Discipline</p>
                  <p className="mt-1">{getRatingBadge(selectedEvalDetail.eval.discipline_rating)}</p>
                </div>
                <div className="p-2.5 bg-muted/20 rounded-2xl border border-border/30">
                  <p className="text-muted-foreground text-[10px] whitespace-nowrap">Work Output</p>
                  <p className="mt-1">{getRatingBadge(selectedEvalDetail.eval.output_rating)}</p>
                </div>
                <div className="p-2.5 bg-muted/20 rounded-2xl border border-border/30">
                  <p className="text-muted-foreground text-[10px] whitespace-nowrap">Attitude</p>
                  <p className="mt-1">{getRatingBadge(selectedEvalDetail.eval.attitude_rating)}</p>
                </div>
              </div>

              <div className="p-3 bg-muted/20 rounded-2xl border border-border/40 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Manager Feedback / Comments:</p>
                <p className="text-xs text-foreground italic">
                  {selectedEvalDetail.eval.manager_comment ? `"${selectedEvalDetail.eval.manager_comment}"` : "No specific notes left."}
                </p>
              </div>

              <div className="text-right text-[11px] text-muted-foreground whitespace-nowrap">
                Evaluated by Manager: {selectedEvalDetail.eval.evaluator?.first_name} {selectedEvalDetail.eval.evaluator?.last_name || ""}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
