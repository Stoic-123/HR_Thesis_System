"use client";

import React, { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useKpiCycles } from "@/hooks/useKpi";
import { createCycle } from "@/services/kpi.services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
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

export default function KpiCyclesPage() {
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
      toast.success("KPI Cycle created successfully!");
      setIsDialogOpen(false);
      setFormData({ name: "", start_date: "", end_date: "" });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "An error occurred");
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
          <h1 className="text-2xl font-semibold tracking-tight">KPI Cycles</h1>
          <p className="text-sm text-muted-foreground">
            Manage your annual or quarterly performance cycles.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gap-2">
              <Plus className="size-4" />
              Create Cycle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Create New KPI Cycle</DialogTitle>
                <DialogDescription>Define the timeline for the performance review cycle.</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label>Cycle Name</Label>
                  <Input 
                    placeholder="e.g. 2026 Annual Performance" 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 flex flex-col">
                    <Label>Start Date</Label>
                    <DatePicker 
                      value={formData.start_date} 
                      onChange={val => setFormData({ ...formData, start_date: val })} 
                    />
                  </div>
                  <div className="space-y-2 flex flex-col">
                    <Label>End Date</Label>
                    <DatePicker 
                      value={formData.end_date} 
                      onChange={val => setFormData({ ...formData, end_date: val })} 
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving..." : "Save Cycle"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Cycles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Cycle Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Duration</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {cycles?.map((c: any) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      <Target className="size-4 text-primary" />
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(c.start_date).toLocaleDateString()} - {new Date(c.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={c.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"}>
                        {c.status.toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {!cycles?.length && (
                  <tr>
                    <td colSpan={3} className="h-24 px-4 text-center text-muted-foreground">
                      No KPI cycles found.
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
