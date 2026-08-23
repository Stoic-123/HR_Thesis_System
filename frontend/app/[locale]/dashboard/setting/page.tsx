"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { 
  Send, 
  Sparkles, 
  Lock, 
  Save, 
  Loader2, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Bot
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useCompany } from "@/hooks/useCompany";
import { updateCompany } from "@/services/company.services";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function SettingPage() {
  const queryClient = useQueryClient();
  const t = useTranslations("setting");
  const tc = useTranslations("common");
  const { data: companyRes, isLoading, isError } = useCompany();
  const company = companyRes?.data;

  const [activeTab, setActiveTab] = useState("telegram");

  // Form State
  const [formData, setFormData] = useState({
    telegram_bot_token: "",
    telegram_group_id: "",
    telegram_attendance_group_id: "",
    telegram_leave_group_id: "",
    telegram_late_group_id: "",
    telegram_overtime_group_id: "",
    telegram_announcement_group_id: "",
    telegram_backup_group_id: "",
    ai_provider: "ollama",
    ai_api_key: "",
    ai_model: "qwen2.5:1.5b",
    default_password: "Hr12345",
  });

  // Visibility toggles
  const [showBotToken, setShowBotToken] = useState(false);
  const [showAiApiKey, setShowAiApiKey] = useState(false);
  const [showDefaultPassword, setShowDefaultPassword] = useState(false);

  // Sync state with company data
  useEffect(() => {
    if (company) {
      setFormData({
        telegram_bot_token: company.telegram_bot_token || "",
        telegram_group_id: company.telegram_group_id || "",
        telegram_attendance_group_id: company.telegram_attendance_group_id || "",
        telegram_leave_group_id: company.telegram_leave_group_id || "",
        telegram_late_group_id: company.telegram_late_group_id || "",
        telegram_overtime_group_id: company.telegram_overtime_group_id || "",
        telegram_announcement_group_id: company.telegram_announcement_group_id || "",
        telegram_backup_group_id: company.telegram_backup_group_id || "",
        ai_provider: company.ai_provider || "ollama",
        ai_api_key: company.ai_api_key || "",
        ai_model: company.ai_model || "qwen2.5:1.5b",
        default_password: company.default_password || "Hr12345",
      });
    }
  }, [company]);

  // Update Mutation
  const updateCompanyMutation = useMutation({
    mutationFn: (data: FormData) => updateCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success(t("updateSuccess"));
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || tc("error"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    const data = new FormData();
    data.append("name", company.name || "My Company");
    data.append("phone", company.phone || "");
    data.append("email", company.email || "");
    data.append("primary_color", company.primary_color || "#4f46e5");
    data.append("secondary_color", company.secondary_color || "#06b6d4");
    data.append("old_logo_path", company.logo_path || "");

    data.append("telegram_bot_token", formData.telegram_bot_token.trim());
    data.append("telegram_group_id", formData.telegram_group_id.trim());
    data.append("telegram_attendance_group_id", formData.telegram_attendance_group_id.trim());
    data.append("telegram_leave_group_id", formData.telegram_leave_group_id.trim());
    data.append("telegram_late_group_id", formData.telegram_late_group_id.trim());
    data.append("telegram_overtime_group_id", formData.telegram_overtime_group_id.trim());
    data.append("telegram_announcement_group_id", formData.telegram_announcement_group_id.trim());
    data.append("telegram_backup_group_id", formData.telegram_backup_group_id.trim());
    data.append("ai_provider", formData.ai_provider);
    data.append("ai_api_key", formData.ai_api_key.trim());
    data.append("ai_model", formData.ai_model.trim());
    data.append("default_password", formData.default_password.trim() || "Hr12345");

    updateCompanyMutation.mutate(data);
  };

  const handleProviderSelect = (provider: string) => {
    let defaultModel = "qwen2.5:1.5b";
    if (provider === "gemini") defaultModel = "gemini-2.5-flash";
    else if (provider === "huggingface") defaultModel = "Qwen/Qwen2.5-72B-Instruct";
    else if (provider === "openrouter") defaultModel = "openrouter/free";
    setFormData((prev) => ({ ...prev, ai_provider: provider, ai_model: defaultModel }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-4">
        <Skeleton className="h-10 w-48 rounded-2xl" />
        <Skeleton className="h-12 w-80 rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  if (isError || !company) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white/60 backdrop-blur-xl rounded-3xl border border-white/80 shadow-sm max-w-xl mx-auto">
        <div className="size-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-4">
          <Bot size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load System Settings</h2>
        <p className="text-sm text-gray-500 mb-6">Please check your database connection or try again.</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["company"] })} className="rounded-2xl">
          <RefreshCw size={16} className="mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <form onSubmit={handleSubmit}>
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-gray-100/80 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">{t("title")}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {t("subtitle")}
            </p>
          </div>

          <Button
            type="submit"
            disabled={updateCompanyMutation.isPending}
            className="rounded-2xl gap-2 px-6 h-11 shadow-sm bg-primary text-white font-semibold shrink-0"
          >
            {updateCompanyMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t("saving")}
              </>
            ) : (
              <>
                <Save size={16} />
                {t("saveChanges")}
              </>
            )}
          </Button>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <TabsList className="grid grid-cols-3 max-w-md bg-white/40 border border-white/50 p-1 rounded-2xl h-12 shadow-xs">
            <TabsTrigger 
              value="telegram" 
              className="rounded-xl h-10 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2"
            >
              <Send size={15} />
              Telegram
            </TabsTrigger>
            <TabsTrigger 
              value="ai" 
              className="rounded-xl h-10 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2"
            >
              <Sparkles size={15} />
              AI Engine
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="rounded-xl h-10 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2"
            >
              <Lock size={15} />
              Security
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: TELEGRAM */}
          <TabsContent value="telegram" className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
              <Card className="border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl rounded-3xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-gray-800">{t("botTokenLabel")}</CardTitle>
                  <CardDescription>{t("botTokenHelp")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative max-w-2xl">
                    <Input
                      id="telegram_bot_token"
                      type={showBotToken ? "text" : "password"}
                      value={formData.telegram_bot_token}
                      onChange={(e) => setFormData({ ...formData, telegram_bot_token: e.target.value })}
                      placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                      className="h-11 rounded-xl bg-white border-gray-200 pr-12 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBotToken(!showBotToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1"
                    >
                      {showBotToken ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl rounded-3xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-gray-800">{t("channelsTitle")}</CardTitle>
                  <CardDescription>{t("channelsDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-gray-700">{t("defaultGroupId")}</Label>
                      <Input
                        value={formData.telegram_group_id}
                        onChange={(e) => setFormData({ ...formData, telegram_group_id: e.target.value })}
                        placeholder="-1001234567890"
                        className="h-11 rounded-xl bg-white border-gray-200 font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-gray-700">{t("attendanceGroupId")}</Label>
                      <Input
                        value={formData.telegram_attendance_group_id}
                        onChange={(e) => setFormData({ ...formData, telegram_attendance_group_id: e.target.value })}
                        placeholder="-1001234567890"
                        className="h-11 rounded-xl bg-white border-gray-200 font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-gray-700">{t("leaveGroupId")}</Label>
                      <Input
                        value={formData.telegram_leave_group_id}
                        onChange={(e) => setFormData({ ...formData, telegram_leave_group_id: e.target.value })}
                        placeholder="-1001234567890"
                        className="h-11 rounded-xl bg-white border-gray-200 font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-gray-700">{t("overtimeGroupId")}</Label>
                      <Input
                        value={formData.telegram_overtime_group_id}
                        onChange={(e) => setFormData({ ...formData, telegram_overtime_group_id: e.target.value })}
                        placeholder="-1001234567890"
                        className="h-11 rounded-xl bg-white border-gray-200 font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-gray-700">{t("lateGroupId")}</Label>
                      <Input
                        value={formData.telegram_late_group_id}
                        onChange={(e) => setFormData({ ...formData, telegram_late_group_id: e.target.value })}
                        placeholder="-1001234567890"
                        className="h-11 rounded-xl bg-white border-gray-200 font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-gray-700">{t("announcementGroupId")}</Label>
                      <Input
                        value={formData.telegram_announcement_group_id}
                        onChange={(e) => setFormData({ ...formData, telegram_announcement_group_id: e.target.value })}
                        placeholder="-1001234567890"
                        className="h-11 rounded-xl bg-white border-gray-200 font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-sm font-semibold text-gray-700">{t("backupGroupId")}</Label>
                      <Input
                        value={formData.telegram_backup_group_id}
                        onChange={(e) => setFormData({ ...formData, telegram_backup_group_id: e.target.value })}
                        placeholder="-1001234567890"
                        className="h-11 rounded-xl bg-white border-gray-200 font-mono text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* TAB 2: AI ENGINE */}
          <TabsContent value="ai" className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
              <Card className="border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl rounded-3xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-gray-800">{t("aiProvider")}</CardTitle>
                  <CardDescription>{t("aiSectionDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Provider Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: "ollama", label: "Local Ollama", sub: "Offline / Private" },
                      { id: "gemini", label: "Google Gemini", sub: "Cloud API" },
                      { id: "huggingface", label: "Hugging Face", sub: "Cloud API" },
                      { id: "openrouter", label: "OpenRouter", sub: "Multi-Model" },
                    ].map((p) => {
                      const isSelected = formData.ai_provider === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleProviderSelect(p.id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? "border-primary bg-primary/5 text-primary shadow-xs"
                              : "border-gray-200/80 bg-white hover:border-gray-300 text-gray-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm">{p.label}</span>
                            {isSelected && <CheckCircle2 className="size-4 text-primary shrink-0" />}
                          </div>
                          <span className="text-xs text-gray-400 mt-1">{p.sub}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Model Input */}
                  <div className="space-y-2 max-w-xl">
                    <Label htmlFor="ai_model" className="text-sm font-semibold text-gray-700">
                      {t("aiModel")}
                    </Label>
                    <Input
                      id="ai_model"
                      value={formData.ai_model}
                      onChange={(e) => setFormData({ ...formData, ai_model: e.target.value })}
                      placeholder="e.g. qwen2.5:1.5b"
                      className="h-11 rounded-xl bg-white border-gray-200 font-mono text-sm"
                    />
                  </div>

                  {/* API Key */}
                  {formData.ai_provider !== "ollama" && (
                    <div className="space-y-2 max-w-xl">
                      <Label htmlFor="ai_api_key" className="text-sm font-semibold text-gray-700">
                        {t("aiApiKey")}
                      </Label>
                      <div className="relative">
                        <Input
                          id="ai_api_key"
                          type={showAiApiKey ? "text" : "password"}
                          value={formData.ai_api_key}
                          onChange={(e) => setFormData({ ...formData, ai_api_key: e.target.value })}
                          placeholder="API Key / Token"
                          className="h-11 rounded-xl bg-white border-gray-200 pr-12 font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAiApiKey(!showAiApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1"
                        >
                          {showAiApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* TAB 3: SECURITY */}
          <TabsContent value="security" className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
              <Card className="border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl rounded-3xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-gray-800">{t("securitySection")}</CardTitle>
                  <CardDescription>{t("securitySectionDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 max-w-md">
                    <Label htmlFor="default_password" className="text-sm font-semibold text-gray-700">
                      {t("defaultPasswordLabel")}
                    </Label>
                    <div className="relative">
                      <Input
                        id="default_password"
                        type={showDefaultPassword ? "text" : "password"}
                        value={formData.default_password}
                        onChange={(e) => setFormData({ ...formData, default_password: e.target.value })}
                        placeholder="Hr12345"
                        className="h-11 rounded-xl bg-white border-gray-200 pr-12 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDefaultPassword(!showDefaultPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1"
                      >
                        {showDefaultPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 max-w-xl leading-relaxed">
                    {t("defaultPasswordHelp")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}
