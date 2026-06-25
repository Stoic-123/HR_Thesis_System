"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/routing";
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  DollarSign,
  Users,
  Wallet,
  Trash2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import {
  getPayrollDashboard,
  getPayrollPeriods,
  generatePayroll,
  approvePayroll,
  markPayrollPaid,
  syncPayrollPeriodBaseSalaries,
  deletePayrollPeriod,
  type PayrollDashboard,
  type PayrollPeriod,
} from "@/services/payroll.services";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { cn } from "@/lib/utils";
import { translatePayrollStatus } from "@/lib/payrollStatus";

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  generated: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  approved: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

export default function PayrollDashboardPage() {
  const t = useTranslations("payroll");
  const tc = useTranslations("common");
  const [dashboard, setDashboard] = useState<PayrollDashboard | null>(null);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState<number | null>(null);

  const load = async () => {
    try {
      const [dashRes, periodRes] = await Promise.all([
        getPayrollDashboard(),
        getPayrollPeriods(),
      ]);
      if (dashRes.result) setDashboard(dashRes.data);
      if (periodRes.result) setPeriods(periodRes.data);
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runAction = async (
    periodId: number,
    action: "generate" | "approve" | "paid" | "sync",
  ) => {
    setActionLoading(periodId);
    try {
      if (action === "generate") await generatePayroll(periodId);
      if (action === "approve") await approvePayroll(periodId);
      if (action === "paid") await markPayrollPaid(periodId);
      if (action === "sync") {
        const res = await syncPayrollPeriodBaseSalaries(periodId);
        toast.success(res.message || tc("syncSuccess", { defaultMessage: "Synced successfully" }));
      } else {
        toast.success(t(`${action}Success`));
      }
      await load();
    } catch {
      toast.error(t("actionError"));
    } finally {
      setActionLoading(null);
    }
  };

  const promptDelete = (periodId: number) => {
    setPeriodToDelete(periodId);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!periodToDelete) return;
    try {
      const res = await deletePayrollPeriod(periodToDelete);
      if (res.result) {
        toast.success(tc("deletedSuccess", { defaultMessage: "Deleted successfully" }));
        load();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || tc("error", { defaultMessage: "An error occurred" }));
    } finally {
      setDeleteModalOpen(false);
      setPeriodToDelete(null);
    }
  };

  if (loading) return <LoadingState variant="dashboard" />;

  const cards = [
    {
      label: t("currentPeriod"),
      value: dashboard?.currentPeriod?.name || tc("notSet"),
      icon: CalendarClock,
      iconBg: "bg-orange-100 text-orange-600",
      accent: "from-orange-500/10 to-transparent",
    },
    {
      label: t("totalEmployees"),
      value: dashboard?.totalEmployees ?? 0,
      icon: Users,
      iconBg: "bg-blue-100 text-blue-600",
      accent: "from-blue-500/10 to-transparent",
    },
    {
      label: t("totalGross"),
      value: `$${(dashboard?.totalGrossSalary ?? 0).toLocaleString()}`,
      icon: DollarSign,
      iconBg: "bg-violet-100 text-violet-600",
      accent: "from-violet-500/10 to-transparent",
    },
    {
      label: t("totalNet"),
      value: `$${(dashboard?.totalNetSalary ?? 0).toLocaleString()}`,
      icon: Wallet,
      iconBg: "bg-emerald-100 text-emerald-600",
      accent: "from-emerald-500/10 to-transparent",
    },
    {
      label: t("approvedPayrolls"),
      value: dashboard?.approvedPayrolls ?? 0,
      icon: CheckCircle2,
      iconBg: "bg-amber-100 text-amber-600",
      accent: "from-amber-500/10 to-transparent",
    },
    {
      label: t("paidPayrolls"),
      value: dashboard?.paidPayrolls ?? 0,
      icon: Banknote,
      iconBg: "bg-green-100 text-green-600",
      accent: "from-green-500/10 to-transparent",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/payroll/periods">{t("managePeriods")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard/payroll/reports">{t("reports")}</Link>
          </Button>
        </div>
      </div>

      {dashboard?.daysUntilNextPayroll != null && (
        <Card className="overflow-hidden rounded-3xl border-primary/20 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
            <div>
              <p className="text-sm font-medium opacity-90">{t("nextPayroll")}</p>
              <p className="text-3xl font-bold tabular-nums">
                {dashboard.daysUntilNextPayroll} {t("days")}
              </p>
            </div>
            <p className="text-sm opacity-90">
              {t("payDate")}:{" "}
              {dashboard.nextPayDate
                ? new Date(dashboard.nextPayDate).toLocaleDateString()
                : tc("notSet")}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Card
            key={card.label}
            className="relative overflow-hidden rounded-3xl border-border/50 shadow-sm"
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0 bg-gradient-to-br",
                card.accent,
              )}
            />
            <CardContent className="relative flex items-center gap-4 py-5">
              <div className={cn("rounded-2xl p-3", card.iconBg)}>
                <card.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </p>
                <p className="truncate text-xl font-semibold tabular-nums">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>{t("monthlySummary")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={dashboard?.monthlySummary || []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => `$${Number(v || 0).toLocaleString()}`} />
              <Bar dataKey="netSalary" fill="var(--color-primary, var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>{t("periods")}</CardTitle>
          <CardDescription>{t("reviewSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {periods.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{tc("noData")}</p>
          ) : (
            periods.map((period) => (
              <div
                key={period.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4"
              >
                <div>
                  <p className="font-semibold">{period.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(period.start_date).toLocaleDateString()} –{" "}
                    {new Date(period.end_date).toLocaleDateString()} · {t("payDate")}:{" "}
                    {new Date(period.pay_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={statusColor[period.status]}>
                    {translatePayrollStatus(t, period.status)}
                  </Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/payroll/review?period=${period.id}`}>
                      {t("review")}
                    </Link>
                  </Button>
                  {period.status === "draft" && (
                    <Button
                      size="sm"
                      disabled={actionLoading === period.id}
                      onClick={() => runAction(period.id, "generate")}
                    >
                      {t("generate")}
                    </Button>
                  )}
                  {period.status === "generated" && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={actionLoading === period.id}
                        onClick={() => runAction(period.id, "sync")}
                      >
                        {actionLoading === period.id ? "..." : tc("sync", { defaultMessage: "Sync Salaries" })}
                      </Button>
                      <Button
                        size="sm"
                        disabled={actionLoading === period.id}
                        onClick={() => runAction(period.id, "approve")}
                      >
                        {t("approve")}
                      </Button>
                    </>
                  )}
                  {period.status === "approved" && (
                    <Button
                      size="sm"
                      disabled={actionLoading === period.id}
                      onClick={() => runAction(period.id, "paid")}
                    >
                      {t("markPaid")}
                    </Button>
                  )}
                  {["draft", "generated"].includes(period.status) && (
                    <Button
                      size="icon"
                      variant="destructive"
                      disabled={actionLoading === period.id}
                      onClick={() => promptDelete(period.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        title={tc("areYouSure", { defaultMessage: "Are you sure?" })}
        description={t("deleteWarning", { defaultMessage: "All generated payrolls inside this period will be permanently deleted. This action cannot be undone." })}
        confirmText={tc("delete", { defaultMessage: "Delete" })}
        cancelText={tc("cancel", { defaultMessage: "Cancel" })}
      />
    </div>
  );
}
