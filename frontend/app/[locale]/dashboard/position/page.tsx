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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
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
import { Plus, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { usePositions, useDepartments } from "@/hooks/useOrg";
import { 
  addPosition, 
  updatePosition, 
  deletePosition 
} from "@/services/position.services";
import { toast } from "sonner";
import { LoadingState } from "@/components/ui/loading-state";

export default function PositionPage() {
  const queryClient = useQueryClient();
  const t = useTranslations("position");
  const tc = useTranslations("common");
  const [page, setPage] = React.useState(1);
  const limit = 10;
  const { data: posData, isLoading, isError } = usePositions(page, limit);
  const { data: deptData } = useDepartments(1, 1, 100);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingPos, setEditingPos] = React.useState<any>(null);
  const [formData, setFormData] = React.useState({ name: "", department_id: "" });

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (editingPos) {
        return updatePosition(editingPos.id, {
          name: data.name,
          department_id: Number(data.department_id)
        });
      }
      return addPosition({
        name: data.name,
        department_id: Number(data.department_id)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      toast.success(editingPos ? t("editPosition") : t("addPosition"));
      setIsDialogOpen(false);
      setEditingPos(null);
      setFormData({ name: "", department_id: "" });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || tc("error"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePosition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      toast.success(tc("delete") + " " + tc("success"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.department_id) {
      toast.error(t("selectDepartment"));
      return;
    }
    mutation.mutate(formData);
  };

  const handleEdit = (pos: any) => {
    setEditingPos(pos);
    setFormData({ 
      name: pos.name, 
      department_id: pos.department_id?.toString() || "" 
    });
    setIsDialogOpen(true);
  };

  if (isLoading) return <LoadingState variant="table" count={5} />;
  if (isError) return <div className="p-8 text-center text-red-500">{t("errorLoading")}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingPos(null);
            setFormData({ name: "", department_id: "" });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gap-2">
              <Plus className="size-4" />
              {t("addPosition")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingPos ? t("editPosition") : t("addPosition")}</DialogTitle>
                <DialogDescription>
                  {t("positionFormDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("positionName")}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Senior Frontend Developer"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dept">{tc("department")}</Label>
                  <Select
                    value={formData.department_id}
                    onValueChange={(v) => setFormData({ ...formData, department_id: v })}
                  >
                    <SelectTrigger id="dept">
                      <SelectValue placeholder={t("selectDepartment")} />
                    </SelectTrigger>
                    <SelectContent>
                      {deptData?.data?.map((dept: any) => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{tc("cancel")}</Button>
                </DialogClose>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? tc("saving") : tc("save")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("positionList")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                    {t("positionName")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                    {tc("department")}
                  </th>
                  <th className="w-[100px] px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                    {tc("actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {posData?.data?.map((p: any) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3">
                    <Badge variant="outline" className="rounded-full">
                      {p.department?.name || t("noDepartment")}
                    </Badge>
                    </td>
                    <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(p)}>
                          <Edit2 className="mr-2 size-4" />
                          {tc("edit")}
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                              onSelect={(e) => e.preventDefault()}
                              className="text-red-600 cursor-pointer"
                            >
                              <Trash2 className="mr-2 size-4" />
                              {tc("delete")}
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{tc("delete")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("deleteConfirm")}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl font-medium">{tc("cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(p.id)}
                                variant="destructive"
                                className="rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white"
                              >
                                {tc("delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {(!posData?.data || posData.data.length === 0) && (
                  <tr>
                    <td
                      colSpan={3}
                      className="h-24 px-4 text-center text-muted-foreground"
                    >
                      {t("noPositions")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {posData?.pagination && posData.pagination.totalPages > 1 && (
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
                {tc("page")} {page} {tc("of")} {posData.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(posData.pagination.totalPages, p + 1))}
                disabled={page === posData.pagination.totalPages}
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
