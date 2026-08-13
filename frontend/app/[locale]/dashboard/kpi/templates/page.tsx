"use client";

import React, { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useKpiTemplates } from "@/hooks/useKpi";
import { createTemplate, addTemplateGoal } from "@/services/kpi.services";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, ChevronDown, ChevronRight, FileText } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

export default function KpiTemplatesPage() {
  const t = useTranslations("kpi");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const { data: templates, isLoading } = useKpiTemplates();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [goalData, setGoalData] = useState({
    category: "Performance",
    title: "",
    target_value: "",
    target_unit: "%",
    weight: ""
  });

  const [expandedTemplates, setExpandedTemplates] = useState<Record<number, boolean>>({});

  const templateMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-templates"] });
      toast.success(tCommon("success"));
      setIsDialogOpen(false);
      setFormData({ name: "", description: "" });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || tCommon("error"));
    }
  });

  const goalMutation = useMutation({
    mutationFn: ({ templateId, data }: { templateId: number, data: any }) => addTemplateGoal(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-templates"] });
      toast.success(tCommon("success"));
      setIsGoalDialogOpen(false);
      setGoalData({ category: "Performance", title: "", target_value: "", target_unit: "%", weight: "" });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || tCommon("error"));
    }
  });

  const handleTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Name is required");
    templateMutation.mutate(formData);
  };

  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalData.title || !goalData.target_value || !goalData.weight) return toast.error("Fill required fields");
    goalMutation.mutate({
      templateId: selectedTemplate.id,
      data: {
        ...goalData,
        target_value: parseFloat(goalData.target_value),
        weight: parseFloat(goalData.weight)
      }
    });
  };

  const toggleExpand = (id: number) => {
    setExpandedTemplates(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 rounded-md animate-pulse" />
            <Skeleton className="h-4 w-72 rounded animate-pulse" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl animate-pulse" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="overflow-hidden p-6 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0 animate-pulse" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-1/4 rounded animate-pulse" />
                  <Skeleton className="h-4 w-1/3 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <Skeleton className="h-8 w-24 rounded-lg animate-pulse" />
                <Skeleton className="h-5 w-5 rounded animate-pulse" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("step2Title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("step2Desc")}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gap-2">
              <Plus className="size-4" />
              {t("step2Btn")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleTemplateSubmit}>
              <DialogHeader>
                <DialogTitle>{t("step2Title")}</DialogTitle>
                <DialogDescription>{t("step2Desc")}</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label>{tCommon("name")}</Label>
                  <Input 
                    placeholder="e.g. Software Engineer KPI" 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tCommon("description")}</Label>
                  <Input 
                    placeholder="Standard evaluation for developers" 
                    value={formData.description} 
                    onChange={e => setFormData({ ...formData, description: e.target.value })} 
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">{tCommon("cancel")}</Button>
                </DialogClose>
                <Button type="submit" disabled={templateMutation.isPending}>
                  {templateMutation.isPending ? tCommon("saving") : tCommon("save")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {templates?.map((tItem: any) => {
          const isExpanded = expandedTemplates[tItem.id];
          const totalWeight = tItem.kpitemplategoal?.reduce((sum: number, g: any) => sum + g.weight, 0) || 0;

          return (
            <Card key={tItem.id} className="overflow-hidden">
              <CardHeader className="p-0">
                <div 
                  className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(tItem.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <FileText className="size-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{tItem.name}</CardTitle>
                      <CardDescription>{tItem.description || "No description"} • Total Weight: {totalWeight}%</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTemplate(tItem);
                        setIsGoalDialogOpen(true);
                      }}
                    >
                      <Plus className="size-4 mr-1" /> {tCommon("add")}
                    </Button>
                    {isExpanded ? <ChevronDown className="size-5 text-muted-foreground" /> : <ChevronRight className="size-5 text-muted-foreground" />}
                  </div>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="bg-gray-50/50 border-t p-6">
                  {tItem.kpitemplategoal?.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 text-muted-foreground font-medium">Category</th>
                          <th className="text-left py-2 text-muted-foreground font-medium">Goal</th>
                          <th className="text-left py-2 text-muted-foreground font-medium">Target</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tItem.kpitemplategoal.map((g: any) => (
                          <tr key={g.id} className="border-b last:border-0">
                            <td className="py-3 font-medium">{g.category}</td>
                            <td className="py-3">{g.title}</td>
                            <td className="py-3">{g.target_value} {g.target_unit}</td>
                            <td className="py-3 text-right font-medium">{g.weight}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">{tCommon("noData")}</div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
        {(!templates || templates.length === 0) && (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
            <FileText className="size-8 text-gray-300 mx-auto mb-3" />
            <p className="text-muted-foreground">{tCommon("noData")}</p>
          </div>
        )}
      </div>

      {/* Goal Dialog */}
      <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
        <DialogContent>
          <form onSubmit={handleGoalSubmit}>
            <DialogHeader>
              <DialogTitle>Add Goal to {selectedTemplate?.name}</DialogTitle>
              <DialogDescription>Define a measurable target.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={goalData.category} onValueChange={val => setGoalData({ ...goalData, category: val })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Attendance">Attendance</SelectItem>
                    <SelectItem value="Performance">Performance</SelectItem>
                    <SelectItem value="Teamwork">Teamwork</SelectItem>
                    <SelectItem value="Professionalism">Professionalism</SelectItem>
                    <SelectItem value="Development">Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Goal Title</Label>
                <Input placeholder="e.g. Complete 50 story points" value={goalData.title} onChange={e => setGoalData({ ...goalData, title: e.target.value })} required />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Target Value</Label>
                  <Input type="number" placeholder="e.g. 100" value={goalData.target_value} onChange={e => setGoalData({ ...goalData, target_value: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Input placeholder="%, tasks, days" value={goalData.target_unit} onChange={e => setGoalData({ ...goalData, target_unit: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Weight (%)</Label>
                  <Input type="number" placeholder="e.g. 20" value={goalData.weight} onChange={e => setGoalData({ ...goalData, weight: e.target.value })} required />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">{tCommon("cancel")}</Button>
              </DialogClose>
              <Button type="submit" disabled={goalMutation.isPending}>
                {goalMutation.isPending ? tCommon("saving") : tCommon("add")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
