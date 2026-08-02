"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
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
import { createPayrollPeriod } from "@/services/payroll.services";
import { toast } from "sonner";

export default function PayrollPeriodsPage() {
  const t = useTranslations("payroll");
  const tc = useTranslations("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    pay_date: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await createPayrollPeriod(form);
      if (res.result) {
        toast.success(t("periodCreated"));
        router.push("/dashboard/payroll");
      }
    } catch {
      toast.error(t("periodCreateError"));
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
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="start-date">{t("startDate")}</Label>
                <DatePicker
                  id="start-date"
                  value={form.start_date}
                  onChange={(start_date) => setForm({ ...form, start_date })}
                  placeholder={tc("selectDate")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">{t("endDate")}</Label>
                <DatePicker
                  id="end-date"
                  value={form.end_date}
                  onChange={(end_date) => setForm({ ...form, end_date })}
                  placeholder={tc("selectDate")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-date">{t("payDate")}</Label>
                <DatePicker
                  id="pay-date"
                  value={form.pay_date}
                  onChange={(pay_date) => setForm({ ...form, pay_date })}
                  placeholder={tc("selectDate")}
                />
              </div>
            </div>

            <Button type="submit" disabled={loading || !form.start_date || !form.end_date || !form.pay_date}>
              {loading ? tc("creating") : tc("create")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
