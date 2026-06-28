"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { getDocumentTypes, addDocumentType, deleteDocumentType, updateDocumentType } from "@/services/document.services";
import { useMe } from "@/hooks/useMe";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  FileText,
  Plus,
  Trash2,
  Search,
  ShieldAlert,
  Loader2,
  Edit3
} from "lucide-react";

import { toast } from "sonner";
import { LoadingState } from "@/components/ui/loading-state";

export default function DocumentTypePage() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const t = useTranslations("documentType");
  const tc = useTranslations("common");

  const { data: docTypes, isLoading, isError } = useQuery({
    queryKey: ["document-types"],
    queryFn: () => getDocumentTypes(1, 100),
  });

  const addMutation = useMutation({
    mutationFn: (name: string) => addDocumentType(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-types"] });
      toast.success(t("added"));
      setIsAddOpen(false);
      setNewTypeName("");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t("addFailed"));
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateDocumentType(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-types"] });
      toast.success(t("edited"));
      setEditingType(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t("editFailed"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDocumentType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-types"] });
      toast.success(t("deleted"));
      setIsDeletingId(null);
      setDeleteConfirmText("");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t("deleteFailed"));
      setIsDeletingId(null);
      setDeleteConfirmText("");
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    addMutation.mutate(newTypeName);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType || !editingType.name.trim()) return;
    editMutation.mutate(editingType);
  };

  const filteredTypes = docTypes?.data?.filter((type: any) =>
    type.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) return <LoadingState variant="table" count={5} />;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-base">
            {t("description")}
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl gap-2 h-11 px-6 shadow-lg shadow-primary/20">
              <Plus className="size-4" />
              {t("addType")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleAddSubmit}>
              <DialogHeader>
                <DialogTitle>{t("addNewType")}</DialogTitle>
                <DialogDescription>
                  {t("addDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="py-6">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("typeName")}</Label>
                  <Input
                    id="name"
                    placeholder={t("typePlaceholder")}
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    className="rounded-xl"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost" className="rounded-xl">{tc("cancel")}</Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="rounded-xl"
                >
                  {addMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("adding")}</>
                  ) : (
                    tc("add")
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={t("searchTypes")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-12 pl-11 rounded-2xl border-white/40 bg-white/50 backdrop-blur-xl focus:bg-white/80 transition-all shadow-sm"
          />
        </div>
      </div>

      <Card className="apple-surface border-white/40 overflow-hidden">
        <CardHeader className="border-b border-white/40 bg-white/30">
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            {t("docTypes")}
          </CardTitle>
          <CardDescription>
            {t("typesListDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/40">
                <tr className="border-b border-white/35">
                  <th className="w-[100px] px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                    {t("typeName")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                    {t("createdAt")}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">
                    {tc("actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTypes.length > 0 ? (
                  filteredTypes.map((type: any) => (
                    <tr
                      key={type.id}
                      className="group border-b border-white/30 hover:bg-white/10 last:border-0"
                    >
                      <td className="px-6 py-3 font-medium text-muted-foreground">
                        #{type.id}
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground/80">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <FileText className="size-4" />
                          </div>
                          {type.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(type.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-right space-x-2">
                      <Dialog open={!!editingType && editingType.id === type.id.toString()} onOpenChange={(open) => !open && setEditingType(null)}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingType({ id: type.id.toString(), name: type.name })}
                            className="rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            <Edit3 className="size-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <form onSubmit={handleEditSubmit}>
                            <DialogHeader>
                              <DialogTitle>{t("editType")}</DialogTitle>
                              <DialogDescription>
                                {t("editTypeDesc")}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-6">
                              <div className="space-y-2">
                                <Label htmlFor="edit-name">{t("typeName")}</Label>
                                <Input
                                  id="edit-name"
                                  value={editingType?.name || ""}
                                  onChange={(e) => setEditingType(prev => prev ? { ...prev, name: e.target.value } : null)}
                                  className="rounded-xl"
                                  required
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="ghost" type="button" onClick={() => setEditingType(null)} className="rounded-xl">{tc("cancel")}</Button>
                              <Button
                                type="submit"
                                disabled={editMutation.isPending}
                                className="rounded-xl"
                              >
                                {editMutation.isPending ? (
                                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {tc("saving")}</>
                                ) : (
                                  tc("save")
                                )}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>

                      <Dialog
                        open={isDeletingId === type.id.toString()}
                        onOpenChange={(open) => {
                          setIsDeletingId(open ? type.id.toString() : null);
                          if (!open) setDeleteConfirmText("");
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsDeletingId(type.id.toString())}
                            className="rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-rose-600">
                              <ShieldAlert className="size-5" /> {t("deleteType")}
                            </DialogTitle>
                            <DialogDescription className="space-y-4 pt-2">
                              <p>
                                {t("deleteConfirmText", { name: type.name })}
                              </p>
                              <div className="space-y-2 pt-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                  {t("typeConfirmLabel")}
                                </Label>
                                <Input
                                  value={deleteConfirmText}
                                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                                  placeholder={t("typeConfirm")}
                                  className="rounded-xl border-rose-100 focus-visible:ring-rose-500"
                                />
                              </div>
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter className="mt-4">
                            <DialogClose asChild>
                              <Button variant="ghost" className="rounded-xl">{tc("cancel")}</Button>
                            </DialogClose>
                            <Button
                              variant="destructive"
                              onClick={() => deleteMutation.mutate(type.id.toString())}
                              disabled={deleteMutation.isPending || deleteConfirmText.toLowerCase() !== "confirm"}
                              className="rounded-xl bg-rose-500 hover:bg-rose-600"
                            >
                              {deleteMutation.isPending ? t("deleting") : t("confirmDelete")}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="h-32 px-6 text-center text-muted-foreground"
                    >
                      {t("noTypes")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
