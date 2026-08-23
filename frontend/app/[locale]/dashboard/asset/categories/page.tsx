"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAssetCategories } from "@/hooks/useAsset";
import { createAssetCategory, deleteAssetCategory, type AssetCategory } from "@/services/asset.services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function AssetCategoriesPage() {
  const t = useTranslations("asset");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const { data: categoriesResponse, isLoading } = useAssetCategories();
  const categories: AssetCategory[] = categoriesResponse?.data || [];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (!name) return toast.error("Name is required");
    setIsSubmitting(true);
    try {
      await createAssetCategory({ name, description });
      toast.success("Category created successfully");
      queryClient.invalidateQueries({ queryKey: ["asset-categories"] });
      setIsDialogOpen(false);
      setName("");
      setDescription("");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCategoryId) return;
    setIsSubmitting(true);
    try {
      await deleteAssetCategory(deleteCategoryId);
      toast.success("Category deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["asset-categories"] });
      setDeleteCategoryId(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete category");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("categories")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4 mr-2" /> {t("newCategory")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("newCategory")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{tCommon("name")}</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Laptop" />
              </div>
              <div className="space-y-2">
                <Label>{tCommon("description")}</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional details..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{tCommon("cancel")}</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? tCommon("saving") : tCommon("save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("categories")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState variant="table" count={1} />
          ) : categories.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">{tCommon("noData")}</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>{tCommon("name")}</TableHead>
                    <TableHead>{tCommon("description")}</TableHead>
                    <TableHead className="text-center">Assets</TableHead>
                    <TableHead className="text-right">{tCommon("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">#{c.id}</TableCell>
                      <TableCell>{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.description || "-"}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-600">
                          {c._count?.asset ?? 0} assets
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                          onClick={() => setDeleteCategoryId(c.id)}
                        >
                          <Trash2 className="size-3.5" />
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

      <Dialog open={deleteCategoryId !== null} onOpenChange={(v) => !v && setDeleteCategoryId(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          {(() => {
            const catToDelete = categories.find((c) => c.id === deleteCategoryId);
            const assetCount = catToDelete?._count?.asset ?? 0;
            const requestCount = catToDelete?._count?.assetrequest ?? 0;
            const inUse = assetCount > 0 || requestCount > 0;

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-rose-600">Confirm Deletion</DialogTitle>
                  <DialogDescription asChild>
                    <div className="text-sm text-muted-foreground pt-1">
                      {inUse ? (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200">
                          Cannot delete &quot;{catToDelete?.name}&quot; because it is currently assigned to {assetCount} asset(s). Please delete or reassign those assets first.
                        </div>
                      ) : (
                        <span>
                          Are you sure you want to delete &quot;{catToDelete?.name}&quot;? This action cannot be undone.
                        </span>
                      )}
                    </div>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 mt-4">
                  <Button variant="outline" onClick={() => setDeleteCategoryId(null)}>
                    {tCommon("cancel")}
                  </Button>
                  <Button
                    className="bg-rose-600 hover:bg-rose-700 text-white"
                    onClick={handleDelete}
                    disabled={isSubmitting || inUse}
                  >
                    {isSubmitting ? tCommon("deleting") || "Deleting..." : tCommon("delete") || "Delete"}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
