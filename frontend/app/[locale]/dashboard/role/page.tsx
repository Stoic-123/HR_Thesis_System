"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getRoles, addRole, updateRole, updateRolePermissions, deleteRole } from "@/services/role.services";
import { Loader2, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const AVAILABLE_PERMISSIONS = [
  { path: "app:web_login", name: "Web Dashboard Access" },
  { path: "app:mobile_login", name: "Mobile App Access" },
  { path: "announcement:manage", name: "Manage Announcements" },
  { path: "recruitment:manage", name: "Manage Recruitment & Candidates" },
  { path: "leave:approve", name: "Approve Leave Requests" },
  { path: "overtime:approve", name: "Approve Overtime Requests" },
  { path: "asset:approve", name: "Approve Asset Requests" },
  { path: "payroll:view", name: "View Payroll Records" },
  { path: "payroll:manage", name: "Generate & Manage Payroll" },
  { path: "role:manage", name: "Manage Roles & Permissions" },
  { path: "employee:manage", name: "Manage Employees List" },
  { path: "department:manage", name: "Manage Departments" },
  { path: "kpi:manage", name: "Manage Monthly KPI & Reviews" },
  { path: "chatbot:access", name: "Access & Use HR AI Chatbot" },
];

export default function RolePage() {
  const queryClient = useQueryClient();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [roleName, setRoleName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const t = useTranslations("role");
  const tc = useTranslations("common");

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const data = await getRoles();
      if (data.result) {
        setRoles(data.data || []);
      } else {
        setError(data.message || "Failed to load roles.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching roles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleAddRole = async () => {
    try {
      setSubmitting(true);
      const data = await addRole(roleName);
      if (data.result) {
        toast.success(data.message || "Role created successfully.");
        await fetchRoles();
        setAddDialogOpen(false);
        setRoleName("");
      } else {
        toast.error(data.message || "Failed to add role.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to add role.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRole = async () => {
    if (!selectedRole) return;
    try {
      setSubmitting(true);
      const data = await updateRole(selectedRole.id, roleName);
      if (!data.result) {
        toast.error(data.message || "Failed to update role.");
        return;
      }

      const formattedPerms = selectedPermissions.map((p) => {
        const found = AVAILABLE_PERMISSIONS.find((ap) => ap.path === p);
        return {
          path: p,
          path_name: found ? found.name : p,
        };
      });

      const permData = await updateRolePermissions(selectedRole.id, formattedPerms);
      if (permData.result) {
        toast.success(permData.message || "Role permissions updated successfully.");
        await fetchRoles();
        await queryClient.invalidateQueries({ queryKey: ["me"] });
        setEditDialogOpen(false);
        setSelectedRole(null);
        setRoleName("");
        setSelectedPermissions([]);
      } else {
        toast.error(permData.message || "Failed to update permissions.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to update role.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      const res = await deleteRole(roleToDelete.id);
      if (res.result) {
        toast.success(res.message || "Role deleted successfully.");
        await fetchRoles();
        await queryClient.invalidateQueries({ queryKey: ["me"] });
        setIsDeleteDialogOpen(false);
        setRoleToDelete(null);
      } else {
        setDeleteError(res.message || "Failed to delete role.");
        toast.error(res.message || "Failed to delete role.");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to delete role.";
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const openEditDialog = (role: any) => {
    setSelectedRole(role);
    setRoleName(role.name);
    let paths = role.rolebaseaccess ? role.rolebaseaccess.map((p: any) => p.path) : [];
    if (role.name?.toLowerCase() === "admin") {
      if (!paths.includes("app:web_login")) paths.push("app:web_login");
      if (!paths.includes("role:manage")) paths.push("role:manage");
    }
    setSelectedPermissions(paths);
    setEditDialogOpen(true);
  };

  const isAdminSelected = selectedRole?.name?.toLowerCase() === "admin";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t("addRole")}
          </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("addNewRole")}</DialogTitle>
              <DialogDescription>{t("addRoleDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="roleName">{t("roleName")}</Label>
                <Input
                  id="roleName"
                  placeholder={t("roleName")}
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddRole} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {tc("save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t("roleList")}</CardTitle>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-red-500 text-sm py-4">{error}</div>
          ) : loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : roles.length === 0 ? (
            <div className="text-muted-foreground text-sm py-4 text-center">
              {t("noRoles")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-left text-muted-foreground">
                    <th className="py-3 px-3 font-semibold">{t("roleId")}</th>
                    <th className="py-3 px-3 font-semibold">{tc("role")}</th>
                    <th className="py-3 px-3 font-semibold">{t("permissions")}</th>
                    <th className="py-3 px-3 font-semibold">{tc("status")}</th>
                    <th className="py-3 px-3 font-semibold text-right">{tc("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((r) => (
                    <tr key={r.id} className="border-b border-border/30 hover:bg-muted/40 transition-colors">
                      <td className="py-3.5 px-3 text-muted-foreground align-middle">#{r.id}</td>
                      <td className="py-3.5 px-3 font-semibold text-foreground align-middle">
                        <div className="flex items-center gap-2">
                          <span>{r.name}</span>
                          {r.name.toLowerCase() === "admin" && (
                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-semibold py-0.5">
                              Core
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-muted-foreground max-w-[380px] truncate align-middle" title={r.rolebaseaccess?.map((p: any) => p.path_name).join(", ")}>
                        {r.rolebaseaccess && r.rolebaseaccess.length > 0
                          ? r.rolebaseaccess.map((p: any) => p.path_name).join(", ")
                          : t("selfService")}
                      </td>
                      <td className="py-3.5 px-3 align-middle">
                        <Badge className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0 font-medium">
                          {tc("active")}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-3 text-right align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditDialog(r)}
                            title={tc("edit")}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {r.name.toLowerCase() !== "admin" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                              onClick={() => {
                                setRoleToDelete(r);
                                setIsDeleteDialogOpen(true);
                              }}
                              title={tc("delete")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t("editRole")}</DialogTitle>
            <DialogDescription>{t("editRoleDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="editRoleName">{t("roleName")}</Label>
                {isAdminSelected && (
                  <span className="text-[11px] text-muted-foreground font-medium">System Core Role (Protected)</span>
                )}
              </div>
              <Input
                id="editRoleName"
                placeholder={t("roleName")}
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                disabled={isAdminSelected}
                className={isAdminSelected ? "bg-muted cursor-not-allowed opacity-80" : ""}
              />
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              <Label className="text-base font-semibold">{t("permissions")}</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                {AVAILABLE_PERMISSIONS.map((perm) => {
                  const isMandatoryAdminPerm =
                    isAdminSelected &&
                    (perm.path === "app:web_login" || perm.path === "role:manage");

                  const isChecked = isMandatoryAdminPerm || selectedPermissions.includes(perm.path);

                  return (
                    <label
                      key={perm.path}
                      className={`flex items-center justify-between gap-3 p-3 rounded-lg border border-border/40 text-sm transition-colors ${
                        isMandatoryAdminPerm
                          ? "bg-primary/5 border-primary/20 cursor-not-allowed"
                          : "hover:bg-muted/30 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 accent-primary h-4 w-4 cursor-pointer disabled:cursor-not-allowed"
                          checked={isChecked}
                          disabled={isMandatoryAdminPerm}
                          onChange={(e) => {
                            if (isMandatoryAdminPerm) return;
                            if (e.target.checked) {
                              setSelectedPermissions([...selectedPermissions, perm.path]);
                            } else {
                              setSelectedPermissions(selectedPermissions.filter((p) => p !== perm.path));
                            }
                          }}
                        />
                        <span className="font-medium text-foreground truncate">{perm.name}</span>
                      </div>
                      {isMandatoryAdminPerm && (
                        <Badge variant="secondary" className="text-[10px] shrink-0 bg-primary/10 text-primary border-0 font-semibold">
                          Required
                        </Badge>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEditRole} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setDeleteError(null);
            setRoleToDelete(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[440px] p-6 rounded-2xl">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="size-5" />
              </div>
              <DialogTitle className="text-lg font-bold">{tc("confirmDelete")}</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to delete the role <strong className="text-foreground font-semibold">"{roleToDelete?.name}"</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteError ? (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-800/50 rounded-xl text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2.5 my-2">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{deleteError}</div>
            </div>
          ) : (
            <div className="p-3 bg-muted/40 rounded-xl text-xs text-muted-foreground space-y-1 border border-border/40 my-2">
              <p>• Roles with assigned employees cannot be deleted.</p>
              <p>• The system core Admin role is protected from deletion.</p>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeleteError(null);
              }}
              className="rounded-xl"
              disabled={deleting}
            >
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              type="button"
              onClick={handleDeleteRole}
              disabled={deleting}
              className="rounded-xl gap-1.5"
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              {tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
