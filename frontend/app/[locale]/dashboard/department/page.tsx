"use client";

import React from "react";
import { useTranslations } from "next-intl";
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
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, MoreVertical, Edit2, Power, PowerOff, UserCircle } from "lucide-react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useDepartments } from "@/hooks/useOrg";
import {
  addDepartment,
  updateDepartment,
  deactivateDepartment,
  activateDepartment,
} from "@/services/department.services";
import { getAllEmployee } from "@/services/employee.services";
import { toast } from "sonner";
import { LoadingState } from "@/components/ui/loading-state";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function DepartmentPage() {
  const queryClient = useQueryClient();
  const t = useTranslations("department");
  const tc = useTranslations("common");
  const [page, setPage] = React.useState(1);
  const limit = 10;
  const { data: deptData, isLoading, isError } = useDepartments(null, page, limit);

  // Fetch all active employees for the manager dropdown
  const { data: empData } = useQuery({
    queryKey: ["employees-all"],
    queryFn: () => getAllEmployee(1, 500),
  });
  const employees: any[] = empData?.data ?? [];
  const managers = employees.filter((emp: any) => {
    const roleName = emp.role_name?.toLowerCase() || "";
    return roleName.includes("manager") || roleName === "admin" || roleName === "hr";
  });

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingDept, setEditingDept] = React.useState<any>(null);
  const [formName, setFormName] = React.useState("");
  const [formManagerId, setFormManagerId] = React.useState<string>("none");

  const resetForm = () => {
    setEditingDept(null);
    setFormName("");
    setFormManagerId("none");
  };

  const mutation = useMutation({
    mutationFn: (data: { name: string; manager_id: number | null }) => {
      if (editingDept) {
        return updateDepartment(editingDept.id, data);
      }
      return addDepartment(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success(editingDept ? t("updated") : t("added"));
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || tc("error"));
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active ? deactivateDepartment(id) : activateDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success(t("statusUpdated"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    mutation.mutate({
      name: formName.trim(),
      manager_id: formManagerId && formManagerId !== "none" ? Number(formManagerId) : null,
    });
  };

  const handleEdit = (dept: any) => {
    setEditingDept(dept);
    setFormName(dept.name);
    const mgr = dept.employee_department_manager_idToemployee;
    setFormManagerId(mgr ? String(mgr.id) : "none");
    setIsDialogOpen(true);
  };

  if (isLoading) return <LoadingState variant="table" count={5} />;
  if (isError) return <div className="p-8 text-center text-red-500">{t("errorLoading")}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="rounded-xl gap-2">
              <Plus className="size-4" />
              {t("addDepartment")}
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingDept ? t("editDepartment") : t("addDepartment")}
                </DialogTitle>
                <DialogDescription>
                  {t("departmentFormDesc")}
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-4">
                {/* Department name */}
                <div className="space-y-2">
                  <Label htmlFor="dept-name">{t("departmentName")}</Label>
                  <Input
                    id="dept-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Human Resources"
                    required
                  />
                </div>

                {/* Manager select */}
                <div className="space-y-2">
                  <Label htmlFor="dept-manager">{t("manager")}</Label>
                  <Select value={formManagerId} onValueChange={setFormManagerId}>
                    <SelectTrigger id="dept-manager" className="w-full">
                      <SelectValue placeholder={t("managerPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[100]">
                      <SelectGroup>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">{t("noManager")}</span>
                        </SelectItem>
                        {managers.map((emp: any) => (
                          <SelectItem key={emp.id} value={String(emp.id)}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage
                                  src={emp.profile_path ? `${API_URL}${emp.profile_path}` : undefined}
                                />
                                <AvatarFallback className="text-[9px]">
                                  {emp.first_name?.[0]}{emp.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              {emp.first_name} {emp.last_name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t("managerHint")}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">{tc("cancel")}</Button>
                </DialogClose>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? tc("saving") : tc("save")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("departmentList")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                    {t("departmentName")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                    {t("manager")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                    {tc("status")}
                  </th>
                  <th className="w-[60px] px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                    {tc("actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {deptData?.data?.map((d: any) => {
                  const manager = d.employee_department_manager_idToemployee;
                  return (
                    <tr key={d.id} className="border-b last:border-0">
                      {/* Name */}
                      <td className="px-4 py-3 font-medium">{d.name}</td>

                      {/* Manager */}
                      <td className="px-4 py-3">
                        {manager ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage
                                src={manager.profile_path ? `${API_URL}${manager.profile_path}` : undefined}
                                alt={`${manager.first_name} ${manager.last_name}`}
                              />
                              <AvatarFallback className="text-xs">
                                {manager.first_name?.[0]}{manager.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">
                              {manager.first_name} {manager.last_name}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                            <UserCircle className="size-4" />
                            <span>{tc("notSet")}</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <Badge
                          className={`rounded-full ${
                            d.is_active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {d.is_active ? tc("active") : tc("inactive")}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(d)}>
                              <Edit2 className="mr-2 size-4" />
                              {tc("edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                toggleStatusMutation.mutate({ id: d.id, active: d.is_active })
                              }
                              className={d.is_active ? "text-amber-600" : "text-emerald-600"}
                            >
                              {d.is_active ? (
                                <>
                                  <PowerOff className="mr-2 size-4" />
                                  {tc("inactive")}
                                </>
                              ) : (
                                <>
                                  <Power className="mr-2 size-4" />
                                  {tc("active")}
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
                {(!deptData?.data || deptData.data.length === 0) && (
                  <tr>
                    <td colSpan={4} className="h-24 px-4 text-center text-muted-foreground">
                      {t("noDepartments")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {deptData?.pagination && deptData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {tc("previous")}
              </Button>
              <span className="text-sm font-medium">
                {tc("page")} {page} {tc("of")} {deptData.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(deptData.pagination.totalPages, p + 1))}
                disabled={page === deptData.pagination.totalPages}
              >
                {tc("next")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
