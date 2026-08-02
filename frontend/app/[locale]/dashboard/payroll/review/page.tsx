"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/routing";
import { Search } from "lucide-react";
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
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import {
  getPayrolls,
  getPayrollPeriods,
  type PayrollRecord,
  type PayrollPeriod,
} from "@/services/payroll.services";
import { translatePayrollStatus } from "@/lib/payrollStatus";

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  generated: "secondary",
  approved: "default",
  paid: "default",
  draft: "outline",
};

export default function PayrollReviewPage() {
  const t = useTranslations("payroll");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    searchParams.get("period") || "",
  );
  const [search, setSearch] = useState("");
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPayrollPeriods().then((res) => {
      if (res.result) {
        setPeriods(res.data);
        if (!selectedPeriod && res.data[0]) {
          setSelectedPeriod(String(res.data[0].id));
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedPeriod) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getPayrolls({
      payroll_period_id: Number(selectedPeriod),
      search: search || undefined,
    })
      .then((res) => {
        if (res.result) setPayrolls(res.data);
      })
      .finally(() => setLoading(false));
  }, [selectedPeriod, search]);

  const activePeriod = periods.find((p) => String(p.id) === selectedPeriod);
  const isReadOnly =
    activePeriod?.status === "approved" || activePeriod?.status === "paid";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("reviewTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("reviewSubtitle")}</p>
      </div>

      <Card className="rounded-3xl border-border/50 shadow-sm">
        <CardHeader className="border-b border-border/40">
          <CardTitle>{t("payrollTable")}</CardTitle>
          <CardDescription>
            {activePeriod
              ? `${activePeriod.name} · ${new Date(activePeriod.start_date).toLocaleDateString()} – ${new Date(activePeriod.end_date).toLocaleDateString()}`
              : t("selectPeriod")}
          </CardDescription>
          <CardAction>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("selectPeriod")}</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="h-9 w-48 rounded-lg">
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
              <div className="relative space-y-1.5">
                <Label className="text-xs text-muted-foreground">{tc("search")}</Label>
                <Search className="pointer-events-none absolute bottom-2.5 left-3 size-4 text-muted-foreground" />
                <Input
                  className="h-9 w-52 rounded-lg pl-9"
                  placeholder={tc("search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <LoadingState variant="table" count={8} />
          ) : payrolls.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{tc("noData")}</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{t("employee")}</TableHead>
                    <TableHead className="text-right">{t("baseSalary")}</TableHead>
                    <TableHead className="text-right">{t("allowance")}</TableHead>
                    <TableHead className="text-right">{t("overtime")}</TableHead>
                    <TableHead className="text-right">{t("bonus")}</TableHead>
                    <TableHead className="text-right">{t("deduction")}</TableHead>
                    <TableHead className="text-right">{t("tax")}</TableHead>
                    <TableHead className="text-right">{t("netSalary")}</TableHead>
                    <TableHead>{tc("status")}</TableHead>
                    <TableHead className="text-right">{tc("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.employee
                          ? `${row.employee.first_name} ${row.employee.last_name}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${row.base_salary.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${row.allowance.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${row.overtime.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${row.bonus.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${row.deduction.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${row.tax.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        ${row.net_salary.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge className="text-white" variant={statusVariant[row.status] || "outline"}>
                          {translatePayrollStatus(t, row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/payroll/${row.id}`}>
                            {isReadOnly ? tc("view") : tc("edit")}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
