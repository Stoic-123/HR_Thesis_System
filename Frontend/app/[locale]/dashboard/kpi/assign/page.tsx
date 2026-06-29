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

export default function KpiAssignPage() {
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
      toast.success(data.message || "Assigned successfully!");
      setFormData({ ...formData, department_id: "" }); // Reset dept
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Error assigning template");
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
        <h1 className="text-2xl font-semibold tracking-tight">Assign KPI Templates</h1>
        <p className="text-sm text-muted-foreground">
          Deploy predefined KPI templates to entire departments or the whole company for an active cycle.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersRound className="size-5 text-primary" />
            Batch Assignment
          </CardTitle>
          <CardDescription>This action will automatically generate KPI tracking records for all active employees in the selected group.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2">
                <Label>Active Performance Cycle</Label>
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
                {activeCycles.length === 0 && (
                  <p className="text-xs text-red-500">No active cycles found. Please create one first.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>KPI Template</Label>
                <Select value={formData.template_id} onValueChange={(val) => setFormData({ ...formData, template_id: val })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((t: any) => (
                      <SelectItem key={t.id} value={t.id.toString()}>{t.name} ({t.kpitemplategoal?.length || 0} goals)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Target Department</Label>
                <Select value={formData.department_id} onValueChange={(val) => setFormData({ ...formData, department_id: val })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a department..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="font-semibold text-primary">All Departments (Company Wide)</SelectItem>
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
              {mutation.isPending ? "Assigning..." : (
                <>
                  <CheckCircle2 className="size-4 mr-2" />
                  Deploy KPIs to Department
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
