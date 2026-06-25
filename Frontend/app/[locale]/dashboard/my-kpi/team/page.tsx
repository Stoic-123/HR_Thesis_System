"use client";

import React, { useState } from "react";
import { useTeamKpiDashboard, useKpiCycles } from "@/hooks/useKpi";
import { submitQuarterlyReview } from "@/services/kpi.services";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UsersRound, Activity, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";

export default function TeamKpiPage() {
  const queryClient = useQueryClient();
  const { data: cycles, isLoading: loadingCycles } = useKpiCycles();
  const activeCycle = cycles?.find((c: any) => c.status === "active");

  const { data: teamData, isLoading: loadingTeam } = useTeamKpiDashboard(activeCycle?.id);
  
  const [expandedEmployees, setExpandedEmployees] = useState<Record<number, boolean>>({});
  
  // Review Form State
  const [reviewingKpi, setReviewingKpi] = useState<any>(null);
  const [reviewQuarter, setReviewQuarter] = useState("Q1");
  const [reviewComment, setReviewComment] = useState("");
  const [goalProgress, setGoalProgress] = useState<Record<number, string>>({});

  const reviewMutation = useMutation({
    mutationFn: submitQuarterlyReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-team-dashboard"] });
      toast.success("Quarterly review submitted!");
      setReviewingKpi(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Error submitting review");
    }
  });

  const toggleExpand = (id: number) => {
    setExpandedEmployees(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartReview = (emp: any, kpi: any) => {
    setReviewingKpi(kpi);
    const initialProgress: Record<number, string> = {};
    kpi.kpigoal?.forEach((g: any) => {
      initialProgress[g.id] = g.current_progress.toString();
    });
    setGoalProgress(initialProgress);
    setReviewComment("");
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingKpi) return;
    
    const goalsProgressData = reviewingKpi.kpigoal.map((g: any) => ({
      kpi_goal_id: g.id,
      progress_percentage: parseFloat(goalProgress[g.id]) || 0,
      manager_comment: "" // Could be expanded to per-goal comments later
    }));

    reviewMutation.mutate({
      employee_kpi_id: reviewingKpi.id,
      quarter: reviewQuarter,
      overall_manager_comment: reviewComment,
      goalsProgress: goalsProgressData
    });
  };

  if (loadingCycles || loadingTeam) return <LoadingState variant="card" count={2} />;

  if (!activeCycle) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium">No Active KPI Cycle</h2>
      </div>
    );
  }

  if (!teamData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium text-red-500">Access Denied</h2>
        <p className="text-muted-foreground mt-2">You are not assigned as a Department Manager.</p>
      </div>
    );
  }

  if (reviewingKpi) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Submit Quarterly Review</h1>
            <p className="text-sm text-muted-foreground">Evaluating {reviewingKpi.employee?.first_name} {reviewingKpi.employee?.last_name}</p>
          </div>
          <Button variant="outline" onClick={() => setReviewingKpi(null)}>Cancel</Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmitReview} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Review Quarter</Label>
                  <select 
                    className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={reviewQuarter}
                    onChange={e => setReviewQuarter(e.target.value)}
                  >
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Overall Manager Comment</Label>
                  <Input 
                    placeholder="Provide feedback on the employee's performance" 
                    value={reviewComment} 
                    onChange={e => setReviewComment(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>Goal Progress Updates</Label>
                {reviewingKpi.kpigoal?.map((goal: any) => (
                  <div key={goal.id} className="p-4 border rounded-xl flex flex-col md:flex-row items-center gap-4 bg-gray-50/50">
                    <div className="flex-1">
                      <div className="font-medium">{goal.title}</div>
                      <div className="text-xs text-muted-foreground">Target: {goal.target_value} {goal.target_unit} (Weight: {goal.weight}%)</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="whitespace-nowrap">Progress %</Label>
                      <Input 
                        type="number" 
                        className="w-24 text-right" 
                        value={goalProgress[goal.id]} 
                        onChange={e => setGoalProgress({ ...goalProgress, [goal.id]: e.target.value })} 
                        required 
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={reviewMutation.isPending} className="rounded-xl px-8">
                  {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team Performance Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Department: {teamData.department} | Active Cycle: {activeCycle.name}
        </p>
      </div>

      <div className="space-y-4">
        {teamData.members?.map((emp: any) => {
          const kpi = emp.employeekpi?.[0]; // Current cycle KPI
          const isExpanded = expandedEmployees[emp.id];

          return (
            <Card key={emp.id} className="overflow-hidden">
              <CardHeader className="p-0">
                <div 
                  className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(emp.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <UsersRound className="size-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{emp.first_name} {emp.last_name}</CardTitle>
                      <CardDescription>
                        {kpi ? `${kpi.kpigoal?.length || 0} Goals Assigned` : "No KPI Assigned for this cycle"}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {kpi && (
                      <div className="text-right hidden sm:block">
                        <div className="text-sm font-medium">Current Score</div>
                        <div className="text-lg font-bold text-primary">{kpi.total_score !== null ? `${kpi.total_score}%` : "TBD"}</div>
                      </div>
                    )}
                    {isExpanded ? <ChevronDown className="size-5 text-muted-foreground" /> : <ChevronRight className="size-5 text-muted-foreground" />}
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && kpi && (
                <CardContent className="bg-gray-50/50 border-t p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-lg flex items-center gap-2">
                      <Activity className="size-5" />
                      Goal Progress
                    </h3>
                    <Button 
                      onClick={() => handleStartReview(emp, kpi)}
                      className="rounded-xl gap-2"
                    >
                      <CheckCircle2 className="size-4" />
                      Submit Quarterly Review
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {kpi.kpigoal?.map((goal: any) => (
                      <div key={goal.id} className="bg-white p-4 border rounded-xl flex items-center justify-between">
                        <div>
                          <div className="font-medium">{goal.title}</div>
                          <div className="text-xs text-muted-foreground">{goal.category} • Target: {goal.target_value} {goal.target_unit}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-32 bg-gray-100 rounded-full h-2 hidden sm:block">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${Math.min(100, goal.current_progress)}%` }}
                            />
                          </div>
                          <div className="font-medium text-sm w-12 text-right">{goal.current_progress}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
              {isExpanded && !kpi && (
                <CardContent className="bg-gray-50/50 border-t p-6 text-center text-muted-foreground">
                  This employee does not have a KPI configured for the current cycle.
                </CardContent>
              )}
            </Card>
          );
        })}
        {(!teamData.members || teamData.members.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            No active team members found in your department.
          </div>
        )}
      </div>
    </div>
  );
}
