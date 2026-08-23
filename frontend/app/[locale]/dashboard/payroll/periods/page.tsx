"use client";

import React, { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/src/i18n/routing";
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
import { DatePicker } from "@/components/ui/date-picker";
import { createPayrollPeriod, getPayrollPeriods, type PayrollPeriod } from "@/services/payroll.services";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

export default function PayrollPeriodsPage() {
  const t = useTranslations("payroll");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [existingPeriods, setExistingPeriods] = useState<PayrollPeriod[]>([]);
  const [form, setForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    pay_date: "",
  });

  useEffect(() => {
    getPayrollPeriods()
      .then((res) => {
        if (res.result) setExistingPeriods(res.data);
      })
      .catch(() => {});
  }, []);

  const isDuplicateName =
    form.name.trim() !== "" &&
    existingPeriods.some(
      (p) => p.name.trim().toLowerCase() === form.name.trim().toLowerCase()
    );

  const overlappingPeriod =
    form.start_date && form.end_date
      ? existingPeriods.find((p) => {
          const pStart = p.start_date.split("T")[0];
          const pEnd = p.end_date.split("T")[0];
          return form.start_date <= pEnd && form.end_date >= pStart;
        })
      : null;

  const handleStartDateChange = (start_date: string) => {
    setForm((prev) => {
      const next = { ...prev, start_date };
      if (prev.end_date && start_date > prev.end_date) {
        next.end_date = start_date;
      }
      if (prev.pay_date && start_date > prev.pay_date) {
        next.pay_date = start_date;
      }
      return next;
    });
  };

  const handleEndDateChange = (end_date: string) => {
    setForm((prev) => ({
      ...prev,
      end_date,
    }));
  };

  const handlePayDateChange = (pay_date: string) => {
    setForm((prev) => ({
      ...prev,
      pay_date,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.start_date && form.end_date && form.start_date > form.end_date) {
      toast.error(locale === "km" ? "កាលបរិច្ឆេទបញ្ចប់មិនអាចមុនកាលបរិច្ឆេទចាប់ផ្តើមឡើយ" : "End date cannot be before start date");
      return;
    }

    if (isDuplicateName) {
      toast.error(
        locale === "km"
          ? `ឈ្មោះវដ្តបើកប្រាក់បៀវត្ស "${form.name}" មានរួចហើយ`
          : `A payroll period named "${form.name}" already exists`
      );
      return;
    }

    if (overlappingPeriod) {
      toast.error(
        locale === "km"
          ? `ចន្លោះកាលបរិច្ឆេទជាន់គ្នាជាមួយវដ្ត "${overlappingPeriod.name}"`
          : `Date range overlaps with existing period "${overlappingPeriod.name}"`
      );
      return;
    }

    setLoading(true);
    try {
      const res = await createPayrollPeriod(form);
      if (res.result) {
        toast.success(t("periodCreated"));
        router.push("/dashboard/payroll");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("periodCreateError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("createPeriod")}</h1>
        <p className="text-sm text-muted-foreground">{t("createPeriodDesc")}</p>
      </div>

      <Card className="rounded-3xl border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>{t("periodDetails")}</CardTitle>
          <CardDescription>{t("createPeriodDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="period-name">{tc("name")}</Label>
              <Input
                id="period-name"
                className="h-9 rounded-lg"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("periodNamePlaceholder")}
                required
              />
              {isDuplicateName && (
                <p className="text-xs text-rose-500 flex items-center gap-1 font-medium mt-1">
                  <AlertCircle className="size-3.5" />
                  {locale === "km"
                    ? `ឈ្មោះ "${form.name}" នេះមានរួចហើយ`
                    : `A payroll period with this name already exists`}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="start-date">{t("startDate")}</Label>
                <DatePicker
                  id="start-date"
                  value={form.start_date}
                  maxDate={form.end_date || undefined}
                  onChange={handleStartDateChange}
                  placeholder={tc("selectDate")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">{t("endDate")}</Label>
                <DatePicker
                  id="end-date"
                  value={form.end_date}
                  minDate={form.start_date || undefined}
                  onChange={handleEndDateChange}
                  placeholder={tc("selectDate")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-date">{t("payDate")}</Label>
                <DatePicker
                  id="pay-date"
                  value={form.pay_date}
                  minDate={form.start_date || undefined}
                  onChange={handlePayDateChange}
                  placeholder={tc("selectDate")}
                />
              </div>
            </div>

            {overlappingPeriod && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0 text-rose-600" />
                <span>
                  {locale === "km"
                    ? `កាលបរិច្ឆេទនេះជាន់គ្នាជាមួយវដ្តដែលមានស្រាប់: "${overlappingPeriod.name}" (${overlappingPeriod.start_date.split("T")[0]} ដល់ ${overlappingPeriod.end_date.split("T")[0]})`
                    : `This date range overlaps with existing period: "${overlappingPeriod.name}" (${overlappingPeriod.start_date.split("T")[0]} to ${overlappingPeriod.end_date.split("T")[0]})`}
                </span>
              </div>
            )}

            <Button
              type="submit"
              disabled={
                loading ||
                !form.start_date ||
                !form.end_date ||
                !form.pay_date ||
                isDuplicateName ||
                Boolean(overlappingPeriod)
              }
            >
              {loading ? tc("creating") : tc("create")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
