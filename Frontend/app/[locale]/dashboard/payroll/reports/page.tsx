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
  exportPayrollPdf,
  getPayrollPeriods,
  type PayrollPeriod,
} from "@/services/payroll.services";
import { toast } from "sonner";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8080";

export default function PayrollReportsPage() {
  const t = useTranslations("payroll");
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [reportType, setReportType] = useState<"monthly" | "history" | "summary">("summary");
  const [periodId, setPeriodId] = useState<string>("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    getPayrollPeriods().then((res) => {
      if (res.result) setPeriods(res.data);
    });
  }, []);

  const handleExport = async (format: "excel" | "pdf") => {
    setLoading(format);
    try {
      const body = {
        report_type: reportType,
        year: Number(year),
        payroll_period_id: periodId ? Number(periodId) : undefined,
      };
      const res =
        format === "excel"
          ? await exportPayrollExcel(body)
          : await exportPayrollPdf(body);

      if (res.result && res.data?.downloadUrl) {
        window.open(`${API_BASE}${res.data.downloadUrl}`, "_blank");
        toast.success(t("exportSuccess"));
      }
    } catch {
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
                setReportType(v as "monthly" | "history" | "summary")
              }
            >
              <SelectTrigger className="h-9 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">{t("monthlyReport")}</SelectItem>
                <SelectItem value="history">{t("historyReport")}</SelectItem>
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
