"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAssets, useAssetCategories, useAssetRequests } from "@/hooks/useAsset";
import { useAllEmployee } from "@/hooks/useEmployee";
import {
  createAsset,
  directAssignAsset,
  confirmReturnAsset,
  createAssetCategory,
  approveHRAssetRequest,
  updateAsset,
  deleteAsset,
  type Asset,
  type AssetCategory,
  type AssetRequest,
} from "@/services/asset.services";
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
import { Plus, UserPlus, Undo2, Laptop, ListTree, PackageSearch, CheckCircle2, UserCircle, RefreshCcw, Pencil, Trash2, Eye, Printer, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import dayjs from "dayjs";
import { useMe } from "@/hooks/useMe";
import { exportReportToPDF } from "@/lib/pdf-export";
import { useTranslations } from "next-intl";

export default function AssetDashboardPage() {
  const t = useTranslations("asset");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();

  // Queries
  const { data: assetsResponse, isLoading: loadingAssets } = useAssets();
  const { data: categoriesResponse, isLoading: loadingCategories } = useAssetCategories();
  const { data: requestsResponse, isLoading: loadingRequests } = useAssetRequests();
  const { data: employeesResponse } = useAllEmployee(1, 500);
  const { data: user } = useMe();

  const assets: Asset[] = assetsResponse?.data || [];
  const categories: AssetCategory[] = categoriesResponse?.data || [];
  const requests: AssetRequest[] = requestsResponse?.data || [];
  const pendingRequests = requests.filter(
    (r) => r.status === "pending_hr" || r.status === "pending_manager"
  );
  const employees = employeesResponse?.data || [];
  const availableAssets = assets.filter((a) => a.status === "available");
  const activeAssetsList = assets.filter((a) => a.status === "available" || a.status === "assigned");
  const repairAssetsList = assets.filter((a) => a.status === "under_repair");
  const brokenAssetsList = assets.filter((a) => a.status === "retired");

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("inventory");

  // Client-side search filters
  const filteredActiveAssets = activeAssetsList.filter((a) => {
    const term = searchQuery.toLowerCase();
    const empName = a.employee ? `${a.employee.first_name} ${a.employee.last_name}`.toLowerCase() : "";
    return (
      a.name.toLowerCase().includes(term) ||
      (a.serial_number || "").toLowerCase().includes(term) ||
      (a.category?.name || "").toLowerCase().includes(term) ||
      (a.condition || "").toLowerCase().includes(term) ||
      empName.includes(term)
    );
  });

  const filteredRepairAssets = repairAssetsList.filter((a) => {
    const term = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(term) ||
      (a.serial_number || "").toLowerCase().includes(term) ||
      (a.category?.name || "").toLowerCase().includes(term) ||
      (a.condition || "").toLowerCase().includes(term)
    );
  });

  const filteredBrokenAssets = brokenAssetsList.filter((a) => {
    const term = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(term) ||
      (a.serial_number || "").toLowerCase().includes(term) ||
      (a.category?.name || "").toLowerCase().includes(term) ||
      (a.condition || "").toLowerCase().includes(term)
    );
  });

  // Auto generate serial number on category selection
  const handleCategoryChange = (catId: string) => {
    const category = categories.find((c) => c.id.toString() === catId);
    let nextSerial = "";
    if (category) {
      const prefix = category.name.substring(0, 2).toLowerCase();
      const prefixWithDash = prefix + "-";
      const matchingAssets = assets.filter((a) => a.serial_number && a.serial_number.toLowerCase().startsWith(prefixWithDash));
      let maxNum = 0;
      matchingAssets.forEach((a) => {
        const suffix = a.serial_number.substring(prefixWithDash.length);
        const num = parseInt(suffix, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      });
      nextSerial = `${prefix}-${String(maxNum + 1).padStart(4, "0")}`;
    }
    setNewAsset((prev) => ({
      ...prev,
      category_id: catId,
      serial_number: nextSerial,
    }));
  };

  // Create Asset State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAsset, setNewAsset] = useState<{
    name: string;
    category_id: string;
    serial_number: string;
    condition: string;
    image: File | null;
  }>({
    name: "",
    category_id: "",
    serial_number: "",
    condition: "good",
    image: null,
  });

  // Assign Asset State
  const [assignOpen, setAssignOpen] = useState<{ open: boolean; asset: Asset | null }>({
    open: false,
    asset: null,
  });
  const [assignData, setAssignData] = useState({ employee_id: "", condition_out: "good" });

  // Return Asset State
  const [returnOpen, setReturnOpen] = useState<{ open: boolean; asset: Asset | null }>({
    open: false,
    asset: null,
  });
  const [returnData, setReturnData] = useState({ condition_in: "good", return_status: "available" });

  // Create Category State
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDesc, setCategoryDesc] = useState("");

  // Request Approval State
  const [approveOpen, setApproveOpen] = useState<{ open: boolean; request: AssetRequest | null }>({
    open: false,
    request: null,
  });
  const [approveData, setApproveData] = useState({ asset_id: "", hr_comment: "", condition_out: "good" });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Asset State
  const [editOpen, setEditOpen] = useState<{ open: boolean; asset: Asset | null }>({
    open: false,
    asset: null,
  });
  const [editData, setEditData] = useState({
    name: "",
    category_id: "",
    serial_number: "",
    condition: "good",
    status: "available",
    image: null as File | null,
  });

  // Delete Asset State
  const [deleteOpen, setDeleteOpen] = useState<{ open: boolean; assetId: number | null }>({
    open: false,
    assetId: null,
  });

  // History Asset State
  const [historyOpen, setHistoryOpen] = useState<{ open: boolean; asset: Asset | null }>({
    open: false,
    asset: null,
  });

  // Status mapping colors
  const assetStatusColors: Record<string, string> = {
    available: "bg-emerald-100 text-emerald-700 border-emerald-200",
    assigned: "bg-blue-100 text-blue-700 border-blue-200",
    under_repair: "bg-rose-100 text-rose-700 border-rose-200",
    retired: "bg-zinc-100 text-zinc-700 border-zinc-200",
  };

  const requestStatusColors: Record<string, string> = {
    pending_manager: "bg-yellow-100 text-yellow-700 border-yellow-200",
    pending_hr: "bg-orange-100 text-orange-700 border-orange-200",
    assigned: "bg-emerald-100 text-emerald-700 border-emerald-200",
    available: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };

  // Handlers
  const handleCreateAsset = async () => {
    if (!newAsset.name || !newAsset.category_id) return toast.error("Name and Category are required");
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", newAsset.name);
      formData.append("category_id", newAsset.category_id);
      formData.append("serial_number", newAsset.serial_number);
      formData.append("condition", newAsset.condition);
      if (newAsset.image) {
        formData.append("image_path", newAsset.image);
      }

      await createAsset(formData);
      toast.success("Asset created successfully");
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setIsCreateOpen(false);
      setNewAsset({ name: "", category_id: "", serial_number: "", condition: "good", image: null });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create asset");
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
        condition_out: assignData.condition_out,
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

  const handleCreateCategory = async () => {
    if (!categoryName) return toast.error("Category name is required");
    setIsSubmitting(true);
    try {
      await createAssetCategory({ name: categoryName, description: categoryDesc });
      toast.success("Category created successfully");
      queryClient.invalidateQueries({ queryKey: ["asset-categories"] });
      setIsCategoryOpen(false);
      setCategoryName("");
      setCategoryDesc("");
    } catch (error: any) {
      toast.error("Failed to create category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!approveOpen.request) return;
    if (approveOpen.request.type === "assignment" && !approveData.asset_id) {
      return toast.error("Please select an asset to assign");
    }

    setIsSubmitting(true);
    try {
      await approveHRAssetRequest(approveOpen.request.id, {
        asset_id: approveOpen.request.type === "assignment" ? parseInt(approveData.asset_id) : undefined,
        hr_comment: approveData.hr_comment,
        condition_out: approveData.condition_out,
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

  const handleEditClick = (a: Asset) => {
    setEditOpen({ open: true, asset: a });
    setEditData({
      name: a.name,
      category_id: a.category_id.toString(),
      serial_number: a.serial_number || "",
      condition: a.condition,
      status: a.status,
      image: null,
    });
  };

  const handleEditAsset = async () => {
    if (!editData.name) return toast.error("Name is required");
    if (!editData.category_id) return toast.error("Category is required");

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", editData.name);
      formData.append("category_id", editData.category_id);
      formData.append("serial_number", editData.serial_number);
      formData.append("condition", editData.condition);
      formData.append("status", editData.status);
      if (editData.image) {
        formData.append("image_path", editData.image);
      }

      await updateAsset(editOpen.asset!.id, formData);
      toast.success("Asset updated successfully");
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setEditOpen({ open: false, asset: null });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update asset");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAsset = async () => {
    if (!deleteOpen.assetId) return;
    setIsSubmitting(true);
    try {
      await deleteAsset(deleteOpen.assetId);
      toast.success("Asset deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setDeleteOpen({ open: false, assetId: null });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete asset");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportPDF = () => {
    let titleKh = "របាយការណ៍គ្រប់គ្រងទ្រព្យសម្បត្តិ";
    let titleEn = "Company Asset Report";
    let statusLabel = "";

    let rowsToExport: Asset[] = [];
    if (activeTab === "inventory") {
      rowsToExport = filteredActiveAssets;
      statusLabel = "បញ្ជីសារពើភ័ណ្ឌទ្រព្យសម្បត្តិសកម្ម / Active Asset Inventory";
    } else if (activeTab === "repair") {
      rowsToExport = filteredRepairAssets;
      statusLabel = "បញ្ជីទ្រព្យសម្បត្តិកំពុងជួសជុល / Assets Under Repair";
    } else if (activeTab === "broken") {
      rowsToExport = filteredBrokenAssets;
      statusLabel = "បញ្ជីទ្រព្យសម្បត្តិខូច / Broken & Retired Assets";
    }

    const userFullName = user?.employee ? `${user.employee.first_name} ${user.employee.last_name}` : "";
    const apiBaseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const companyLogo = user?.employee?.company?.logo_path
      ? (user.employee.company.logo_path.startsWith("http")
          ? user.employee.company.logo_path
          : `${apiBaseURL}${user.employee.company.logo_path}`)
      : "";

    exportReportToPDF({
      titleKh,
      titleEn,
      companyName: user?.employee?.company?.name || "ក្រុមហ៊ុន សារណៈ",
      companyLogo,
      orientation: "landscape",
      metadata: [
        { labelKh: "កាលបរិច្ឆេទ", labelEn: "Date", value: dayjs().format("YYYY-MM-DD") },
        { labelKh: "ប្រភេទរបាយការណ៍", labelEn: "Report Type", value: statusLabel },
        { labelKh: "រៀបចំដោយ", labelEn: "Prepared By", value: userFullName || "រដ្ឋបាល / Admin" }
      ],
      tableHeaders: [
        { kh: "រូបភាព", en: "Asset Image", align: "center" },
        { kh: "ឈ្មោះឧបករណ៍ / ម៉ូដែល", en: "Asset Name / Model" },
        { kh: "កូដឧបករណ៍", en: "Asset Code" },
        { kh: "ប្រភេទ", en: "Category" },
        { kh: "លក្ខខណ្ឌ", en: "Condition", align: "center" },
        { kh: "ស្ថានភាព", en: "Status", align: "center" },
        { kh: "បុគ្គលិកប្រើប្រាស់", en: "Assigned To" }
      ],
      tableRows: rowsToExport.map(row => {
        const empName = row.employee ? `${row.employee.first_name} ${row.employee.last_name}` : "Unassigned";
        
        // Asset Image HTML
        const imageCellHtml = row.image_path
          ? `<img src="${apiBaseURL}${row.image_path}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px;" />`
          : `<div style="width: 40px; height: 40px; background-color: #f3f4f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 1px solid #e5e7eb;"><svg style="width: 20px; height: 20px; color: #9ca3af;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg></div>`;

        const statusText = row.status.replace("_", " ").toUpperCase();
        let statusColor = "text-emerald";
        if (row.status === "under_repair") statusColor = "text-rose";
        if (row.status === "retired") statusColor = "text-gray";

        return {
          cells: [
            { text: imageCellHtml, align: "center" as const },
            { text: `<strong>${row.name}</strong>`, align: "left" as const },
            { text: row.serial_number || "N/A", align: "left" as const },
            { text: row.category?.name || "N/A", align: "left" as const },
            { text: `<span class="capitalize">${row.condition}</span>`, align: "center" as const },
            { text: `<span class="${statusColor} font-bold">${statusText}</span>`, align: "center" as const },
            { text: empName, align: "left" as const }
          ]
        };
      }),
      preparedBy: userFullName
    });
  };

  const apiHost = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="bg-muted p-1 rounded-xl flex flex-wrap gap-1">
            <TabsTrigger value="inventory" className="rounded-lg gap-2">
              <PackageSearch className="size-4" />
              {t("inventory")}
            </TabsTrigger>
            <TabsTrigger value="repair" className="rounded-lg gap-2">
              <RefreshCcw className="size-4" />
              Repair Asset
            </TabsTrigger>
            <TabsTrigger value="broken" className="rounded-lg gap-2">
              <Trash2 className="size-4" />
              Broken Asset
            </TabsTrigger>
            <TabsTrigger value="categories" className="rounded-lg gap-2">
              <ListTree className="size-4" />
              {t("categories")}
            </TabsTrigger>
            <TabsTrigger value="requests" className="rounded-lg gap-2">
              <CheckCircle2 className="size-4" />
              {t("requests")}
            </TabsTrigger>
          </TabsList>

          {/* Search & Export Buttons */}
          {(activeTab === "inventory" || activeTab === "repair" || activeTab === "broken") && (
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets, SN, employee..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl shadow-sm h-9"
                />
              </div>
              <Button
                onClick={handleExportPDF}
                className="flex items-center gap-2 rounded-xl shadow-sm bg-primary hover:bg-primary/90 text-white font-medium cursor-pointer h-9 text-xs"
              >
                <Printer className="size-4" />
                Export PDF
              </Button>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* INVENTORY TAB */}
        {/* ============================================================ */}
        <TabsContent value="inventory" className="space-y-4 outline-none">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">Asset Inventory</h2>
              <p className="text-xs text-muted-foreground">Add new items and direct assign them.</p>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl shadow-md gap-2">
                  <Plus className="size-4" /> Add Asset
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Add New Asset</DialogTitle>
                  <DialogDescription>Create a company asset item and optionally upload its image.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label className="font-semibold text-zinc-700">Name / Model</Label>
                    <Input
                      value={newAsset.name}
                      onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                      placeholder="e.g. MacBook Pro M2"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-semibold text-zinc-700">Category</Label>
                    <Select
                      value={newAsset.category_id}
                      onValueChange={handleCategoryChange}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-semibold text-zinc-700">Serial / Tag Number</Label>
                    <Input
                      value={newAsset.serial_number}
                      onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value })}
                      placeholder="Optional serial number"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-semibold text-zinc-700">Condition</Label>
                    <Select
                      value={newAsset.condition}
                      onValueChange={(v) => setNewAsset({ ...newAsset, condition: v })}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="damaged">Damaged</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-semibold text-zinc-700">Asset Image</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setNewAsset({ ...newAsset, image: file });
                      }}
                      className="rounded-xl cursor-pointer"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="rounded-xl" onClick={handleCreateAsset} disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="rounded-2xl border shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {loadingAssets ? (
                <div className="p-8">
                  <LoadingState variant="table" count={3} />
                </div>
              ) : filteredActiveAssets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No active assets found in inventory.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50/50">
                      <TableRow>
                        <TableHead className="font-semibold py-4">Asset Details</TableHead>
                        <TableHead className="font-semibold">Category</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Condition</TableHead>
                        <TableHead className="font-semibold">Assigned To</TableHead>
                        <TableHead className="text-right font-semibold pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredActiveAssets.map((a) => (
                        <TableRow key={a.id} className="hover:bg-zinc-50/30 transition-colors">
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              {a.image_path ? (
                                <img
                                  src={`${apiHost}${a.image_path}`}
                                  alt={a.name}
                                  className="w-12 h-12 object-cover rounded-xl border border-zinc-150 shadow-sm"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-zinc-100 flex items-center justify-center rounded-xl border border-zinc-150">
                                  <Laptop className="size-5 text-zinc-400" />
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-zinc-900">{a.name}</div>
                                <div className="text-xs text-muted-foreground font-mono">
                                  SN: {a.serial_number || "N/A"}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-zinc-600">{a.category?.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 font-medium ${assetStatusColors[a.status] || ""}`}>
                              {a.status.replace("_", " ").toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize text-zinc-600">{a.condition}</TableCell>
                          <TableCell className="text-zinc-700">
                            {a.employee ? (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-zinc-900">
                                  {a.employee.first_name} {a.employee.last_name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic text-xs">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6 space-x-2">
                            {a.status === "available" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl border-primary/20 text-primary hover:bg-primary/5 gap-1.5"
                                onClick={() => setAssignOpen({ open: true, asset: a })}
                              >
                                <UserPlus className="size-4" /> Assign
                              </Button>
                            )}
                            {a.status === "assigned" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl border-zinc-200 text-zinc-700 hover:bg-zinc-50 gap-1.5"
                                onClick={() => setReturnOpen({ open: true, asset: a })}
                              >
                                <Undo2 className="size-4" /> Return
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                              onClick={() => setHistoryOpen({ open: true, asset: a })}
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                              onClick={() => handleEditClick(a)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => setDeleteOpen({ open: true, assetId: a.id })}
                            >
                              <Trash2 className="size-4" />
                            </Button>
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
        {/* REPAIR TAB */}
        {/* ============================================================ */}
        <TabsContent value="repair" className="space-y-4 outline-none">
          <div>
            <h2 className="text-lg font-bold">Repair Assets</h2>
            <p className="text-xs text-muted-foreground">Assets currently undergoing maintenance or repairs.</p>
          </div>

          <Card className="rounded-2xl border shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {loadingAssets ? (
                <div className="p-8">
                  <LoadingState variant="table" count={3} />
                </div>
              ) : filteredRepairAssets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No assets currently in repair.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50/50">
                      <TableRow>
                        <TableHead className="font-semibold py-4">Asset Details</TableHead>
                        <TableHead className="font-semibold">Category</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Condition</TableHead>
                        <TableHead className="text-right font-semibold pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRepairAssets.map((a) => (
                        <TableRow key={a.id} className="hover:bg-zinc-50/30 transition-colors">
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              {a.image_path ? (
                                <img
                                  src={`${apiHost}${a.image_path}`}
                                  alt={a.name}
                                  className="w-12 h-12 object-cover rounded-xl border border-zinc-150 shadow-sm"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-zinc-100 flex items-center justify-center rounded-xl border border-zinc-150">
                                  <Laptop className="size-5 text-zinc-400" />
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-zinc-900">{a.name}</div>
                                <div className="text-xs text-muted-foreground font-mono">
                                  SN: {a.serial_number || "N/A"}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-zinc-600">{a.category?.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 font-medium ${assetStatusColors[a.status] || ""}`}>
                              {a.status.replace("_", " ").toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize text-zinc-600">{a.condition}</TableCell>
                          <TableCell className="text-right pr-6 space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                              onClick={() => setHistoryOpen({ open: true, asset: a })}
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                              onClick={() => handleEditClick(a)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => setDeleteOpen({ open: true, assetId: a.id })}
                            >
                              <Trash2 className="size-4" />
                            </Button>
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
        {/* BROKEN TAB */}
        {/* ============================================================ */}
        <TabsContent value="broken" className="space-y-4 outline-none">
          <div>
            <h2 className="text-lg font-bold">Broken Assets</h2>
            <p className="text-xs text-muted-foreground">Retired assets that are damaged and can no longer be used.</p>
          </div>

          <Card className="rounded-2xl border shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {loadingAssets ? (
                <div className="p-8">
                  <LoadingState variant="table" count={3} />
                </div>
              ) : filteredBrokenAssets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No retired or broken assets.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50/50">
                      <TableRow>
                        <TableHead className="font-semibold py-4">Asset Details</TableHead>
                        <TableHead className="font-semibold">Category</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Condition</TableHead>
                        <TableHead className="text-right font-semibold pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBrokenAssets.map((a) => (
                        <TableRow key={a.id} className="hover:bg-zinc-50/30 transition-colors">
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              {a.image_path ? (
                                <img
                                  src={`${apiHost}${a.image_path}`}
                                  alt={a.name}
                                  className="w-12 h-12 object-cover rounded-xl border border-zinc-150 shadow-sm"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-zinc-100 flex items-center justify-center rounded-xl border border-zinc-150">
                                  <Laptop className="size-5 text-zinc-400" />
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-zinc-900">{a.name}</div>
                                <div className="text-xs text-muted-foreground font-mono">
                                  SN: {a.serial_number || "N/A"}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-zinc-600">{a.category?.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 font-medium ${assetStatusColors[a.status] || ""}`}>
                              {a.status.replace("_", " ").toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize text-zinc-600">{a.condition}</TableCell>
                          <TableCell className="text-right pr-6 space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                              onClick={() => setHistoryOpen({ open: true, asset: a })}
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => setDeleteOpen({ open: true, assetId: a.id })}
                            >
                              <Trash2 className="size-4" />
                            </Button>
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
        {/* CATEGORIES TAB */}
        {/* ============================================================ */}
        <TabsContent value="categories" className="space-y-4 outline-none">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">Asset Categories</h2>
              <p className="text-xs text-muted-foreground">Manage category types like Laptops or Phones.</p>
            </div>

            <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl shadow-md gap-2">
                  <Plus className="size-4" /> New Category
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Create Asset Category</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-zinc-700">Category Name</Label>
                    <Input
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="e.g. Laptop"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-zinc-700">Description</Label>
                    <Input
                      value={categoryDesc}
                      onChange={(e) => setCategoryDesc(e.target.value)}
                      placeholder="Optional details..."
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={() => setIsCategoryOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="rounded-xl" onClick={handleCreateCategory} disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="rounded-2xl border shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {loadingCategories ? (
                <div className="p-8">
                  <LoadingState variant="table" count={2} />
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No categories found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50/50">
                      <TableRow>
                        <TableHead className="font-semibold py-4 pl-6">ID</TableHead>
                        <TableHead className="font-semibold">Category Name</TableHead>
                        <TableHead className="font-semibold">Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((c) => (
                        <TableRow key={c.id} className="hover:bg-zinc-50/30 transition-colors">
                          <TableCell className="font-mono text-zinc-400 py-4 pl-6">#{c.id}</TableCell>
                          <TableCell className="font-semibold text-zinc-900">{c.name}</TableCell>
                          <TableCell className="text-zinc-600">{c.description || <span className="italic text-zinc-400 text-xs">No description</span>}</TableCell>
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
        {/* REQUESTS TAB */}
        {/* ============================================================ */}
        <TabsContent value="requests" className="space-y-4 outline-none">
          <div>
            <h2 className="text-lg font-bold">Asset Requests & Returns</h2>
            <p className="text-xs text-muted-foreground">Review and allocate assets to employee requests.</p>
          </div>

          <Card className="rounded-2xl border shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {loadingRequests ? (
                <div className="p-8">
                  <LoadingState variant="table" count={3} />
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No pending requests found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50/50">
                      <TableRow>
                        <TableHead className="font-semibold py-4 pl-6">Requested By</TableHead>
                        <TableHead className="font-semibold">Type</TableHead>
                        <TableHead className="font-semibold">Category / Asset</TableHead>
                        <TableHead className="font-semibold">Reason</TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="text-right font-semibold pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((r) => (
                        <TableRow key={r.id} className="hover:bg-zinc-50/30 transition-colors">
                          <TableCell className="py-4 pl-6">
                            <div className="flex items-center gap-2">
                              <UserCircle className="size-5 text-zinc-400" />
                              <span className="font-semibold text-zinc-900">
                                {r.employee?.first_name} {r.employee?.last_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="capitalize font-medium text-zinc-700">{r.type}</TableCell>
                          <TableCell className="text-zinc-600">
                            {r.type === "assignment" ? (
                              r.category?.name
                            ) : (
                              <div>
                                <span className="font-medium text-zinc-900">{r.asset?.name}</span>
                                <div className="text-xs font-mono text-zinc-400">SN: {r.asset?.serial_number || "N/A"}</div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate text-zinc-600" title={r.reason}>
                            {r.reason || <span className="text-zinc-300 italic text-xs">No reason provided</span>}
                          </TableCell>
                          <TableCell className="text-zinc-500 font-mono text-xs">
                            {dayjs(r.created_at).format("YYYY-MM-DD")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 font-medium ${requestStatusColors[r.status] || ""}`}>
                              {r.status === "available" ? "RETURNED" : r.status.replace("_", " ").toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            {r.status === "pending_hr" && (
                              <Button
                                size="sm"
                                className="rounded-xl shadow-sm gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => setApproveOpen({ open: true, request: r })}
                              >
                                Review & Approve
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
        </TabsContent>
      </Tabs>

      {/* ============================================================ */}
      {/* DIRECT ASSIGN DIALOG */}
      {/* ============================================================ */}
      <Dialog open={assignOpen.open} onOpenChange={(v) => !v && setAssignOpen({ open: false, asset: null })}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Direct Assign Asset</DialogTitle>
            <DialogDescription>Assign {assignOpen.asset?.name} to an employee.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="font-semibold text-zinc-700">Select Employee</Label>
              <Select value={assignData.employee_id} onValueChange={(v) => setAssignData({ ...assignData, employee_id: v })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Search employee..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="font-semibold text-zinc-700">Condition at Handover</Label>
              <Select value={assignData.condition_out} onValueChange={(v) => setAssignData({ ...assignData, condition_out: v })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setAssignOpen({ open: false, asset: null })}>
              Cancel
            </Button>
            <Button className="rounded-xl" onClick={handleAssign} disabled={isSubmitting}>
              Confirm Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* RETURN CONFIRMATION DIALOG */}
      {/* ============================================================ */}
      <Dialog open={returnOpen.open} onOpenChange={(v) => !v && setReturnOpen({ open: false, asset: null })}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Confirm Asset Return</DialogTitle>
            <DialogDescription>
              Returning {returnOpen.asset?.name} from {returnOpen.asset?.employee?.first_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="font-semibold text-zinc-700">Condition at Return</Label>
              <Select value={returnData.condition_in} onValueChange={(v) => setReturnData({ ...returnData, condition_in: v })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="font-semibold text-zinc-700">Next Status</Label>
              <Select value={returnData.return_status} onValueChange={(v) => setReturnData({ ...returnData, return_status: v })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="available">Available (Ready for next use)</SelectItem>
                  <SelectItem value="under_repair">Under Repair (Needs fixing)</SelectItem>
                  <SelectItem value="retired">Retired (End of life)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setReturnOpen({ open: false, asset: null })}>
              Cancel
            </Button>
            <Button className="rounded-xl" onClick={handleReturn} disabled={isSubmitting}>
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* REQUEST APPROVAL DIALOG */}
      {/* ============================================================ */}
      <Dialog open={approveOpen.open} onOpenChange={(v) => !v && setApproveOpen({ open: false, request: null })}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Approve Asset Request</DialogTitle>
            <DialogDescription>
              Process {approveOpen.request?.type} request from {approveOpen.request?.employee?.first_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {approveOpen.request?.type === "assignment" && (
              <div className="grid gap-2">
                <Label className="font-semibold text-zinc-700">Allocate Asset</Label>
                <Select value={approveData.asset_id} onValueChange={(v) => setApproveData({ ...approveData, asset_id: v })}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select available asset..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {(() => {
                      const reqCatId = approveOpen.request?.category_id;
                      const catMatches = reqCatId
                        ? availableAssets.filter((a) => Number(a.category_id) === Number(reqCatId))
                        : [];
                      const listToDisplay = catMatches.length > 0 ? catMatches : availableAssets;

                      if (listToDisplay.length === 0) {
                        return (
                          <div className="p-3 text-center text-xs text-muted-foreground">
                            No available assets in inventory
                          </div>
                        );
                      }

                      return listToDisplay.map((a) => (
                        <SelectItem key={a.id} value={a.id.toString()}>
                          {a.name} (SN: {a.serial_number || "N/A"})
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label className="font-semibold text-zinc-700">Condition at Handover</Label>
              <Select value={approveData.condition_out} onValueChange={(v) => setApproveData({ ...approveData, condition_out: v })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="font-semibold text-zinc-700">HR Remarks / Comments</Label>
              <Input
                value={approveData.hr_comment}
                onChange={(e) => setApproveData({ ...approveData, hr_comment: e.target.value })}
                placeholder="Optional remarks"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setApproveOpen({ open: false, request: null })}>
              Cancel
            </Button>
            <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleApproveRequest} disabled={isSubmitting}>
              Approve Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ============================================================ */}
      {/* EDIT ASSET DIALOG */}
      {/* ============================================================ */}
      <Dialog open={editOpen.open} onOpenChange={(v) => !v && setEditOpen({ open: false, asset: null })}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Asset Details</DialogTitle>
            <DialogDescription>Modify company asset item details, status, or image.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="font-semibold text-zinc-700">Name / Model</Label>
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                placeholder="e.g. MacBook Pro M2"
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label className="font-semibold text-zinc-700">Category</Label>
              <Select
                value={editData.category_id}
                onValueChange={(v) => setEditData({ ...editData, category_id: v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="font-semibold text-zinc-700">Serial / Tag Number</Label>
              <Input
                value={editData.serial_number}
                onChange={(e) => setEditData({ ...editData, serial_number: e.target.value })}
                placeholder="Optional serial number"
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="font-semibold text-zinc-700">Condition</Label>
                <Select
                  value={editData.condition}
                  onValueChange={(v) => setEditData({ ...editData, condition: v })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="font-semibold text-zinc-700">Status</Label>
                <Select
                  value={editData.status}
                  onValueChange={(v) => setEditData({ ...editData, status: v })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="available">Active</SelectItem>
                    <SelectItem value="under_repair">Repair</SelectItem>
                    <SelectItem value="retired">Broken</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="font-semibold text-zinc-700">Asset Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setEditData({ ...editData, image: file });
                }}
                className="rounded-xl cursor-pointer"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setEditOpen({ open: false, asset: null })}>
              Cancel
            </Button>
            <Button className="rounded-xl" onClick={handleEditAsset} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* DELETE ASSET DIALOG */}
      {/* ============================================================ */}
      <Dialog open={deleteOpen.open} onOpenChange={(v) => !v && setDeleteOpen({ open: false, assetId: null })}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-rose-600">Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this asset? This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteOpen({ open: false, assetId: null })}>
              Cancel
            </Button>
            <Button className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDeleteAsset} disabled={isSubmitting}>
              {isSubmitting ? "Deleting..." : "Delete Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* HISTORY DIALOG */}
      {/* ============================================================ */}
      <Dialog open={historyOpen.open} onOpenChange={(v) => !v && setHistoryOpen({ open: false, asset: null })}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Details</DialogTitle>
            <DialogDescription className="text-zinc-500 text-sm font-semibold">
              Assignment History
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            {(() => {
              const events: any[] = [];
              if (historyOpen.asset?.assethistory) {
                historyOpen.asset.assethistory.forEach((h: any) => {
                  // Assignment Event
                  events.push({
                    id: `assign-${h.id}`,
                    type: "assign",
                    employee: h.employee,
                    date: h.assigned_date,
                    condition: h.condition_out,
                  });
                  // Return Event
                  if (h.returned_date) {
                    events.push({
                      id: `return-${h.id}`,
                      type: "return",
                      employee: h.employee,
                      date: h.returned_date,
                      condition: h.condition_in || "good",
                    });
                  }
                });
                // Sort descending (latest first)
                events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              }

              if (events.length === 0) {
                return (
                  <div className="text-center py-6 text-muted-foreground italic text-sm">
                    No assignment history found for this asset.
                  </div>
                );
              }

              return (
                <div className="pl-2">
                  {events.map((e: any, idx: number) => {
                    const isAssign = e.type === "assign";
                    return (
                      <div key={e.id} className="relative pl-8 pb-6 last:pb-0">
                        {/* Timeline line */}
                        {idx !== events.length - 1 && (
                          <div className="absolute left-2.5 top-5 bottom-0 w-0.5 bg-zinc-200" />
                        )}
                        {/* Timeline circle */}
                        <div
                          className={`absolute left-0 top-1.5 size-5 rounded-full flex items-center justify-center border ${
                            isAssign
                              ? "bg-emerald-100 border-emerald-500 text-emerald-600"
                              : "bg-blue-100 border-blue-500 text-blue-600"
                          }`}
                        >
                          <CheckCircle2 className="size-3" />
                        </div>
                        <div className="space-y-1">
                          <div>
                            <span className="font-bold text-zinc-900">Admin</span>{" "}
                            <span className="text-rose-600 font-semibold">
                              {isAssign ? "Assign To" : "Return From"}
                            </span>{" "}
                            <span className="text-zinc-800 font-bold">
                              {e.employee?.first_name} {e.employee?.last_name} (Employee)
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {dayjs(e.date).format("MMM DD, YYYY")}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl w-full" onClick={() => setHistoryOpen({ open: false, asset: null })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
