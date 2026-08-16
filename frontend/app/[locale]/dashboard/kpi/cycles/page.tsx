"use client";

import React, { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useKpiCycles } from "@/hooks/useKpi";
import { createCycle } from "@/services/kpi.services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Target } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/loading-state";
import { useTranslations, useLocale } from "next-intl";

export default function KpiCyclesPage() {
  const t = useTranslations("kpi");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { data: cycles, isLoading } = useKpiCycles();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: ""
  });

  const mutation = useMutation({
    mutationFn: createCycle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-cycles"] });
      toast.success(tCommon("success"));
      setIsDialogOpen(false);
      setFormData({ name: "", start_date: "", end_date: "" });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || tCommon("error"));
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.start_date || !formData.end_date) {
      return toast.error("All fields are required");
    }
    mutation.mutate({
      ...formData,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(formData.end_date).toISOString()
    });
  };

  if (isLoading) return <LoadingState variant="table" count={5} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("step1Title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("step1Desc")}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gap-2">
              <Plus className="size-4" />
              {t("step1Btn")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px] rounded-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">{t("createCycle")}</DialogTitle>
                <DialogDescription>{t("createCycleDesc")}</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-zinc-700">{tCommon("name")}</Label>
                  <Input 
                    placeholder={t("cycleNamePlaceholder")} 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                    required 
                    className="rounded-xl"
                  />
                </div>
                <DateRangePicker
                  startDate={formData.start_date}
                  endDate={formData.end_date}
                  onStartDateChange={(val) => setFormData({ ...formData, start_date: val })}
                  onEndDateChange={(val) => setFormData({ ...formData, end_date: val })}
                  fromLabel={locale === "km" ? "ពី" : "From"}
                  toLabel={locale === "km" ? "ដល់" : "To"}
                />
              </div>
              <DialogFooter className="gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="rounded-xl">{tCommon("cancel")}</Button>
                </DialogClose>
                <Button type="submit" disabled={mutation.isPending} className="rounded-xl">
                  {mutation.isPending ? tCommon("saving") : (t("saveCycle") || tCommon("save"))}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-2xl border shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-zinc-50/50">
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">{tCommon("name")}</th>
                  <th className="px-4 py-4 text-left font-semibold text-muted-foreground">{locale === "km" ? "រយៈពេល" : "Duration"}</th>
                  <th className="px-4 py-4 text-left font-semibold text-muted-foreground">{tCommon("status")}</th>
                </tr>
              </thead>
              <tbody>
                {cycles?.map((c: any) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-zinc-50/30 transition-colors">
                    <td className="px-6 py-3.5 font-medium flex items-center gap-2">
                      <Target className="size-4 text-primary" />
                      {c.name}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {new Date(c.start_date).toLocaleDateString()} - {new Date(c.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge className={`rounded-full px-2.5 py-0.5 font-medium ${c.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-700 border-gray-200"}`}>
                        {c.status === "active" ? (locale === "km" ? "សកម្ម" : "ACTIVE") : (locale === "km" ? "អសកម្ម" : "INACTIVE")}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {!cycles?.length && (
                  <tr>
                    <td colSpan={3} className="h-24 px-4 text-center text-muted-foreground">
                      {tCommon("noData")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
