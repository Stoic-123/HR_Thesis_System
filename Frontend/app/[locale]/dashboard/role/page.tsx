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
import { getRoles, addRole, updateRole, updateRolePermissions } from "@/services/role.services";
import { Loader2, Plus, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";

const AVAILABLE_PERMISSIONS = [
  { path: "app:web_login", name: "Web Dashboard Access" },
  { path: "app:mobile_login", name: "Mobile App Access" },
  { path: "leave:approve", name: "Approve Leave Requests" },
  { path: "overtime:approve", name: "Approve Overtime Requests" },
  { path: "asset:approve", name: "Approve Asset Requests" },
  { path: "payroll:view", name: "View Payroll Records" },
  { path: "payroll:manage", name: "Generate & Manage Payroll" },
  { path: "kpi:evaluate", name: "Evaluate Employee KPIs" },
  { path: "role:manage", name: "Manage Roles & Permissions" },
  { path: "employee:manage", name: "Manage Employees List" },
  { path: "department:manage", name: "Manage Departments" },
];

export default function RolePage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [roleName, setRoleName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
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
        await fetchRoles();
        setAddDialogOpen(false);
        setRoleName("");
      } else {
        alert(data.message || "Failed to add role.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to add role.");
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
        alert(data.message || "Failed to update role.");
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
        await fetchRoles();
        setEditDialogOpen(false);
        setSelectedRole(null);
        setRoleName("");
        setSelectedPermissions([]);
      } else {
        alert(permData.message || "Failed to update permissions.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to update role.");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (role: any) => {
    setSelectedRole(role);
    setRoleName(role.name);
    const paths = role.rolebaseaccess ? role.rolebaseaccess.map((p: any) => p.path) : [];
    setSelectedPermissions(paths);
    setEditDialogOpen(true);
  };

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
                  <tr className="border-b border-white/35 text-left text-muted-foreground">
                    <th className="py-3">{t("roleId")}</th>
                    <th className="py-3">{tc("role")}</th>
                    <th className="py-3">{t("permissions")}</th>
                    <th className="py-3">{tc("status")}</th>
                    <th className="py-3 text-right">{tc("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((r) => (
                    <tr key={r.id} className="border-b border-white/30 hover:bg-white/5">
                      <td className="py-3 text-muted-foreground">#{r.id}</td>
                      <td className="py-3 font-semibold">{r.name}</td>
                      <td className="py-3 text-muted-foreground max-w-[400px] truncate" title={r.rolebaseaccess?.map((p: any) => p.path_name).join(", ")}>
                        {r.rolebaseaccess && r.rolebaseaccess.length > 0
                          ? r.rolebaseaccess.map((p: any) => p.path_name).join(", ")
                          : t("selfService")}
                      </td>
                      <td className="py-3">
                        <Badge className="rounded-full bg-emerald-50 text-emerald-700">
                          {tc("active")}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(r)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
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
              <Label htmlFor="editRoleName">{t("roleName")}</Label>
              <Input
                id="editRoleName"
                placeholder={t("roleName")}
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
              />
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              <Label className="text-base font-semibold">Permissions</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                {AVAILABLE_PERMISSIONS.map((perm) => (
                  <label
                    key={perm.path}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 cursor-pointer border border-border/40 text-sm transition-colors"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 accent-primary h-4 w-4 cursor-pointer"
                      checked={selectedPermissions.includes(perm.path)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPermissions([...selectedPermissions, perm.path]);
                        } else {
                          setSelectedPermissions(selectedPermissions.filter((p) => p !== perm.path));
                        }
                      }}
                    />
                    <span className="font-medium text-foreground">{perm.name}</span>
                  </label>
                ))}
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
    </div>
  );
}
