"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Target, UsersRound, FileText } from "lucide-react";
import { Link } from "@/src/i18n/routing";

export default function KpiDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">KPI Management</h1>
        <p className="text-sm text-muted-foreground">
          Overview of Performance Tracking, Goals, and Appraisals
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/kpi/cycles">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">KPI Cycles</CardTitle>
              <Target className="size-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>Manage active and upcoming performance cycles for the entire company.</CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/kpi/templates">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">KPI Templates</CardTitle>
              <FileText className="size-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>Create standard goals for different departments or roles to automate assignment.</CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/kpi/assign">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Assign & Monitor</CardTitle>
              <UsersRound className="size-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>Assign KPI templates to departments and track department overall progress.</CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/kpi/evaluate">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">HR Evaluation</CardTitle>
              <Target className="size-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>Review manager evaluations and finalize scores for all active employees.</CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
