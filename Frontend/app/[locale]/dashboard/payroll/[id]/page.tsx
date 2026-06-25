"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/routing";
import { format } from "date-fns";
import { toast } from "sonner";
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
import { computePayrollPreview, SALARY_TAX_BRACKETS_USD } from "@/lib/payrollTax";
import { cn } from "@/lib/utils";
import { translatePayrollStatus } from "@/lib/payrollStatus";

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
  onChange?: (value: number) => void;
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

function SummaryStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone: "amber" | "blue" | "emerald";
}) {
  const tones = {
    amber: "text-amber-700 dark:text-amber-400",
    blue: "text-blue-700 dark:text-blue-400",
    emerald: "text-emerald-700 dark:text-emerald-400",
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", tones[tone])}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export default function PayrollDetailPage() {
  const t = useTranslations("payroll");
  const tc = useTranslations("common");
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
            <Button asChild size="sm">
              <a href={getPayslipUrl(id)} target="_blank" rel="noreferrer">
                {t("downloadPayslip")}
              </a>
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
        <Card className="rounded-3xl border-amber-200/50 bg-amber-50/40 shadow-sm dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle>{t("periodSummaryTitle")}</CardTitle>
            <CardDescription>{t("periodSummaryDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryStat
                label={t("lateDays")}
                tone="amber"
                value={
                  <>
                    {ctx.lateDays}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      {t("daysUnit")}
                    </span>
                  </>
                }
              />
              <SummaryStat
                label={t("leaveDays")}
                tone="blue"
                value={
                  <>
                    {ctx.leaveDays}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      {t("daysUnit")}
                    </span>
                  </>
                }
              />
              <SummaryStat
                label={t("otTotalHours")}
                tone="emerald"
                value={
                  <>
                    {ctx.overtime.totalHours}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      {t("hoursUnit")}
                    </span>
                  </>
                }
              />
              <SummaryStat
                label={t("otTotalAmount")}
                tone="emerald"
                value={formatMoney(ctx.overtime.totalAmount)}
                sub={`${t("otHourlyRate")}: ${formatMoney(ctx.overtime.hourlyRate)} · ${t("otRateNote")}`}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm">
                <span className="text-muted-foreground">{t("dailyRate")}: </span>
                <span className="font-medium tabular-nums">
                  {formatMoney(ctx.reference.dailyRate)}
                </span>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm">
                <span className="text-muted-foreground">{t("suggestedLateDeduction")}: </span>
                <span className="font-medium tabular-nums text-red-600">
                  {formatMoney(ctx.reference.suggestedLateDeduction)}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">{t("referenceNote")}</span>
              </div>
            </div>

            {!isReadOnly && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={ctx.overtime.totalAmount <= 0}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      overtime: ctx.overtime.totalAmount,
                    }))
                  }
                >
                  {t("applyOtAmount")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={ctx.reference.suggestedLateDeduction <= 0}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      deduction: ctx.reference.suggestedLateDeduction,
                    }))
                  }
                >
                  {t("applyLateDeduction")}
                </Button>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-background p-4">
                <p className="mb-3 font-medium">{t("leaveBreakdown")}</p>
                {ctx.leaveRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("noLeaveThisPeriod")}</p>
                ) : (
                  <div className="space-y-2">
                    {ctx.leaveRecords.map((leave) => (
                      <div
                        key={leave.id}
                        className="rounded-xl border border-border/50 px-3 py-2 text-sm"
                      >
                        <p className="font-medium">{leave.leave_type}</p>
                        <p className="text-muted-foreground">
                          {formatDate(leave.start_date)} – {formatDate(leave.end_date)} ·{" "}
                          {leave.days} {t("daysUnit")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border/60 bg-background p-4">
                <p className="mb-3 font-medium">{t("otBreakdown")}</p>
                {ctx.overtime.records.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("noOtThisPeriod")}</p>
                ) : (
                  <div className="space-y-2">
                    {ctx.overtime.records.map((ot) => (
                      <div
                        key={ot.id}
                        className="rounded-xl border border-border/50 px-3 py-2 text-sm"
                      >
                        <p className="font-medium">
                          {formatDate(ot.start_date)} · {ot.hours} {t("hoursUnit")}
                        </p>
                        <p className="text-muted-foreground">
                          {format(new Date(ot.start_date), "HH:mm")} –{" "}
                          {format(new Date(ot.end_date), "HH:mm")}
                          {ot.reason ? ` · ${ot.reason}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-3xl border-dashed border-border/60">
        <CardHeader>
          <CardTitle className="text-base">{t("taxBracketsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {SALARY_TAX_BRACKETS_USD.map((bracket, index) => {
              const prev = SALARY_TAX_BRACKETS_USD[index - 1]?.upTo ?? 0;
              const label =
                bracket.upTo === Infinity
                  ? `> $${prev.toFixed(2)}`
                  : `$${(prev + 0.01).toFixed(2)} – $${bracket.upTo.toFixed(2)}`;
              return (
                <div key={index} className="rounded-xl border border-border/50 px-3 py-2">
                  <p className="font-medium tabular-nums">{label}</p>
                  <p className="text-muted-foreground">{bracket.rateLabel}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
