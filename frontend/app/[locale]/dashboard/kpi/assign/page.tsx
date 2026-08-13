"use client";

import React, { useState } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useKpiCycles, useKpiTemplates } from "@/hooks/useKpi";
import { assignTemplate } from "@/services/kpi.services";
import { getDepartments } from "@/services/department.services";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UsersRound, CheckCircle2 } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

export default function KpiAssignPage() {
  const t = useTranslations("kpi");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const { data: cycles, isLoading: loadingCycles } = useKpiCycles();
  const { data: templates, isLoading: loadingTemplates } = useKpiTemplates();
  
  const { data: deptData, isLoading: loadingDepts } = useQuery({
    queryKey: ["departments-all"],
    queryFn: () => getDepartments(null, 1, 100),
  });
  const departments = deptData?.data || [];

  const [formData, setFormData] = useState({
    cycle_id: "",
    template_id: "",
    department_id: ""
  });

  const mutation = useMutation({
    mutationFn: assignTemplate,
    onSuccess: (data) => {
      toast.success(data.message || tCommon("success"));
      setFormData({ ...formData, department_id: "" });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || tCommon("error"));
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cycle_id || !formData.template_id || !formData.department_id) {
      return toast.error("Please select all fields");
    }
    
    mutation.mutate({
      cycle_id: parseInt(formData.cycle_id),
      template_id: parseInt(formData.template_id),
      department_id: formData.department_id === 'all' ? 'all' : parseInt(formData.department_id)
    });
  };

  if (loadingCycles || loadingTemplates || loadingDepts) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded-md animate-pulse" />
          <Skeleton className="h-4 w-96 rounded animate-pulse" />
        </div>
        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 rounded animate-pulse" />
            <Skeleton className="h-4 w-72 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded animate-pulse" />
              <Skeleton className="h-10 w-full rounded-xl animate-pulse" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded animate-pulse" />
              <Skeleton className="h-10 w-full rounded-xl animate-pulse" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Skeleton className="h-4 w-32 rounded animate-pulse" />
              <Skeleton className="h-10 w-full rounded-xl animate-pulse" />
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <Skeleton className="h-11 w-40 rounded-xl animate-pulse" />
          </div>
        </Card>
      </div>
    );
  }

  const activeCycles = cycles?.filter((c: any) => c.status === "active") || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("step3Title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("step3Desc")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersRound className="size-5 text-primary" />
            {t("step3Title")}
          </CardTitle>
          <CardDescription>{t("step3Desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2">
                <Label>{t("tab1")}</Label>
                <Select value={formData.cycle_id} onValueChange={(val) => setFormData({ ...formData, cycle_id: val })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a cycle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCycles.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("tab2")}</Label>
                <Select value={formData.template_id} onValueChange={(val) => setFormData({ ...formData, template_id: val })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((tItem: any) => (
                      <SelectItem key={tItem.id} value={tItem.id.toString()}>{tItem.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>{tCommon("department")}</Label>
                <Select value={formData.department_id} onValueChange={(val) => setFormData({ ...formData, department_id: val })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a department..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="font-semibold text-primary">{tCommon("all")}</SelectItem>
                    {departments?.map((d: any) => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full rounded-xl" 
              size="lg"
              disabled={mutation.isPending || activeCycles.length === 0}
            >
              {mutation.isPending ? tCommon("submitting") : (
                <>
                  <CheckCircle2 className="size-4 mr-2" />
                  {t("step3Btn")}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
