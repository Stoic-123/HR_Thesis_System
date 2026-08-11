"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUsers, updateUser, resetPassword } from "@/services/user.services";
import { getRoles } from "@/services/role.services";
import { Loader2, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function UserPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const t = useTranslations("user");
  const tc = useTranslations("common");

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersResponse, rolesResponse] = await Promise.all([
        getUsers(),
        getRoles(),
      ]);

      if (usersResponse.result) {
        setUsers(usersResponse.data || []);
      } else {
        setError(usersResponse.message || "Failed to load users.");
      }

      if (rolesResponse.result) {
        setRoles(rolesResponse.data || []);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEditClick = (user: any) => {
    setEditingUser(user);
    setSelectedRoleId(user.role_id);
    setIsDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser || selectedRoleId === null) return;
    try {
      setIsSaving(true);
      const response = await updateUser(editingUser.id, { role_id: selectedRoleId });
      if (response.result) {
        toast.success("User role updated successfully");
        setIsDialogOpen(false);
        // Refresh users list
        const updatedUsers = await getUsers();
        if (updatedUsers.result) {
          setUsers(updatedUsers.data || []);
        }
      } else {
        toast.error(response.message || "Failed to update role.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while updating the role.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = () => {
    setIsConfirmOpen(true);
  };

  const handleConfirmReset = async () => {
    if (!editingUser || isResettingPassword) return;
    try {
      setIsResettingPassword(true);
      const response = await resetPassword(editingUser.id);
      setIsConfirmOpen(false);
      if (response.result) {
        toast.success(response.message || "Password reset to default successfully.");
      } else {
        toast.error(response.message || "Failed to reset password.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while resetting password.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t("userList")}</CardTitle>
          {(loading || updatingId !== null || isSaving) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-red-500 text-sm py-4">{error}</div>
          ) : loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-muted-foreground text-sm py-4 text-center">
              {t("noUsers")}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/35 text-left text-muted-foreground">
                    <th className="px-4 py-3 text-xs font-semibold">{tc("name")}</th>
                    <th className="px-4 py-3 text-xs font-semibold">{tc("email")}</th>
                    <th className="px-4 py-3 text-xs font-semibold">{tc("role")}</th>
                    <th className="px-4 py-3 text-xs font-semibold">{tc("status")}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-center w-[100px]">{tc("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-white/30 last:border-0 hover:bg-white/5">
                      <td className="px-4 py-3 font-semibold">{u.username}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email || "N/A"}</td>
                      <td className="px-4 py-3 font-medium">
                        <Badge variant="outline" className="rounded-full bg-white/5 border-white/10 px-2.5 py-0.5 text-xs text-foreground font-normal">
                          {roles.find((r) => r.id === u.role_id)?.name || u.name || "N/A"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {u.is_active === 'active' ? (
                          <Badge className="rounded-full bg-emerald-50 text-emerald-700">
                            {tc("active")}
                          </Badge>
                        ) : (
                          <Badge className="rounded-full bg-rose-50 text-rose-700">
                            {tc("inactive")}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(u)}
                          className="rounded-lg h-8 w-8 hover:bg-white/10"
                        >
                          <Pencil className="size-4 text-muted-foreground hover:text-foreground" />
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md border-white/60 bg-white/95 shadow-2xl backdrop-blur-xl rounded-3xl dark:bg-zinc-900/95 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {t("editUser")}
            </DialogTitle>
            <DialogDescription>
              Update access role or reset password for <strong>{editingUser?.username}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Role Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground block">
                {tc("role")}
              </label>
              <Select
                value={String(selectedRoleId || "")}
                onValueChange={(val) => setSelectedRoleId(Number(val))}
              >
                <SelectTrigger className="w-full h-10 rounded-xl">
                  <SelectValue placeholder={t("selectRole") || "Select Role"} />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <hr className="border-t border-muted/50" />

            {/* Reset Password */}
            <div className="space-y-3 bg-red-50/50 dark:bg-red-950/20 p-4 rounded-2xl border border-red-100 dark:border-red-950/50">
              <h4 className="text-sm font-semibold text-red-800 dark:text-red-400">
                {t("resetPasswordToDefault")}
              </h4>
              <p className="text-xs text-red-600/80 dark:text-red-400/80">
                {t("resetPasswordWarning")}
              </p>
              <Button
                type="button"
                variant="destructive"
                className="w-full rounded-xl gap-2 bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm transition-all duration-200"
                onClick={handleResetPassword}
                disabled={isResettingPassword}
              >
                {isResettingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  t("resetPassword")
                )}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="rounded-xl"
            >
              {tc("cancel")}
            </Button>
            <Button
              onClick={handleSaveUser}
              disabled={isSaving}
              className="rounded-xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmOpen} onOpenChange={(open) => {
        if (!isResettingPassword) setIsConfirmOpen(open);
      }}>
        <AlertDialogContent className="border-white/60 bg-white/95 shadow-2xl backdrop-blur-xl rounded-3xl dark:bg-zinc-900/95 dark:border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">{t("resetPassword") || "Reset Password"}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {t("resetConfirm", { username: editingUser?.username }) || `Are you sure you want to reset password for ${editingUser?.username}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResettingPassword} className="rounded-xl">{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmReset();
              }}
              disabled={isResettingPassword}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl cursor-pointer disabled:opacity-50 gap-2"
            >
              {isResettingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("resetPassword") || "Reset Password"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

