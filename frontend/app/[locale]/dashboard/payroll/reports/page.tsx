"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { FileSpreadsheet, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  exportPayrollExcel,
  getPayrollPeriods,
  getPayrolls,
  type PayrollPeriod,
} from "@/services/payroll.services";
import { useMe } from "@/hooks/useMe";
import { exportReportToPDF } from "@/lib/pdf-export";
import dayjs from "dayjs";
import { toast } from "sonner";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8080";

export default function PayrollReportsPage() {
  const t = useTranslations("payroll");
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [reportType, setReportType] = useState<"monthly" | "summary">("monthly");
  const [periodId, setPeriodId] = useState<string>("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState<string | null>(null);
  const { data: user } = useMe();

  useEffect(() => {
    getPayrollPeriods().then((res) => {
      if (res.result && res.data) {
        setPeriods(res.data);
        if (res.data.length > 0) {
          setPeriodId(String(res.data[0].id));
        }
      }
    });
  }, []);

  const handleExport = async (format: "excel" | "pdf") => {
    if (reportType === "monthly" && !periodId) {
      toast.error(t("selectPeriod"));
      return;
    }

    setLoading(format);
    try {
      const body = {
        report_type: reportType,
        year: Number(year),
        payroll_period_id: reportType === "monthly" && periodId ? Number(periodId) : undefined,
      };

      if (format === "excel") {
        const res = await exportPayrollExcel(body);
        if (res.result && res.data?.downloadUrl) {
          const downloadUrl = `${API_BASE}${res.data.downloadUrl}`;
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.setAttribute("download", res.data.fileName || "payroll_report.xlsx");
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success(t("exportSuccess"));
        } else {
          toast.error(res.message || t("exportError"));
        }
      } else {
        // PDF Export on Frontend to follow exact attendance / overtime theme
        let params: any = {};
        if (reportType === "monthly" && periodId) {
          params.payroll_period_id = Number(periodId);
        }

        const res = await getPayrolls(params);
        if (res.result) {
          let records = res.data || [];

          // Filter by year if report type is summary
          if (reportType === "summary" && year) {
            records = records.filter((r: any) => {
              const dateStr = r.payrollperiod?.start_date;
              return dateStr && dayjs(dateStr).year() === Number(year);
            });
          }

          let titleKh = "របាយការណ៍សង្ខេបប្រាក់បៀវត្សរ៍ប្រចាំឆ្នាំ";
          let titleEn = `Annual Payroll Summary Report (${year})`;
          let typeLabel = `ប្រចាំឆ្នាំ ${year} / Annual (${year})`;

          if (reportType === "monthly") {
            const periodName = periods.find(p => String(p.id) === periodId)?.name || "";
            titleKh = "របាយការណ៍បើកប្រាក់បៀវត្សរ៍ប្រចាំខែ";
            titleEn = `Monthly Payroll Report - ${periodName}`;
            typeLabel = `ប្រចាំខែ - ${periodName} / Monthly - ${periodName}`;
          }

          const userFullName = user?.employee ? `${user.employee.first_name} ${user.employee.last_name}` : "";
          const apiBaseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
          const companyLogo = user?.employee?.company?.logo_path
            ? (user.employee.company.logo_path.startsWith("http")
                ? user.employee.company.logo_path
                : `${apiBaseURL}${user.employee.company.logo_path}`)
            : "";

          exportReportToPDF({
            titleKh,
            titleEn,
            companyName: user?.employee?.company?.name || "ក្រុមហ៊ុន សារណៈ",
            companyLogo,
            orientation: "landscape",
            metadata: [
              { labelKh: "កាលបរិច្ឆេទ", labelEn: "Date", value: dayjs().format("YYYY-MM-DD") },
              { labelKh: "ប្រភេទរបាយការណ៍", labelEn: "Report Type", value: typeLabel },
              { labelKh: "រៀបចំដោយ", labelEn: "Prepared By", value: userFullName || "រដ្ឋបាល / Admin" }
            ],
            tableHeaders: [
              { kh: "ឈ្មោះបុគ្គលិក", en: "Employee Name" },
              { kh: "គ្រាកាល", en: "Period", align: "center" },
              { kh: "ប្រាក់ខែគោល", en: "Base Salary", align: "right" },
              { kh: "ប្រាក់ឧបត្ថម្ភ", en: "Allowance", align: "right" },
              { kh: "ម៉ោងបន្ថែម", en: "Overtime", align: "right" },
              { kh: "ប្រាក់លើកទឹកចិត្ត", en: "Bonus", align: "right" },
              { kh: "ការកាត់ប្រាក់", en: "Deduction", align: "right" },
              { kh: "ពន្ធ", en: "Tax", align: "right" },
              { kh: "ប្រាក់ខែសរុប", en: "Gross Salary", align: "right" },
              { kh: "ប្រាក់ខែសុទ្ធ", en: "Net Salary", align: "right" },
              { kh: "ស្ថានភាព", en: "Status", align: "center" }
            ],
            tableRows: records.map((row: any) => {
              const empName = row.employee ? `${row.employee.first_name} ${row.employee.last_name}` : "N/A";
              const periodName = row.payrollperiod?.name || "-";

              const statusText = row.status.toUpperCase();
              let statusColor = "text-emerald";
              if (row.status === "draft") statusColor = "text-amber";
              if (row.status === "paid") statusColor = "text-emerald";

              return {
                cells: [
                  { text: `<strong>${empName}</strong>`, align: "left" as const },
                  { text: periodName, align: "center" as const },
                  { text: `$${row.base_salary.toFixed(2)}`, align: "right" as const },
                  { text: `$${row.allowance.toFixed(2)}`, align: "right" as const },
                  { text: `$${row.overtime.toFixed(2)}`, align: "right" as const },
                  { text: `$${row.bonus.toFixed(2)}`, align: "right" as const },
                  { text: `$${row.deduction.toFixed(2)}`, align: "right" as const },
                  { text: `$${row.tax.toFixed(2)}`, align: "right" as const },
                  { text: `$${row.gross_salary.toFixed(2)}`, align: "right" as const },
                  { text: `$${row.net_salary.toFixed(2)}`, align: "right" as const },
                  { text: `<span class="${statusColor}">${statusText}</span>`, align: "center" as const }
                ]
              };
            }),
            preparedBy: userFullName
          });
          toast.success(t("exportSuccess"));
        } else {
          toast.error(t("exportError"));
        }
      }
    } catch (error) {
      toast.error(t("exportError"));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("reportsTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("reportsSubtitle")}</p>
      </div>

      <Card className="rounded-3xl border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>{t("exportReports")}</CardTitle>
          <CardDescription>{t("reportsSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>{t("reportType")}</Label>
            <Select
              value={reportType}
              onValueChange={(v) =>
                setReportType(v as "monthly" | "summary")
              }
            >
              <SelectTrigger className="h-9 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">{t("monthlyReport")}</SelectItem>
                <SelectItem value="summary">{t("summaryReport")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reportType === "monthly" && (
            <div className="space-y-2">
              <Label>{t("selectPeriod")}</Label>
              <Select value={periodId} onValueChange={setPeriodId}>
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue placeholder={t("selectPeriod")} />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {reportType === "summary" && (
            <div className="space-y-2">
              <Label>{t("year")}</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025, 2026].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              className="gap-2"
              disabled={loading === "excel"}
              onClick={() => handleExport("excel")}
            >
              <FileSpreadsheet className="size-4" />
              {t("exportExcel")}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={loading === "pdf"}
              onClick={() => handleExport("pdf")}
            >
              <FileText className="size-4" />
              {t("exportPdf")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
