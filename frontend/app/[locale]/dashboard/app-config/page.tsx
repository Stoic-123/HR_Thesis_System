"use client";

import React, { useState, useEffect } from "react";
import { 
  Smartphone, 
  Upload, 
  Check, 
  Sparkles, 
  Eye, 
  EyeOff, 
  CloudUpload,
  RefreshCw,
  Palette
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface AppMenuItem {
  id: number;
  menu_key: string;
  label: string;
  icon_url: string | null;
  color: string;
  is_active: boolean;
  order: number;
}

export default function AppConfigPage() {
  const [menus, setMenus] = useState<AppMenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const fetchAppMenus = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/api/app-menu");
      if (res.data?.success) {
        setMenus(res.data.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load app menu configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppMenus();
  }, []);

  const handleUpdateItem = async (id: number, data: Partial<AppMenuItem>, file?: File) => {
    try {
      setSavingId(id);
      let res;

      if (file) {
        const formData = new FormData();
        if (data.label !== undefined) formData.append("label", data.label);
        if (data.color !== undefined) formData.append("color", data.color);
        if (data.is_active !== undefined) formData.append("is_active", String(data.is_active));
        if (data.order !== undefined) formData.append("order", String(data.order));
        formData.append("icon", file);

        res = await api.put(`/api/app-menu/${id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await api.put(`/api/app-menu/${id}`, data);
      }

      if (res.data?.success) {
        toast.success(res.data.message || "App menu updated successfully!");
        setMenus((prev) =>
          prev.map((item) => (item.id === id ? res.data.data : item))
        );
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update menu item.");
    } finally {
      setSavingId(null);
    }
  };

  const handleIconUpload = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (.png, .jpg, .svg)");
      return;
    }
    handleUpdateItem(id, {}, file);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Smartphone className="size-7 text-primary" />
            App Configuration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customize mobile app quick access menus, titles, colors, and upload custom icons to Cloudflare R2.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchAppMenus} 
          disabled={isLoading}
          className="rounded-xl gap-2 border-border/60 hover:bg-muted/50"
        >
          <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Main Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="rounded-3xl border border-border/60 p-6 animate-pulse">
              <div className="h-16 w-16 bg-muted rounded-2xl mb-4" />
              <div className="h-5 w-1/2 bg-muted rounded mb-2" />
              <div className="h-4 w-3/4 bg-muted rounded" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {menus.map((item) => (
            <Card 
              key={item.id} 
              className={`rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/30 relative overflow-hidden ${
                !item.is_active ? "opacity-75 bg-muted/20" : ""
              }`}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-mono">
                    #{item.order}
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground uppercase">{item.menu_key}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={item.is_active}
                    onCheckedChange={(checked) => handleUpdateItem(item.id, { is_active: checked })}
                  />
                  {item.is_active ? (
                    <Eye className="size-4 text-emerald-500" />
                  ) : (
                    <EyeOff className="size-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Icon Preview & R2 Upload */}
                <div className="flex items-center gap-4 p-3 rounded-2xl bg-muted/40 border border-border/40">
                  <div className="relative group size-16 rounded-2xl bg-white dark:bg-zinc-900 border border-border/60 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                    {item.icon_url ? (
                      <img 
                        key={item.icon_url}
                        src={item.icon_url} 
                        alt={item.label} 
                        className="size-12 object-contain"
                      />
                    ) : (
                      <Sparkles className="size-7 text-primary/60" />
                    )}
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white text-[10px] font-semibold gap-1">
                      <CloudUpload className="size-4" />
                      R2 Upload
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleIconUpload(item.id, e)}
                        disabled={savingId === item.id}
                      />
                    </label>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <CloudUpload className="size-3 text-primary" />
                      Cloudflare R2 Storage
                    </p>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold cursor-pointer transition-colors">
                      <Upload className="size-3.5" />
                      {savingId === item.id ? "Uploading..." : "Change Icon"}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleIconUpload(item.id, e)}
                        disabled={savingId === item.id}
                      />
                    </label>
                  </div>
                </div>

                {/* Edit Label Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Menu Title (Mobile App)</label>
                  <Input
                    defaultValue={item.label}
                    onBlur={(e) => {
                      if (e.target.value !== item.label) {
                        handleUpdateItem(item.id, { label: e.target.value });
                      }
                    }}
                    className="rounded-xl bg-background/50 text-sm font-medium"
                    placeholder="Enter menu title"
                  />
                </div>

                {/* Color Theme Selector */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Palette className="size-3.5" />
                    Card Color
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateItem(item.id, { color: "blue" })}
                      className={`size-6 rounded-full bg-indigo-600 border-2 transition-transform ${
                        item.color === "blue" ? "border-white scale-110 shadow" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    />
                    <button
                      onClick={() => handleUpdateItem(item.id, { color: "orange" })}
                      className={`size-6 rounded-full bg-rose-500 border-2 transition-transform ${
                        item.color === "orange" ? "border-white scale-110 shadow" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
