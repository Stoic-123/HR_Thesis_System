"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAssetRequests, useAssets } from "@/hooks/useAsset";
import { approveHRAssetRequest, type AssetRequest, type Asset } from "@/services/asset.services";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, UserCircle } from "lucide-react";
import dayjs from "dayjs";

export default function AssetRequestsPage() {
  const queryClient = useQueryClient();
  const { data: requestsResponse, isLoading: loadingRequests } = useAssetRequests();
  const { data: assetsResponse } = useAssets();
  
  const requests: AssetRequest[] = requestsResponse?.data || [];
  const assets: Asset[] = assetsResponse?.data || [];
  const availableAssets = assets.filter(a => a.status === 'available');

  const [approveOpen, setApproveOpen] = useState<{open: boolean, request: AssetRequest | null}>({ open: false, request: null });
  const [approveData, setApproveData] = useState({ asset_id: "", hr_comment: "", condition_out: "good" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    if (!approveOpen.request) return;
    if (approveOpen.request.type === 'assignment' && !approveData.asset_id) {
      return toast.error("Please select an asset to assign");
    }

    setIsSubmitting(true);
    try {
      await approveHRAssetRequest(approveOpen.request.id, {
        asset_id: approveOpen.request.type === 'assignment' ? parseInt(approveData.asset_id) : undefined,
        hr_comment: approveData.hr_comment,
        condition_out: approveData.condition_out
      });
      toast.success("Request approved successfully");
      queryClient.invalidateQueries({ queryKey: ["asset-requests"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setApproveOpen({ open: false, request: null });
      setApproveData({ asset_id: "", hr_comment: "", condition_out: "good" });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to approve request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusColors: Record<string, string> = {
    'pending_manager': 'bg-yellow-100 text-yellow-700',
    'pending_hr': 'bg-orange-100 text-orange-700',
    'assigned': 'bg-emerald-100 text-emerald-700',
    'available': 'bg-emerald-100 text-emerald-700', // returned
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Asset Requests</h1>
        <p className="text-sm text-muted-foreground">Manage incoming asset requests and returns from employees.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loadingRequests ? (
            <LoadingState variant="table" count={1} />
          ) : requests.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No requests found.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category / Asset</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserCircle className="size-4 text-muted-foreground" />
                          <span className="font-medium">{r.employee?.first_name} {r.employee?.last_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={r.type === 'assignment' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}>
                          {r.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.type === 'assignment' ? (r.category?.name || 'Any') : (r.asset?.name || 'Unknown')}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={r.reason}>
                        {r.reason || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {dayjs(r.created_at).format("DD MMM YYYY")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[r.status] || ''}>
                          {r.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === 'pending_hr' && (
                          <Button size="sm" onClick={() => setApproveOpen({open: true, request: r})}>
                            <CheckCircle2 className="size-4 mr-1" /> Finalize
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

      {/* HR Approval Modal */}
      <Dialog open={approveOpen.open} onOpenChange={(v) => !v && setApproveOpen({open: false, request: null})}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize {approveOpen.request?.type === 'assignment' ? 'Assignment' : 'Return'}</DialogTitle>
            <DialogDescription>
              {approveOpen.request?.employee?.first_name} has requested {approveOpen.request?.type === 'assignment' ? `a ${approveOpen.request?.category?.name || 'asset'}` : `to return ${approveOpen.request?.asset?.name}`}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {approveOpen.request?.type === 'assignment' && (
              <>
                <div className="grid gap-2">
                  <Label>Select Asset from Inventory</Label>
                  <Select value={approveData.asset_id} onValueChange={v => setApproveData({...approveData, asset_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Choose an available asset" /></SelectTrigger>
                    <SelectContent>
                      {availableAssets
                        .filter(a => approveOpen.request?.category_id ? a.category_id === approveOpen.request.category_id : true)
                        .map(a => (
                        <SelectItem key={a.id} value={a.id.toString()}>{a.name} (SN: {a.serial_number || 'N/A'})</SelectItem>
                      ))}
                      {availableAssets.length === 0 && (
                        <SelectItem value="none" disabled>No available assets in this category</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Condition at Handover</Label>
                  <Select value={approveData.condition_out} onValueChange={v => setApproveData({...approveData, condition_out: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            <div className="grid gap-2">
              <Label>HR Comment (Optional)</Label>
              <Input value={approveData.hr_comment} onChange={e => setApproveData({...approveData, hr_comment: e.target.value})} placeholder="Notes for the employee..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen({open: false, request: null})}>Cancel</Button>
            <Button onClick={handleApprove} disabled={isSubmitting}>Confirm & Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
