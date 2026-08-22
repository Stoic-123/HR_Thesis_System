"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUsers, updateUser, resetPassword } from "@/services/user.services";
import { getRoles } from "@/services/role.services";
import { Loader2, Pencil, Search, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
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

  // Search & Filter & Pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
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

  // Filtered and Paginated users
  const filteredUsers = users.filter((u) => {
    const roleName = roles.find((r) => r.id === u.role_id)?.name || u.name || "";
    const matchesSearch =
      !searchQuery ||
      (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      roleName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole =
      selectedRoleFilter === "all" || String(u.role_id) === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.ceil(filteredUsers.length / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <Card className="border border-border/60 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/40 bg-muted/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">{t("userList")}</CardTitle>
              <Badge variant="secondary" className="rounded-full text-xs px-2.5 py-0.5">
                {filteredUsers.length} Users
              </Badge>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="relative w-full sm:w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search user, email, role..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8.5 h-9 rounded-xl text-xs bg-background border-border/60 shadow-xs"
                />
              </div>

              <Select
                value={selectedRoleFilter}
                onValueChange={(val) => {
                  setSelectedRoleFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[150px] h-9 rounded-xl text-xs bg-background border-border/60 shadow-xs">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="h-9 w-9 p-0 rounded-xl cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {error ? (
            <div className="text-red-500 text-sm p-6 text-center">{error}</div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-muted-foreground text-sm py-16 text-center">
              {t("noUsers")}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[520px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
              <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                <thead className="sticky top-0 bg-card/95 backdrop-blur-md z-10 font-semibold text-muted-foreground uppercase border-b border-border/40">
                  <tr>
                    <th className="py-3 px-4 whitespace-nowrap">{tc("name")}</th>
                    <th className="py-3 px-4 whitespace-nowrap">{tc("email")}</th>
                    <th className="py-3 px-4 whitespace-nowrap">{tc("role")}</th>
                    <th className="py-3 px-4 whitespace-nowrap">{tc("status")}</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap w-[90px]">{tc("actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {paginatedUsers.map((u) => {
                    const roleName = roles.find((r) => r.id === u.role_id)?.name || u.name || "N/A";
                    return (
                      <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-4 font-semibold whitespace-nowrap text-foreground">
                          {u.username}
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">
                          {u.email || "N/A"}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <Badge variant="outline" className="rounded-full bg-muted/40 border-border/50 px-2.5 py-0.5 text-xs text-foreground font-normal whitespace-nowrap">
                            {roleName}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {u.is_active === "active" ? (
                            <Badge className="rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[11px] font-medium whitespace-nowrap">
                              {tc("active")}
                            </Badge>
                          ) : (
                            <Badge className="rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[11px] font-medium whitespace-nowrap">
                              {tc("inactive")}
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(u)}
                            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer inline-flex items-center justify-center"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls matching time-attendance/report & kpi pages */}
          {filteredUsers.length > 0 && !loading && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/30 px-6 py-4 gap-3 bg-muted/5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                  Show:
                </span>
                <Select
                  value={String(limit)}
                  onValueChange={(val) => {
                    setLimit(Number(val));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[72px] rounded-lg text-xs border-border/60 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  Showing {startIndex + 1} to {Math.min(startIndex + limit, filteredUsers.length)} of {filteredUsers.length} users
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="h-8 px-3 rounded-lg text-xs border-border/60 font-medium cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                </Button>
                <span className="text-xs text-muted-foreground px-2 font-medium whitespace-nowrap">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="h-8 px-3 rounded-lg text-xs border-border/60 font-medium cursor-pointer"
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md border-border/60 bg-card shadow-2xl backdrop-blur-xl rounded-3xl">
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
                className="w-full rounded-xl gap-2 bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm transition-all duration-200 cursor-pointer"
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
              className="rounded-xl cursor-pointer"
            >
              {tc("cancel")}
            </Button>
            <Button
              onClick={handleSaveUser}
              disabled={isSaving}
              className="rounded-xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Alert Dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={(open) => {
        if (!isResettingPassword) setIsConfirmOpen(open);
      }}>
        <AlertDialogContent className="border-border/60 bg-card shadow-2xl backdrop-blur-xl rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">{t("resetPassword") || "Reset Password"}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {t("resetConfirm", { username: editingUser?.username }) || `Are you sure you want to reset password for ${editingUser?.username}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResettingPassword} className="rounded-xl cursor-pointer">{tc("cancel")}</AlertDialogCancel>
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
