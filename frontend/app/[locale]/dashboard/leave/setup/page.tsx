"use client";

import React, { useEffect, useState } from "react";
import { Plus, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations, useLocale } from "next-intl";
import {
  getAllLeaveTypes,
  createLeaveType,
  updateLeaveType,
} from "@/services/leavetype.services";
import { toast } from "sonner";

interface LeaveType {
  id: number;
  name: string;
  code: string;
  default_balance: number;
  company_id: number;
  created_at: string;
  updated_at: string;
}

const LeaveSetupPage = () => {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    default_balance: 0,
  });

  const [editFormData, setEditFormData] = useState({
    id: 0,
    name: "",
    code: "",
    default_balance: 0,
  });

  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);

  const t = useTranslations("leaveSetup");
  const tc = useTranslations("common");
  const locale = useLocale();

  const fetchLeaveTypes = async () => {
    try {
      setLoading(true);
      const res = await getAllLeaveTypes(1, 100);
      if (res.result) {
        setLeaveTypes(res.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch leave types:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const handleCreate = async () => {
    if (!formData.name || !formData.code || formData.default_balance < 0) {
      return;
    }
    try {
      setSubmitting(true);
      const res = await createLeaveType(formData);
      if (res.result) {
        setDialogOpen(false);
        setFormData({ name: "", code: "", default_balance: 0 });
        fetchLeaveTypes();
        toast.success(
          locale === "km"
            ? "បានបង្កើតប្រភេទច្បាប់ឈប់សម្រាកដោយជោគជ័យ"
            : "Leave type created successfully"
        );
      } else {
        toast.error(res.message || "Failed to create");
      }
    } catch (error) {
      console.error("Failed to create leave type:", error);
      toast.error("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (item: LeaveType) => {
    setEditFormData({
      id: item.id,
      name: item.name,
      code: item.code,
      default_balance: item.default_balance,
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editFormData.name || !editFormData.code || editFormData.default_balance < 0) {
      return;
    }
    try {
      setUpdating(true);
      const res = await updateLeaveType(editFormData.id, {
        name: editFormData.name,
        code: editFormData.code,
        default_balance: editFormData.default_balance,
      });
      if (res.result) {
        setEditDialogOpen(false);
        fetchLeaveTypes();
        toast.success(
          locale === "km"
            ? "បានធ្វើបច្ចុប្បន្នភាពប្រភេទច្បាប់ឈប់សម្រាកដោយជោគជ័យ"
            : "Leave type updated successfully"
        );
      } else {
        toast.error(res.message || "Failed to update");
      }
    } catch (error) {
      console.error("Failed to update leave type:", error);
      toast.error("An error occurred");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("title") || "Leave Setup"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("description") || "Configure leave types and standard day allocations."}
          </p>
        </div>

        {/* Add Leave Type Trigger */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl shadow-xs bg-primary hover:bg-primary/90 text-white font-semibold gap-2 self-start sm:self-auto cursor-pointer">
              <Plus className="size-4" />
              {t("addType") || "Add Type"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {t("addLeaveType") || "Add Leave Type"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t("addLeaveTypeDesc") || "Add a new leave type category and default annual allowance."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground">
                  {t("nameLabel") || "Leave Name"}
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={t("namePlaceholder") || "e.g. Annual Leave"}
                  className="rounded-xl h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-xs font-semibold text-muted-foreground">
                  {t("codeLabel") || "Short Code"}
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  placeholder={t("codePlaceholder") || "e.g. AL"}
                  className="rounded-xl h-10 text-sm uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="balance" className="text-xs font-semibold text-muted-foreground">
                  {t("daysLabel") || "Default Allowance (Days)"}
                </Label>
                <Input
                  id="balance"
                  type="number"
                  min="0"
                  value={formData.default_balance}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      default_balance: parseInt(e.target.value) || 0,
                    })
                  }
                  className="rounded-xl h-10 text-sm"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                className="rounded-xl cursor-pointer"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                {tc("cancel") || "Cancel"}
              </Button>
              <Button
                className="rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold cursor-pointer"
                onClick={handleCreate}
                disabled={submitting || !formData.name || !formData.code}
              >
                {submitting ? (locale === "km" ? "កំពុងបង្កើត..." : "Creating...") : (tc("create") || "Create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Leave Types Card */}
      <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
        <CardHeader className="flex-row items-center justify-between pb-3 px-6">
          <div>
            <CardTitle>{t("leaveTypes") || "Leave Types"}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {locale === "km"
                ? `ប្រភេទច្បាប់សរុបចំនួន ${leaveTypes.length}`
                : `Total ${leaveTypes.length} leave categories configured`}
            </p>
          </div>
          <Badge className="rounded-full bg-primary/10 text-primary">
            {locale === "km" ? "ការកំណត់ច្បាប់" : "Policy Settings"}
          </Badge>
        </CardHeader>

        <CardContent className="p-6 pt-2 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {tc("loading") || "Loading..."}
            </div>
          ) : leaveTypes.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              {locale === "km"
                ? "មិនទាន់មានប្រភេទច្បាប់ឈប់សម្រាកនៅឡើយទេ"
                : "No leave types configured yet. Click 'Add Type' to create one."}
            </div>
          ) : (
            leaveTypes.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/80 hover:bg-background transition-all p-4 shadow-2xs"
              >
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground text-sm sm:text-base">
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium">
                    {locale === "km" ? `${item.default_balance} ថ្ងៃ/ឆ្នាំ` : `${item.default_balance} days/year`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="rounded-full px-3 py-1 font-semibold text-xs bg-muted/40">
                    {t("codePrefix") || "Code"}: {item.code}
                  </Badge>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 rounded-xl cursor-pointer hover:bg-muted"
                    onClick={() => handleOpenEdit(item)}
                    title={locale === "km" ? "កែសម្រួល" : "Edit"}
                  >
                    <Edit className="size-3.5 text-muted-foreground hover:text-primary" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Edit Leave Type Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {locale === "km" ? "កែសម្រួលប្រភេទច្បាប់ឈប់សម្រាក" : "Edit Leave Type"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {locale === "km"
                ? "កែប្រែព័ត៌មានលម្អិតនៃប្រភេទច្បាប់ឈប់សម្រាកនេះ។"
                : "Modify name, code, or standard annual allowance."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs font-semibold text-muted-foreground">
                {t("nameLabel") || "Leave Name"}
              </Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
                placeholder={t("namePlaceholder") || "Leave Name"}
                className="rounded-xl h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-code" className="text-xs font-semibold text-muted-foreground">
                {t("codeLabel") || "Short Code"}
              </Label>
              <Input
                id="edit-code"
                value={editFormData.code}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })
                }
                placeholder={t("codePlaceholder") || "Code"}
                className="rounded-xl h-10 text-sm uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-balance" className="text-xs font-semibold text-muted-foreground">
                {t("daysLabel") || "Default Allowance (Days)"}
              </Label>
              <Input
                id="edit-balance"
                type="number"
                min="0"
                value={editFormData.default_balance}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    default_balance: parseInt(e.target.value) || 0,
                  })
                }
                className="rounded-xl h-10 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="rounded-xl cursor-pointer"
              onClick={() => setEditDialogOpen(false)}
              disabled={updating}
            >
              {tc("cancel") || "Cancel"}
            </Button>
            <Button
              className="rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold cursor-pointer"
              onClick={handleUpdate}
              disabled={updating || !editFormData.name || !editFormData.code}
            >
              {updating
                ? (locale === "km" ? "កំពុងរក្សាទុក..." : "Saving...")
                : (tc("save") || "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveSetupPage;
