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

export default function KpiTemplatesPage() {
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
      toast.success("Template created successfully!");
      setIsDialogOpen(false);
      setFormData({ name: "", description: "" });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Error creating template");
    }
  });

  const goalMutation = useMutation({
    mutationFn: ({ templateId, data }: { templateId: number, data: any }) => addTemplateGoal(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-templates"] });
      toast.success("Goal added to template!");
      setIsGoalDialogOpen(false);
      setGoalData({ category: "Performance", title: "", target_value: "", target_unit: "%", weight: "" });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Error adding goal");
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

  if (isLoading) return <LoadingState variant="card" count={3} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">KPI Templates</h1>
          <p className="text-sm text-muted-foreground">
            Create standard goals to assign to whole departments.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gap-2">
              <Plus className="size-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleTemplateSubmit}>
              <DialogHeader>
                <DialogTitle>New KPI Template</DialogTitle>
                <DialogDescription>Create a preset of goals (e.g. IT Department KPI)</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input 
                    placeholder="e.g. Software Engineer KPI" 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input 
                    placeholder="Standard evaluation for developers" 
                    value={formData.description} 
                    onChange={e => setFormData({ ...formData, description: e.target.value })} 
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={templateMutation.isPending}>
                  {templateMutation.isPending ? "Saving..." : "Save Template"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {templates?.map((t: any) => {
          const isExpanded = expandedTemplates[t.id];
          const totalWeight = t.kpitemplategoal?.reduce((sum: number, g: any) => sum + g.weight, 0) || 0;

          return (
            <Card key={t.id} className="overflow-hidden">
              <CardHeader className="p-0">
                <div 
                  className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(t.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <FileText className="size-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{t.name}</CardTitle>
                      <CardDescription>{t.description || "No description"} • Total Weight: {totalWeight}%</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTemplate(t);
                        setIsGoalDialogOpen(true);
                      }}
                    >
                      <Plus className="size-4 mr-1" /> Add Goal
                    </Button>
                    {isExpanded ? <ChevronDown className="size-5 text-muted-foreground" /> : <ChevronRight className="size-5 text-muted-foreground" />}
                  </div>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="bg-gray-50/50 border-t p-6">
                  {t.kpitemplategoal?.length > 0 ? (
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
                        {t.kpitemplategoal.map((g: any) => (
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
                    <div className="text-center text-muted-foreground py-4">No goals added yet.</div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
        {(!templates || templates.length === 0) && (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
            <FileText className="size-8 text-gray-300 mx-auto mb-3" />
            <p className="text-muted-foreground">No templates created yet.</p>
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
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={goalMutation.isPending}>
                {goalMutation.isPending ? "Adding..." : "Add Goal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
