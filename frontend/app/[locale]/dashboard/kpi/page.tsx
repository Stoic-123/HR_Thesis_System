"use client";

import React, { useState } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useKpiCycles, useKpiTemplates } from "@/hooks/useKpi";
import {
  createCycle,
  createTemplate,
  addTemplateGoal,
  assignTemplate,
  getEvaluations,
  submitHrScore,
} from "@/services/kpi.services";
import { getDepartments } from "@/services/department.services";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Target, ChevronDown, ChevronRight, FileText, UsersRound, CheckCircle2, UserCircle, LayoutDashboard } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

export default function KpiDashboardPage() {
  const queryClient = useQueryClient();
  const tk = useTranslations("kpi");

  // Queries
  const { data: cycles, isLoading: loadingCycles } = useKpiCycles();
  const { data: templates, isLoading: loadingTemplates } = useKpiTemplates();
  const { data: deptData, isLoading: loadingDepts } = useQuery({
    queryKey: ["departments-all"],
    queryFn: () => getDepartments(null, 1, 100),
  });

  const departments = deptData?.data || [];
  const activeCycles = cycles?.filter((c: any) => c.status === "active") || [];

  // 1. Cycles State
  const [isCycleOpen, setIsCycleOpen] = useState(false);
  const [cycleForm, setCycleForm] = useState({ name: "", start_date: "", end_date: "" });

  const cycleMutation = useMutation({
    mutationFn: createCycle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-cycles"] });
      toast.success("KPI Cycle created successfully!");
      setIsCycleOpen(false);
      setCycleForm({ name: "", start_date: "", end_date: "" });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "An error occurred");
    },
  });

  const handleCycleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleForm.name || !cycleForm.start_date || !cycleForm.end_date) {
      return toast.error("All fields are required");
    }
    cycleMutation.mutate({
      ...cycleForm,
      start_date: new Date(cycleForm.start_date).toISOString(),
      end_date: new Date(cycleForm.end_date).toISOString(),
    });
  };

  // 2. Templates State
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: "", description: "" });
  const [isGoalOpen, setIsGoalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [goalData, setGoalData] = useState({
    category: "Performance",
    title: "",
    target_value: "",
    target_unit: "%",
    weight: "",
  });
  const [expandedTemplates, setExpandedTemplates] = useState<Record<number, boolean>>({});

  const templateMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-templates"] });
      toast.success("Template created successfully!");
      setIsTemplateOpen(false);
      setTemplateForm({ name: "", description: "" });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Error creating template");
    },
  });

  const goalMutation = useMutation({
    mutationFn: ({ templateId, data }: { templateId: number; data: any }) => addTemplateGoal(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-templates"] });
      toast.success("Goal added to template!");
      setIsGoalOpen(false);
      setGoalData({ category: "Performance", title: "", target_value: "", target_unit: "%", weight: "" });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Error adding goal");
    },
  });

  const handleTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name) return toast.error("Name is required");
    templateMutation.mutate(templateForm);
  };

  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalData.title || !goalData.target_value || !goalData.weight) return toast.error("Fill required fields");
    goalMutation.mutate({
      templateId: selectedTemplate.id,
      data: {
        ...goalData,
        target_value: parseFloat(goalData.target_value),
        weight: parseFloat(goalData.weight),
      },
    });
  };

  // 3. Assign State
  const [assignForm, setAssignForm] = useState({ cycle_id: "", template_id: "", department_id: "" });

  const assignMutation = useMutation({
    mutationFn: assignTemplate,
    onSuccess: (data) => {
      toast.success(data.message || "Assigned successfully!");
      setAssignForm({ ...assignForm, department_id: "" });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Error assigning template");
    },
  });

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.cycle_id || !assignForm.template_id || !assignForm.department_id) {
      return toast.error("Please select all fields");
    }
    assignMutation.mutate({
      cycle_id: parseInt(assignForm.cycle_id),
      template_id: parseInt(assignForm.template_id),
      department_id: assignForm.department_id === "all" ? "all" : parseInt(assignForm.department_id),
    });
  };

  // 4. Evaluate State
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const [selectedKpi, setSelectedKpi] = useState<any>(null);
  const [hrScores, setHrScores] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (activeCycles.length > 0 && !selectedCycleId) {
      setSelectedCycleId(activeCycles[0].id.toString());
    }
  }, [activeCycles, selectedCycleId]);

  const { data: evaluationsResponse, isLoading: loadingEvaluations } = useQuery({
    queryKey: ["kpi-evaluations", selectedCycleId],
    queryFn: () => getEvaluations(parseInt(selectedCycleId)),
    enabled: !!selectedCycleId,
  });

  const evaluations = evaluationsResponse?.data || [];

  const evaluationMutation = useMutation({
    mutationFn: submitHrScore,
    onSuccess: (data) => {
      toast.success(data.message || "Evaluation completed successfully!");
      queryClient.invalidateQueries({ queryKey: ["kpi-evaluations", selectedCycleId] });
      setSelectedKpi(null);
      setHrScores({});
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Error submitting evaluation");
    },
  });

  const handleEvaluateClick = (kpi: any) => {
    setSelectedKpi(kpi);
    const initialScores: Record<string, string> = {};
    kpi.kpigoal?.forEach((g: any) => {
      initialScores[g.id] = (g.hr_score || g.manager_score || 0).toString();
    });
    setHrScores(initialScores);
  };

  const handleSubmitEvaluation = () => {
    if (!selectedKpi) return;
    const formattedScores = selectedKpi.kpigoal.map((g: any) => ({
      goal_id: g.id,
      score: parseFloat(hrScores[g.id]) || 0,
    }));
    evaluationMutation.mutate({
      employee_kpi_id: selectedKpi.id,
      scores: formattedScores,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{tk("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {tk("subtitle")}
        </p>
      </div>

      <Tabs defaultValue="cycles" className="w-full space-y-6">
        <TabsList className="bg-muted p-1 rounded-xl flex-wrap h-auto">
          <TabsTrigger value="cycles" className="rounded-lg gap-2 py-2.5 px-3.5">
            <Target className="size-4" />
            {tk("tab1")}
          </TabsTrigger>
          <TabsTrigger value="templates" className="rounded-lg gap-2 py-2.5 px-3.5">
            <FileText className="size-4" />
            {tk("tab2")}
          </TabsTrigger>
          <TabsTrigger value="assign" className="rounded-lg gap-2 py-2.5 px-3.5">
            <UsersRound className="size-4" />
            {tk("tab3")}
          </TabsTrigger>
          <TabsTrigger value="evaluate" className="rounded-lg gap-2 py-2.5 px-3.5">
            <CheckCircle2 className="size-4" />
            {tk("tab4")}
          </TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* CYCLES TAB */}
        {/* ============================================================ */}
        <TabsContent value="cycles" className="space-y-4 outline-none">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{tk("step1Title")}</h2>
              <p className="text-xs text-muted-foreground">{tk("step1Desc")}</p>
            </div>

            <Dialog open={isCycleOpen} onOpenChange={setIsCycleOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl gap-2 shadow-md">
                  <Plus className="size-4" />
                  {tk("step1Btn")}
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <form onSubmit={handleCycleSubmit}>
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Create New KPI Cycle</DialogTitle>
                    <DialogDescription>Define the timeline for the performance review cycle.</DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="space-y-2">
                      <Label className="font-semibold text-zinc-700">Cycle Name</Label>
                      <Input
                        placeholder="e.g. 2026 Annual Performance"
                        value={cycleForm.name}
                        onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })}
                        required
                        className="rounded-xl"
                      />
                    </div>
                    <DateRangePicker
                      startDate={cycleForm.start_date}
                      endDate={cycleForm.end_date}
                      onStartDateChange={(val) => setCycleForm({ ...cycleForm, start_date: val })}
                      onEndDateChange={(val) => setCycleForm({ ...cycleForm, end_date: val })}
                      fromLabel="From"
                      toLabel="To"
                    />
                  </div>
                  <DialogFooter className="gap-2">
                    <DialogClose asChild>
                      <Button type="button" variant="outline" className="rounded-xl">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit" className="rounded-xl" disabled={cycleMutation.isPending}>
                      {cycleMutation.isPending ? "Saving..." : "Save Cycle"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="rounded-2xl border shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {loadingCycles ? (
                <div className="p-8">
                  <LoadingState variant="table" count={3} />
                </div>
              ) : !cycles || cycles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No KPI cycles found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50/50">
                      <TableRow>
                        <TableHead className="font-semibold py-4 pl-6">Cycle Name</TableHead>
                        <TableHead className="font-semibold">Duration</TableHead>
                        <TableHead className="font-semibold pr-6">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cycles.map((c: any) => (
                        <TableRow key={c.id} className="hover:bg-zinc-50/30 transition-colors">
                          <TableCell className="py-4 pl-6 font-semibold text-zinc-900">
                            <div className="flex items-center gap-2">
                              <Target className="size-4 text-primary" />
                              {c.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-zinc-600 font-mono text-xs">
                            {dayjs(c.start_date).format("YYYY-MM-DD")} - {dayjs(c.end_date).format("YYYY-MM-DD")}
                          </TableCell>
                          <TableCell className="pr-6">
                            <Badge
                              variant="outline"
                              className={`rounded-full px-2.5 py-0.5 font-medium ${
                                c.status === "active"
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : "bg-zinc-100 text-zinc-700 border-zinc-200"
                              }`}
                            >
                              {c.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================ */}
        {/* TEMPLATES TAB */}
        {/* ============================================================ */}
        <TabsContent value="templates" className="space-y-4 outline-none">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{tk("step2Title")}</h2>
              <p className="text-xs text-muted-foreground">{tk("step2Desc")}</p>
            </div>

            <Dialog open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl gap-2 shadow-md">
                  <Plus className="size-4" />
                  {tk("step2Btn")}
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <form onSubmit={handleTemplateSubmit}>
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold">New KPI Template</DialogTitle>
                    <DialogDescription>Create a preset of goals (e.g. IT Department KPI)</DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="space-y-2">
                      <Label className="font-semibold text-zinc-700">Template Name</Label>
                      <Input
                        placeholder="e.g. Software Engineer KPI"
                        value={templateForm.name}
                        onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                        required
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-zinc-700">Description</Label>
                      <Input
                        placeholder="Standard evaluation for developers"
                        value={templateForm.description}
                        onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <DialogClose asChild>
                      <Button type="button" variant="outline" className="rounded-xl">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit" className="rounded-xl" disabled={templateMutation.isPending}>
                      {templateMutation.isPending ? "Saving..." : "Save Template"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {loadingTemplates ? (
              <LoadingState variant="table" count={2} />
            ) : !templates || templates.length === 0 ? (
              <div className="text-center py-12 bg-zinc-50 rounded-2xl border border-dashed">
                <FileText className="size-8 text-zinc-300 mx-auto mb-3" />
                <p className="text-muted-foreground">No templates created yet.</p>
              </div>
            ) : (
              templates.map((t: any) => {
                const isExpanded = expandedTemplates[t.id];
                const totalWeight = t.kpitemplategoal?.reduce((sum: number, g: any) => sum + g.weight, 0) || 0;

                return (
                  <Card key={t.id} className="overflow-hidden rounded-2xl border shadow-sm">
                    <CardHeader className="p-0">
                      <div
                        className="flex items-center justify-between p-6 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                        onClick={() => setExpandedTemplates({ ...expandedTemplates, [t.id]: !isExpanded })}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            <FileText className="size-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-bold">{t.name}</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                              {t.description || "No description"} • Total Weight: {totalWeight}%
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTemplate(t);
                              setIsGoalOpen(true);
                            }}
                          >
                            <Plus className="size-4 mr-1" /> Add Goal
                          </Button>
                          {isExpanded ? (
                            <ChevronDown className="size-5 text-zinc-400" />
                          ) : (
                            <ChevronRight className="size-5 text-zinc-400" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="bg-zinc-50/30 border-t p-6">
                        {t.kpitemplategoal?.length > 0 ? (
                          <div className="overflow-x-auto rounded-xl border border-zinc-150 bg-white">
                            <Table>
                              <TableHeader className="bg-zinc-50/50">
                                <TableRow>
                                  <TableHead className="font-semibold py-3 pl-4">Category</TableHead>
                                  <TableHead className="font-semibold">Goal</TableHead>
                                  <TableHead className="font-semibold">Target</TableHead>
                                  <TableHead className="text-right font-semibold pr-4">Weight</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {t.kpitemplategoal.map((g: any) => (
                                  <TableRow key={g.id} className="hover:bg-zinc-50/20">
                                    <TableCell className="font-semibold text-zinc-900 py-3 pl-4">
                                      {g.category}
                                    </TableCell>
                                    <TableCell className="text-zinc-700">{g.title}</TableCell>
                                    <TableCell className="text-zinc-600 font-mono text-xs">
                                      {g.target_value} {g.target_unit}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-primary pr-4">
                                      {g.weight}%
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-center text-muted-foreground py-4">No goals added yet.</div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })
            )}
          </div>

          {/* Goal Dialog */}
          <Dialog open={isGoalOpen} onOpenChange={setIsGoalOpen}>
            <DialogContent className="rounded-2xl">
              <form onSubmit={handleGoalSubmit}>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Add Goal to {selectedTemplate?.name}</DialogTitle>
                  <DialogDescription>Define a measurable target weight and unit.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-zinc-700">Category</Label>
                    <Select
                      value={goalData.category}
                      onValueChange={(val) => setGoalData({ ...goalData, category: val })}
                    >
                      <SelectTrigger className="w-full rounded-xl">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Attendance">Attendance</SelectItem>
                        <SelectItem value="Performance">Performance</SelectItem>
                        <SelectItem value="Teamwork">Teamwork</SelectItem>
                        <SelectItem value="Professionalism">Professionalism</SelectItem>
                        <SelectItem value="Development">Development</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-zinc-700">Goal Title</Label>
                    <Input
                      placeholder="e.g. Complete 50 story points"
                      value={goalData.title}
                      onChange={(e) => setGoalData({ ...goalData, title: e.target.value })}
                      required
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="font-semibold text-zinc-700">Target Value</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 100"
                        value={goalData.target_value}
                        onChange={(e) => setGoalData({ ...goalData, target_value: e.target.value })}
                        required
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-zinc-700">Unit</Label>
                      <Input
                        placeholder="%, tasks, days"
                        value={goalData.target_unit}
                        onChange={(e) => setGoalData({ ...goalData, target_unit: e.target.value })}
                        required
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-zinc-700">Weight (%)</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 20"
                        value={goalData.weight}
                        onChange={(e) => setGoalData({ ...goalData, weight: e.target.value })}
                        required
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <DialogClose asChild>
                    <Button type="button" variant="outline" className="rounded-xl">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" className="rounded-xl" disabled={goalMutation.isPending}>
                    {goalMutation.isPending ? "Adding..." : "Add Goal"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ============================================================ */}
        {/* ASSIGN TAB */}
        {/* ============================================================ */}
        <TabsContent value="assign" className="space-y-6 outline-none">
          <div>
            <h2 className="text-lg font-bold">{tk("step3Title")}</h2>
            <p className="text-xs text-muted-foreground">
              {tk("step3Desc")}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="rounded-2xl border shadow-sm col-span-1 lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <UsersRound className="size-5 text-primary" />
                  Batch Assignment
                </CardTitle>
                <CardDescription>
                  This will automatically generate KPI tracking records for all active employees in the selected group.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCycles || loadingTemplates || loadingDepts ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full rounded-xl animate-pulse" />
                    <Skeleton className="h-10 w-full rounded-xl animate-pulse" />
                  </div>
                ) : (
                  <form onSubmit={handleAssignSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="font-semibold text-zinc-700">Active Performance Cycle</Label>
                        <Select
                          value={assignForm.cycle_id}
                          onValueChange={(val) => setAssignForm({ ...assignForm, cycle_id: val })}
                        >
                          <SelectTrigger className="w-full rounded-xl">
                            <SelectValue placeholder="Select a cycle..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {activeCycles.map((c: any) => (
                              <SelectItem key={c.id} value={c.id.toString()}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {activeCycles.length === 0 && (
                          <p className="text-xs text-red-500 font-semibold mt-1">
                            No active cycles found. Please create one first.
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="font-semibold text-zinc-700">KPI Template</Label>
                        <Select
                          value={assignForm.template_id}
                          onValueChange={(val) => setAssignForm({ ...assignForm, template_id: val })}
                        >
                          <SelectTrigger className="w-full rounded-xl">
                            <SelectValue placeholder="Select a template..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {templates?.map((t: any) => (
                              <SelectItem key={t.id} value={t.id.toString()}>
                                {t.name} ({t.kpitemplategoal?.length || 0} goals)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label className="font-semibold text-zinc-700">Target Department</Label>
                        <Select
                          value={assignForm.department_id}
                          onValueChange={(val) => setAssignForm({ ...assignForm, department_id: val })}
                        >
                          <SelectTrigger className="w-full rounded-xl">
                            <SelectValue placeholder="Select a department..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="all" className="font-semibold text-primary">
                              All Departments (Company Wide)
                            </SelectItem>
                            {departments?.map((d: any) => (
                              <SelectItem key={d.id} value={d.id.toString()}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full rounded-xl shadow-md gap-2"
                      size="lg"
                      disabled={assignMutation.isPending || activeCycles.length === 0}
                    >
                      {assignMutation.isPending ? (
                        "Assigning..."
                      ) : (
                        <>
                          <CheckCircle2 className="size-4" />
                          Deploy KPIs to Department
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-sm col-span-1 lg:col-span-2 bg-zinc-50/50">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-zinc-900">KPI Deployment Guide</CardTitle>
                <CardDescription>
                  Important instructions for deploying company KPIs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-zinc-600">
                <div className="space-y-2">
                  <h4 className="font-semibold text-zinc-900">What happens when I deploy?</h4>
                  <p>
                    Deploying a template will automatically generate active goal tracking sheets for all employees who currently belong to the selected department.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-zinc-900">Requirements:</h4>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>An active, published Performance Cycle must exist.</li>
                    <li>The target department must contain active employee profiles.</li>
                    <li>KPI goals must be configured on the selected template.</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-zinc-900">Note:</h4>
                  <p className="text-xs text-muted-foreground">
                    This action is a batch deploy. You will be able to review and grade each employee's final KPI from the <strong>HR Evaluation</strong> tab once the cycle finishes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================================ */}
        {/* EVALUATE TAB */}
        {/* ============================================================ */}
        <TabsContent value="evaluate" className="space-y-4 outline-none">
          <div>
            <h2 className="text-lg font-bold">{tk("step4Title")}</h2>
            <p className="text-xs text-muted-foreground">
              {tk("step4Desc")}
            </p>
          </div>

          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <CardTitle className="text-lg font-bold">Queue Settings</CardTitle>
                  <CardDescription>Select a cycle to view employees ready for final evaluation.</CardDescription>
                </div>
                <div className="w-full md:w-64">
                  <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select Cycle" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {activeCycles.map((c: any) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingEvaluations ? (
                <div className="p-8">
                  <LoadingState variant="table" count={3} />
                </div>
              ) : !selectedCycleId ? (
                <div className="text-center py-12 text-muted-foreground">Please select an active cycle</div>
              ) : evaluations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No KPI records found for this cycle.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50/50">
                      <TableRow>
                        <TableHead className="font-semibold py-4 pl-6">Employee</TableHead>
                        <TableHead className="font-semibold">Department</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Goals</TableHead>
                        <TableHead className="font-semibold">Total Score</TableHead>
                        <TableHead className="text-right font-semibold pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {evaluations.map((kpi: any) => {
                        const statusColors: Record<string, string> = {
                          pending_manager: "bg-slate-100 text-slate-700 border-slate-200",
                          pending_hr: "bg-amber-100 text-amber-700 border-amber-200",
                          completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
                        };
                        const statusText =
                          kpi.evaluation_status === "pending_hr"
                            ? "Ready for HR"
                            : kpi.evaluation_status === "completed"
                            ? "Completed"
                            : "Pending Manager";

                        return (
                          <TableRow key={kpi.id} className="hover:bg-zinc-50/30">
                            <TableCell className="font-semibold text-zinc-900 py-4 pl-6">
                              {kpi.employee?.first_name} {kpi.employee?.last_name}
                            </TableCell>
                            <TableCell className="text-zinc-600">
                              {kpi.employee?.department?.name || "N/A"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 font-medium ${statusColors[kpi.evaluation_status] || ""}`}>
                                {statusText}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-zinc-600">{kpi.kpigoal?.length || 0}</TableCell>
                            <TableCell className="font-semibold text-primary">
                              {kpi.total_score ? `${kpi.total_score}%` : "-"}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl border-primary/20 text-primary hover:bg-primary/5"
                                onClick={() => handleEvaluateClick(kpi)}
                                disabled={kpi.evaluation_status === "pending_manager"}
                              >
                                {kpi.evaluation_status === "completed" ? "Edit Score" : "Evaluate"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============================================================ */}
      {/* EVALUATION DIALOG */}
      {/* ============================================================ */}
      <Dialog open={!!selectedKpi} onOpenChange={(open) => !open && setSelectedKpi(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">HR Final Evaluation</DialogTitle>
            <DialogDescription>
              Evaluating KPI for {selectedKpi?.employee?.first_name} {selectedKpi?.employee?.last_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 my-4">
            {selectedKpi?.evaluation_status === "pending_manager" && (
              <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm border border-amber-100">
                Warning: The manager has not yet submitted their evaluation. You can still input HR scores, but
                this is usually done after the manager.
              </div>
            )}

            {selectedKpi?.kpigoal?.map((goal: any) => (
              <div key={goal.id} className="bg-zinc-50 border border-zinc-250/50 rounded-2xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-zinc-900">{goal.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Category: {goal.category} • Weight: {goal.weight}% • Target: {goal.target_value}
                      {goal.target_unit === "%" ? "%" : ""}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Manager Score</Label>
                    <div className="font-semibold text-lg text-primary">{goal.manager_score || 0}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground font-semibold">HR Score</Label>
                    <Input
                      type="number"
                      value={hrScores[goal.id] || ""}
                      onChange={(e) => setHrScores({ ...hrScores, [goal.id]: e.target.value })}
                      className="mt-1 bg-white rounded-xl"
                      placeholder="Enter HR score..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setSelectedKpi(null)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl shadow-md gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSubmitEvaluation}
              disabled={evaluationMutation.isPending}
            >
              {evaluationMutation.isPending ? (
                "Submitting..."
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Finalize Evaluation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
