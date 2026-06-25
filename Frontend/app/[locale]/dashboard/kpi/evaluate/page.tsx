"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useKpiCycles } from "@/hooks/useKpi";
import { getEvaluations, submitHrScore } from "@/services/kpi.services";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Target, CheckCircle2 } from "lucide-react";

export default function KpiEvaluatePage() {
  const queryClient = useQueryClient();
  const { data: cycles, isLoading: loadingCycles } = useKpiCycles();
  
  const activeCycles = cycles?.filter((c: any) => c.status === "active") || [];
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  
  // Set default cycle
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

  const [selectedKpi, setSelectedKpi] = useState<any>(null);
  const [hrScores, setHrScores] = useState<Record<string, string>>({});

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
    }
  });

  const handleEvaluateClick = (kpi: any) => {
    setSelectedKpi(kpi);
    const initialScores: Record<string, string> = {};
    kpi.kpigoal?.forEach((g: any) => {
      // Pre-fill with manager score if HR score isn't set, otherwise use HR score or 0
      initialScores[g.id] = (g.hr_score || g.manager_score || 0).toString();
    });
    setHrScores(initialScores);
  };

  const handleSubmitEvaluation = () => {
    if (!selectedKpi) return;

    const formattedScores = selectedKpi.kpigoal.map((g: any) => ({
      goal_id: g.id,
      score: parseFloat(hrScores[g.id]) || 0
    }));

    evaluationMutation.mutate({
      employee_kpi_id: selectedKpi.id,
      scores: formattedScores
    });
  };

  if (loadingCycles) return <LoadingState variant="table" count={1} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">HR KPI Evaluation</h1>
        <p className="text-sm text-muted-foreground">
          Review manager scores and input final HR scores for employee KPIs.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>Evaluation Queue</CardTitle>
              <CardDescription>Select a cycle to view employees ready for final evaluation.</CardDescription>
            </div>
            <div className="w-full md:w-64">
              <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Cycle" />
                </SelectTrigger>
                <SelectContent>
                  {activeCycles.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingEvaluations ? (
            <LoadingState variant="table" count={1} />
          ) : !selectedCycleId ? (
            <div className="text-center py-10 text-muted-foreground">Please select an active cycle</div>
          ) : evaluations.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No KPI records found for this cycle.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Goals</TableHead>
                    <TableHead>Total Score</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluations.map((kpi: any) => {
                    const statusColors: Record<string, string> = {
                      'pending_manager': 'bg-slate-100 text-slate-700',
                      'pending_hr': 'bg-amber-100 text-amber-700',
                      'completed': 'bg-emerald-100 text-emerald-700',
                    };
                    const statusText = kpi.evaluation_status === 'pending_hr' ? 'Ready for HR' : 
                                       kpi.evaluation_status === 'completed' ? 'Completed' : 'Pending Manager';

                    return (
                      <TableRow key={kpi.id}>
                        <TableCell className="font-medium">
                          {kpi.employee?.first_name} {kpi.employee?.last_name}
                        </TableCell>
                        <TableCell>{kpi.employee?.department?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[kpi.evaluation_status] || ''}>
                            {statusText}
                          </Badge>
                        </TableCell>
                        <TableCell>{kpi.kpigoal?.length || 0}</TableCell>
                        <TableCell>{kpi.total_score ? `${kpi.total_score}%` : '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEvaluateClick(kpi)}
                            disabled={kpi.evaluation_status === 'pending_manager'}
                          >
                            {kpi.evaluation_status === 'completed' ? 'Edit Score' : 'Evaluate'}
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

      {/* Evaluation Dialog */}
      <Dialog open={!!selectedKpi} onOpenChange={(open) => !open && setSelectedKpi(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>HR Final Evaluation</DialogTitle>
            <DialogDescription>
              Evaluating KPI for {selectedKpi?.employee?.first_name} {selectedKpi?.employee?.last_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 my-4">
            {selectedKpi?.evaluation_status === 'pending_manager' && (
              <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-sm">
                Warning: The manager has not yet submitted their evaluation. You can still input HR scores, but this is usually done after the manager.
              </div>
            )}

            {selectedKpi?.kpigoal?.map((goal: any) => (
              <div key={goal.id} className="bg-slate-50 border rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold">{goal.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Category: {goal.category} • Weight: {goal.weight}% • Target: {goal.target_value}{goal.target_unit === '%' ? '%' : ''}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Manager Score</Label>
                    <div className="font-medium text-lg text-primary">{goal.manager_score || 0}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">HR Score</Label>
                    <Input 
                      type="number" 
                      value={hrScores[goal.id] || ""}
                      onChange={(e) => setHrScores({ ...hrScores, [goal.id]: e.target.value })}
                      className="mt-1 bg-white"
                      placeholder="Enter HR score..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedKpi(null)}>Cancel</Button>
            <Button onClick={handleSubmitEvaluation} disabled={evaluationMutation.isPending}>
              {evaluationMutation.isPending ? "Submitting..." : (
                <>
                  <CheckCircle2 className="size-4 mr-2" />
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
