"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/routing";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Clock,
  CalendarCheck,
  Zap,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import {
  getPayrollById,
  updatePayroll,
  getPayslipUrl,
  type PayrollRecord,
} from "@/services/payroll.services";
import { computePayrollPreview } from "@/lib/payrollTax";
import { cn } from "@/lib/utils";
import { translatePayrollStatus } from "@/lib/payrollStatus";
import { useMe } from "@/hooks/useMe";
import { exportPayslipToPDF } from "@/lib/pdf-export";

const EDITABLE_FIELDS = [
  "allowance",
  "overtime",
  "bonus",
  "deduction",
] as const;

function MoneyField({
  label,
  value,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  value: number;
  onChange?: (val: number) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          $
        </span>
        <Input
          type="number"
          step="0.01"
          min="0"
          disabled={disabled}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange?.(Number(e.target.value))}
          className={cn("h-9 rounded-lg pl-7 tabular-nums", disabled && "bg-muted")}
        />
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default function PayrollDetailPage() {
  const t = useTranslations("payroll");
  const tc = useTranslations("common");
  const { data: user } = useMe();

  const handleDownloadPayslip = () => {
    if (!payroll) return;
    const apiBaseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const companyLogo = user?.employee?.company?.logo_path
      ? (user.employee.company.logo_path.startsWith("http")
          ? user.employee.company.logo_path
          : `${apiBaseURL}${user.employee.company.logo_path}`)
      : "";

    exportPayslipToPDF({
      payroll,
      companyName: user?.employee?.company?.name || "ក្រុមហ៊ុន សារណៈ",
      companyLogo,
    });
  };
  const params = useParams();
  const id = Number(params.id);
  const [payroll, setPayroll] = useState<PayrollRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    base_salary: 0,
    allowance: 0,
    overtime: 0,
    bonus: 0,
    deduction: 0,
    reason: "",
  });

  const load = async () => {
    try {
      const res = await getPayrollById(id);
      if (res.result) {
        setPayroll(res.data);
        setForm({
          base_salary: res.data.base_salary,
          allowance: res.data.allowance,
          overtime: res.data.overtime,
          bonus: res.data.bonus,
          deduction: res.data.deduction,
          reason: "",
        });
      }
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  const isReadOnly =
    payroll?.status === "approved" || payroll?.status === "paid";

  const { gross, tax, net } = computePayrollPreview(form);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updatePayroll(id, form);
      if (res.result) {
        toast.success(t("updateSuccess"));
        setPayroll(res.data);
        setForm((prev) => ({
          ...prev,
          base_salary: res.data.base_salary,
          allowance: res.data.allowance,
          overtime: res.data.overtime,
          bonus: res.data.bonus,
          deduction: res.data.deduction,
          reason: "",
        }));
      }
    } catch {
      toast.error(t("updateError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState variant="detail" />;
  if (!payroll) return <p className="text-sm text-muted-foreground">{tc("noData")}</p>;

  const employee = payroll.employee;
  const ctx = payroll.periodContext;
  const formatDate = (value: string) => format(new Date(value), "MMM d, yyyy");
  const formatMoney = (value: number) => `$${value.toFixed(2)}`;

  const fieldLabels: Record<(typeof EDITABLE_FIELDS)[number], string> = {
    allowance: t("allowance"),
    overtime: t("overtime"),
    bonus: t("bonus"),
    deduction: t("deduction"),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("detailTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {employee?.first_name} {employee?.last_name} · {payroll.payrollperiod?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/payroll/review">{tc("back")}</Link>
          </Button>
          {payroll.status === "paid" && (
            <Button onClick={handleDownloadPayslip} size="sm">
              {t("downloadPayslip")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-3xl border-border/50 shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle>{t("employeeInfo")}</CardTitle>
            <CardDescription>{payroll.payrollperiod?.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-2xl border border-border/50 bg-muted/20 px-4 py-3">
              <p className="text-xs text-muted-foreground">{tc("name")}</p>
              <p className="font-medium">
                {employee?.first_name} {employee?.last_name}
              </p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-muted/20 px-4 py-3">
              <p className="text-xs text-muted-foreground">{tc("position")}</p>
              <p className="font-medium">{employee?.positions?.name || tc("notSet")}</p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-muted/20 px-4 py-3">
              <p className="text-xs text-muted-foreground">{tc("department")}</p>
              <p className="font-medium">
                {employee?.department_employee_department_idTodepartment?.name || tc("notSet")}
              </p>
            </div>
            <Badge variant="outline" className="rounded-full capitalize">
              {translatePayrollStatus(t, payroll.status)}
            </Badge>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/50 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("salaryBreakdown")}</CardTitle>
            <CardDescription>{t("reviewSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <MoneyField
              label={t("baseSalary")}
              value={form.base_salary}
              disabled
              hint={tc("fromEmployeeProfile", { defaultMessage: "Snapshot from Employee Profile" })}
            />
            
            {EDITABLE_FIELDS.map((key) => (
              <MoneyField
                key={key}
                label={fieldLabels[key]}
                value={form[key]}
                disabled={isReadOnly}
                onChange={(value) => setForm({ ...form, [key]: value })}
              />
            ))}

            <MoneyField
              label={t("tax")}
              value={tax}
              disabled
              hint={t("taxAutoCalc")}
            />

            {!isReadOnly && (
              <div className="space-y-2 sm:col-span-2">
                <Label>{t("adjustmentReason")}</Label>
                <Input
                  className="h-9 rounded-lg"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder={t("adjustmentReasonPlaceholder")}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {ctx && (
        <Card className="rounded-3xl border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/20 pb-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-amber-500" />
              <div>
                <CardTitle className="text-base">{t("periodSummaryTitle")}</CardTitle>
                <CardDescription className="text-xs">{t("periodSummaryDesc")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-3">
              {/* 1. LATE ATTENDANCE CARD */}
              <div className="flex flex-col justify-between rounded-2xl border border-amber-200/60 bg-amber-50/40 p-4 sm:p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      {t("lateDays")}
                    </span>
                    <div className="rounded-xl bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                      <Clock className="size-4" />
                    </div>
                  </div>

                  <div>
                    <p className="text-2xl sm:text-3xl font-bold tabular-nums text-amber-900 dark:text-amber-100">
                      {ctx.lateDays}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        {t("daysUnit")}
                      </span>
                    </p>
                  </div>

                  <div className="space-y-1.5 rounded-xl border border-amber-200/60 bg-background/90 p-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("dailyRate")}:</span>
                      <span className="font-semibold tabular-nums">
                        {formatMoney(ctx.reference.dailyRate)}
                      </span>
                    </div>
                    <div className="flex justify-between text-red-600 font-medium">
                      <span>{t("suggestedLateDeduction")}:</span>
                      <span className="tabular-nums font-bold">
                        -{formatMoney(ctx.reference.suggestedLateDeduction)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      {t("referenceNote")}
                    </p>
                  </div>
                </div>

                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={ctx.reference.suggestedLateDeduction <= 0}
                    className="mt-4 w-full rounded-xl border-amber-300 bg-amber-100/60 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200 text-xs font-semibold gap-1.5"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        deduction: ctx.reference.suggestedLateDeduction,
                      }))
                    }
                  >
                    <ArrowDownRight className="size-3.5" />
                    {t("applyLateDeduction")} ({formatMoney(ctx.reference.suggestedLateDeduction)})
                  </Button>
                )}
              </div>

              {/* 2. LEAVE REQUESTS CARD */}
              <div className="flex flex-col justify-between rounded-2xl border border-blue-200/60 bg-blue-50/40 p-4 sm:p-5 dark:border-blue-900/50 dark:bg-blue-950/20">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                      {t("leaveDays")}
                    </span>
                    <div className="rounded-xl bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      <CalendarCheck className="size-4" />
                    </div>
                  </div>

                  <div>
                    <p className="text-2xl sm:text-3xl font-bold tabular-nums text-blue-900 dark:text-blue-100">
                      {ctx.leaveDays}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        {t("daysUnit")}
                      </span>
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground">{t("leaveBreakdown")}</p>
                    {ctx.leaveRecords.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-3">
                        {t("noLeaveThisPeriod")}
                      </p>
                    ) : (
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                        {ctx.leaveRecords.map((leave) => (
                          <div
                            key={leave.id}
                            className="rounded-xl border border-blue-200/60 bg-background/90 px-3 py-2 text-xs"
                          >
                            <p className="font-semibold text-foreground">{leave.leave_type}</p>
                            <p className="text-muted-foreground text-[11px]">
                              {formatDate(leave.start_date)} – {formatDate(leave.end_date)} ·{" "}
                              <span className="font-semibold text-blue-600">{leave.days} {t("daysUnit")}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. OVERTIME (OT) CARD */}
              <div className="flex flex-col justify-between rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-4 sm:p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      {t("otBreakdown")}
                    </span>
                    <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      <Zap className="size-4" />
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-2xl sm:text-3xl font-bold tabular-nums text-emerald-900 dark:text-emerald-100">
                      {ctx.overtime.totalHours}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        {t("hoursUnit")}
                      </span>
                    </p>
                    <p className="text-lg sm:text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{formatMoney(ctx.overtime.totalAmount)}
                    </p>
                  </div>

                  <div className="space-y-1.5 rounded-xl border border-emerald-200/60 bg-background/90 p-3 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t("otHourlyRate")}:</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatMoney(ctx.overtime.hourlyRate)}/hr
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      {t("otRateNote")}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    {ctx.overtime.records.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-1">
                        {t("noOtThisPeriod")}
                      </p>
                    ) : (
                      <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                        {ctx.overtime.records.map((ot) => (
                          <div
                            key={ot.id}
                            className="rounded-xl border border-emerald-200/60 bg-background/90 px-3 py-1.5 text-xs"
                          >
                            <div className="flex justify-between font-medium">
                              <span>{formatDate(ot.start_date)}</span>
                              <span className="font-semibold text-emerald-600">{ot.hours} {t("hoursUnit")}</span>
                            </div>
                            <p className="text-muted-foreground text-[11px] truncate">
                              {format(new Date(ot.start_date), "HH:mm")}–{format(new Date(ot.end_date), "HH:mm")}
                              {ot.reason ? ` · ${ot.reason}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={ctx.overtime.totalAmount <= 0}
                    className="mt-4 w-full rounded-xl border-emerald-300 bg-emerald-100/60 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 text-xs font-semibold gap-1.5"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        overtime: ctx.overtime.totalAmount,
                      }))
                    }
                  >
                    <ArrowUpRight className="size-3.5" />
                    {t("applyOtAmount")} ({formatMoney(ctx.overtime.totalAmount)})
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-3xl border-blue-200/60 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="py-5">
            <p className="text-sm text-blue-700 dark:text-blue-300">{t("grossSalary")}</p>
            <p className="text-2xl font-bold tabular-nums text-blue-900 dark:text-blue-100">
              ${gross.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-red-200/60 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="py-5">
            <p className="text-sm text-red-700 dark:text-red-300">{t("tax")}</p>
            <p className="text-2xl font-bold tabular-nums text-red-900 dark:text-red-100">
              ${tax.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-orange-200/60 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="py-5">
            <p className="text-sm text-orange-700 dark:text-orange-300">{t("netSalary")}</p>
            <p className="text-2xl font-bold tabular-nums text-orange-900 dark:text-orange-100">
              ${net.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {!isReadOnly && (
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? tc("saving") : tc("save")}
        </Button>
      )}

      {payroll.payrolladjustment && payroll.payrolladjustment.length > 0 && (
        <Card className="rounded-3xl border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>{t("adjustmentHistory")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {payroll.payrolladjustment.map((adj) => (
              <div key={adj.id} className="rounded-xl border border-border/50 p-3">
                <p className="font-medium capitalize">{adj.field.replace("_", " ")}</p>
                <p className="text-muted-foreground tabular-nums">
                  {Number(adj.old_value).toFixed(2)} → {Number(adj.new_value).toFixed(2)}
                  {adj.reason ? ` · ${adj.reason}` : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
