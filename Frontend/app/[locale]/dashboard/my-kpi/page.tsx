"use client";

import React from "react";
import { useMyKpiDashboard, useKpiCycles } from "@/hooks/useKpi";
import { Link } from "@/src/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, CheckCircle2, UsersRound } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";

export default function MyKpiPage() {
  const { data: cycles, isLoading: loadingCycles } = useKpiCycles();
  const activeCycle = cycles?.find((c: any) => c.status === "active");

  const { data: myKpiData, isLoading: loadingKpi } = useMyKpiDashboard(activeCycle?.id);
  const kpi = myKpiData?.kpi;

  if (loadingCycles || loadingKpi) return <LoadingState variant="card" count={2} />;

  if (!activeCycle) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium">No Active KPI Cycle</h2>
        <p className="text-muted-foreground mt-2">There is currently no active performance review cycle.</p>
      </div>
    );
  }

  if (!kpi) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium">No KPIs Assigned</h2>
        <p className="text-muted-foreground mt-2">You don't have any KPI goals assigned for the current cycle.</p>
      </div>
    );
  }

  const getRatingColor = (rating: string) => {
    switch (rating?.toLowerCase()) {
      case "outstanding": return "bg-emerald-100 text-emerald-800";
      case "excellent": return "bg-blue-100 text-blue-800";
      case "good": return "bg-green-100 text-green-800";
      case "fair": return "bg-amber-100 text-amber-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My KPI Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Cycle: {activeCycle.name}
          </p>
        </div>
        {myKpiData?.is_manager && (
          <Link href="/dashboard/my-kpi/team">
            <Button variant="outline" className="gap-2 rounded-xl">
              <UsersRound className="size-4" />
              Team KPI Dashboard
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-muted-foreground">Current Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpi.total_score !== null ? `${kpi.total_score}%` : "TBD"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-muted-foreground">Rating</CardTitle>
          </CardHeader>
          <CardContent>
            {kpi.rating ? (
              <Badge className={getRatingColor(kpi.rating)}>{kpi.rating}</Badge>
            ) : (
              <span className="text-lg font-medium text-muted-foreground">Pending</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-muted-foreground">Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpi.kpigoal?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Goals</CardTitle>
          <CardDescription>Update your progress for each goal below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {kpi.kpigoal?.map((goal: any) => (
            <div key={goal.id} className="border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{goal.category}</Badge>
                  <span className="text-xs font-medium text-muted-foreground">Weight: {goal.weight}%</span>
                </div>
                <h3 className="font-medium text-lg">{goal.title}</h3>
                <p className="text-sm text-muted-foreground">Target: {goal.target_value} {goal.target_unit}</p>
              </div>
              
              <div className="flex-shrink-0 w-full md:w-48">
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span className="font-medium">{goal.current_progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${Math.min(100, goal.current_progress)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          {!kpi.kpigoal?.length && (
            <p className="text-center text-muted-foreground py-4">No goals configured.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
