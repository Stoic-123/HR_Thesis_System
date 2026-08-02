"use client";
import React, { useEffect, useState } from "react";
import { CalendarCog, CircleCheck, ShieldCheck, Plus, Edit } from "lucide-react";
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
      const res = await getAllLeaveTypes(1, 100);
      if (res.result) {
        setLeaveTypes(res.data);
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
        toast.success(locale === "km" ? "បានបង្កើតប្រភេទច្បាប់ឈប់សម្រាកដោយជោគជ័យ" : "Leave type created successfully");
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
        toast.success(locale === "km" ? "បានធ្វើបច្ចុប្បន្នភាពប្រភេទច្បាប់ឈប់សម្រាកដោយជោគជ័យ" : "Leave type updated successfully");
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

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <CalendarCog className="size-4.5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("policyYear")}</p>
              <p className="text-xl font-semibold">{currentYear}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
              <ShieldCheck className="size-4.5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("autoApproval")}</p>
              <p className="text-xl font-semibold">{t("off")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
              <CircleCheck className="size-4.5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("unauthorizedDays")}</p>
              <p className="text-xl font-semibold">12 {t("days")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t("leaveTypes")}</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4 mr-2" />
                {t("addType")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("addLeaveType")}</DialogTitle>
                <DialogDescription>
                  {t("addLeaveTypeDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("nameLabel")}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder={t("namePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">{t("codeLabel")}</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder={t("codePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="balance">{t("daysLabel")}</Label>
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
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="secondary"
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                >
                  {tc("cancel")}
                </Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting ? t("creating") : tc("create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-center py-8">{tc("loading")}</div>
          ) : (
            leaveTypes.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 p-4"
              >
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {locale === "km" ? `${item.default_balance} ថ្ងៃ` : `${item.default_balance} days`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="rounded-full bg-primary/10 text-primary">
                    {t("codePrefix") || "Code"}: {item.code}
                  </Badge>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 rounded-lg cursor-pointer"
                    onClick={() => handleOpenEdit(item)}
                  >
                    <Edit className="size-4 text-muted-foreground hover:text-primary" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Edit Leave Type Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {locale === "km" ? "កែសម្រួលប្រភេទច្បាប់ឈប់សម្រាក" : "Edit Leave Type"}
            </DialogTitle>
            <DialogDescription>
              {locale === "km" ? "កែប្រែព័ត៌មានលម្អិតនៃប្រភេទច្បាប់ឈប់សម្រាកនេះ។" : "Modify the details of this leave type."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t("nameLabel")}</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
                placeholder={t("namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">{t("codeLabel")}</Label>
              <Input
                id="edit-code"
                value={editFormData.code}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, code: e.target.value })
                }
                placeholder={t("codePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-balance">{t("daysLabel")}</Label>
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
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setEditDialogOpen(false)}
              disabled={updating}
            >
              {tc("cancel")}
            </Button>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating ? (locale === "km" ? "កំពុងរក្សាទុក..." : "Saving...") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveSetupPage;
