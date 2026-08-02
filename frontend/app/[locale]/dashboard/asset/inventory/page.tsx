"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAssets, useAssetCategories } from "@/hooks/useAsset";
import { useAllEmployee } from "@/hooks/useEmployee";
import { createAsset, directAssignAsset, confirmReturnAsset, type Asset, type AssetCategory } from "@/services/asset.services";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, UserPlus, Undo2 } from "lucide-react";

export default function AssetInventoryPage() {
  const queryClient = useQueryClient();
  const { data: assetsResponse, isLoading: loadingAssets } = useAssets();
  const { data: categoriesResponse } = useAssetCategories();
  const { data: employeesResponse } = useAllEmployee(1, 500);
  
  const assets: Asset[] = assetsResponse?.data || [];
  const categories: AssetCategory[] = categoriesResponse?.data || [];
  const employees = employeesResponse?.data || [];

  // Create Asset State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({ name: "", category_id: "", serial_number: "", condition: "good" });
  
  // Assign Asset State
  const [assignOpen, setAssignOpen] = useState<{open: boolean, asset: Asset | null}>({ open: false, asset: null });
  const [assignData, setAssignData] = useState({ employee_id: "", condition_out: "good" });

  // Return Asset State
  const [returnOpen, setReturnOpen] = useState<{open: boolean, asset: Asset | null}>({ open: false, asset: null });
  const [returnData, setReturnData] = useState({ condition_in: "good", return_status: "available" });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateAsset = async () => {
    if (!newAsset.name || !newAsset.category_id) return toast.error("Name and Category are required");
    setIsSubmitting(true);
    try {
      await createAsset(newAsset);
      toast.success("Asset created successfully");
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setIsCreateOpen(false);
      setNewAsset({ name: "", category_id: "", serial_number: "", condition: "good" });
    } catch (error) {
      toast.error("Failed to create asset");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!assignData.employee_id) return toast.error("Please select an employee");
    setIsSubmitting(true);
    try {
      await directAssignAsset(assignOpen.asset!.id, { 
        employee_id: parseInt(assignData.employee_id),
        condition_out: assignData.condition_out 
      });
      toast.success("Asset assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setAssignOpen({ open: false, asset: null });
      setAssignData({ employee_id: "", condition_out: "good" });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to assign asset");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturn = async () => {
    setIsSubmitting(true);
    try {
      await confirmReturnAsset(returnOpen.asset!.id, returnData);
      toast.success("Asset returned successfully");
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setReturnOpen({ open: false, asset: null });
      setReturnData({ condition_in: "good", return_status: "available" });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to return asset");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusColors: Record<string, string> = {
    'available': 'bg-emerald-100 text-emerald-700',
    'assigned': 'bg-blue-100 text-blue-700',
    'under_repair': 'bg-rose-100 text-rose-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">Manage individual company assets.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4 mr-2" /> Add Asset</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Asset</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Name / Model</Label>
                <Input value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} placeholder="e.g. MacBook Pro M2" />
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={newAsset.category_id} onValueChange={v => setNewAsset({...newAsset, category_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Serial / Tag Number</Label>
                <Input value={newAsset.serial_number} onChange={e => setNewAsset({...newAsset, serial_number: e.target.value})} placeholder="Optional" />
              </div>
              <div className="grid gap-2">
                <Label>Condition</Label>
                <Select value={newAsset.condition} onValueChange={v => setNewAsset({...newAsset, condition: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateAsset} disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loadingAssets ? (
            <LoadingState variant="table" count={1} />
          ) : assets.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No assets found in inventory.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="font-medium">{a.name}</div>
                        <div className="text-xs text-muted-foreground">SN: {a.serial_number || 'N/A'}</div>
                      </TableCell>
                      <TableCell>{a.category?.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[a.status] || ''}>
                          {a.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{a.condition}</TableCell>
                      <TableCell>
                        {a.employee ? `${a.employee.first_name} ${a.employee.last_name}` : <span className="text-muted-foreground italic">Unassigned</span>}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {a.status === 'available' && (
                          <Button size="sm" variant="outline" onClick={() => setAssignOpen({open: true, asset: a})}>
                            <UserPlus className="size-4 mr-1" /> Assign
                          </Button>
                        )}
                        {a.status === 'assigned' && (
                          <Button size="sm" variant="outline" onClick={() => setReturnOpen({open: true, asset: a})}>
                            <Undo2 className="size-4 mr-1" /> Return
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Modal */}
      <Dialog open={assignOpen.open} onOpenChange={(v) => !v && setAssignOpen({open: false, asset: null})}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Direct Assign Asset</DialogTitle>
            <DialogDescription>Assign {assignOpen.asset?.name} to an employee.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Select Employee</Label>
              <Select value={assignData.employee_id} onValueChange={v => setAssignData({...assignData, employee_id: v})}>
                <SelectTrigger><SelectValue placeholder="Search employee..." /></SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>{emp.first_name} {emp.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Condition at Handover</Label>
              <Select value={assignData.condition_out} onValueChange={v => setAssignData({...assignData, condition_out: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen({open: false, asset: null})}>Cancel</Button>
            <Button onClick={handleAssign} disabled={isSubmitting}>Confirm Assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Modal */}
      <Dialog open={returnOpen.open} onOpenChange={(v) => !v && setReturnOpen({open: false, asset: null})}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Asset Return</DialogTitle>
            <DialogDescription>Returning {returnOpen.asset?.name} from {returnOpen.asset?.employee?.first_name}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Condition at Return</Label>
              <Select value={returnData.condition_in} onValueChange={v => setReturnData({...returnData, condition_in: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Next Status</Label>
              <Select value={returnData.return_status} onValueChange={v => setReturnData({...returnData, return_status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available (Ready for next use)</SelectItem>
                  <SelectItem value="under_repair">Under Repair (Needs fixing)</SelectItem>
                  <SelectItem value="retired">Retired (End of life)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen({open: false, asset: null})}>Cancel</Button>
            <Button onClick={handleReturn} disabled={isSubmitting}>Confirm Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
