"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAssetCategories } from "@/hooks/useAsset";
import { createAssetCategory, type AssetCategory } from "@/services/asset.services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function AssetCategoriesPage() {
  const queryClient = useQueryClient();
  const { data: categoriesResponse, isLoading } = useAssetCategories();
  const categories: AssetCategory[] = categoriesResponse?.data || [];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    } catch (error) {
      toast.error("Failed to create category");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Asset Categories</h1>
          <p className="text-sm text-muted-foreground">Manage different types of assets.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4 mr-2" /> New Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Asset Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Laptop" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional details..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState variant="table" count={1} />
          ) : categories.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No categories found.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">#{c.id}</TableCell>
                      <TableCell>{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.description || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
