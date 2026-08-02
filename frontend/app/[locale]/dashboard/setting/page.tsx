"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { 
  BellRing, 
  Building2, 
  Shield, 
  Workflow, 
  ChevronRight, 
  KeyRound, 
  Send 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/src/i18n/routing";
import { useCompany } from "@/hooks/useCompany";

const SettingPage = () => {
  const t = useTranslations("setting");
  const { data: companyRes, isLoading } = useCompany();
  const company = companyRes?.data;
  const apiBaseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  const settingGroups = [
    { 
      name: t("companyProfile"), 
      detail: t("companyProfileDetail"), 
      status: t("updated"),
      href: "/dashboard/company",
      icon: Building2,
      iconColor: "text-primary bg-primary/10"
    },
    { 
      name: t("accessControl"), 
      detail: t("accessControlDetail"), 
      status: t("needsReview"),
      href: "/dashboard/role",
      icon: Shield,
      iconColor: "text-amber-600 bg-amber-50"
    },
    { 
      name: t("notificationPolicy"), 
      detail: t("notificationPolicyDetail"), 
      status: t("updated"),
      href: "/dashboard/company", // Telegram & notifications are managed on the company page
      icon: BellRing,
      iconColor: "text-emerald-700 bg-emerald-50"
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
        
        {/* Company Header Banner Skeleton */}
        <Card className="rounded-3xl border border-border/60 bg-white/40 shadow-sm overflow-hidden p-6 flex gap-5">
          <Skeleton className="size-20 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-1/3 rounded-lg" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
          </div>
          <div className="flex gap-2 shrink-0 self-center">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </Card>

        {/* 3 Stats Cards Skeletons */}
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="rounded-3xl border border-border/60 bg-white/40 shadow-sm p-5 flex gap-3">
              <Skeleton className="size-10 rounded-xl shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-1/2 rounded" />
                <Skeleton className="h-5 w-2/3 rounded-md" />
              </div>
            </Card>
          ))}
        </div>

        {/* Setting Sections List Skeleton */}
        <Card className="rounded-3xl border border-border/60 bg-white/40 shadow-sm">
          <div className="border-b px-6 py-4">
            <Skeleton className="h-5 w-32 rounded" />
          </div>
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between border border-border/40 rounded-2xl p-4 bg-white/10">
                <div className="flex items-center gap-4 flex-1">
                  <Skeleton className="size-10 rounded-xl shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4 rounded" />
                    <Skeleton className="h-3 w-1/3 rounded" />
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="size-5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("subtitle")}
        </p>
      </div>

      {/* Real Company Profile Header Banner */}
      {company && (
        <Card className="rounded-3xl border border-border/60 bg-gradient-to-r from-primary/5 via-transparent to-transparent shadow-sm overflow-hidden">
          <CardContent className="flex flex-col sm:flex-row items-center gap-5 py-6 px-6">
            <div className="size-20 rounded-2xl overflow-hidden border border-border bg-white flex items-center justify-center shadow-inner shrink-0">
              {company.logo_path ? (
                <img 
                  src={`${apiBaseURL}${company.logo_path}`} 
                  alt={company.name} 
                  className="size-full object-cover" 
                />
              ) : (
                <span className="text-2xl font-bold text-primary">
                  {company.name ? company.name.charAt(0).toUpperCase() : "C"}
                </span>
              )}
            </div>
            <div className="text-center sm:text-left flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 truncate">{company.name}</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                {company.email && <span className="truncate">{company.email}</span>}
                {company.email && company.phone && <span className="hidden sm:inline text-zinc-300">|</span>}
                {company.phone && <span>{company.phone}</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-end shrink-0">
              {company.default_password && (
                <Badge variant="outline" className="rounded-full gap-1 py-1 px-3 bg-white font-mono text-[11px]">
                  <KeyRound className="size-3 text-zinc-500" />
                  Default PW: {company.default_password}
                </Badge>
              )}
              <Badge variant="outline" className="rounded-full gap-1 py-1 px-3 bg-white text-[11px]">
                <Send className="size-3 text-sky-500" />
                Telegram Bot: {company.telegram_bot_token ? "Configured" : "Not Set"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <Workflow className="size-4.5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("environment")}</p>
              <p className="text-xl font-semibold">{t("production")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-xl bg-sky-100 p-2.5 text-sky-600">
              <Building2 className="size-4.5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("version")}</p>
              <p className="text-xl font-semibold">v1.0.0</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
              <Shield className="size-4.5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("lastBackup")}</p>
              <p className="text-xl font-semibold">{t("todayTime")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigable Settings List */}
      <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t("settingSections")}</CardTitle>
          <Badge className="rounded-full bg-primary/10 text-primary">
            <BellRing className="mr-1 size-3.5" />
            {t("stable")}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {settingGroups.map((item) => (
            <Link 
              key={item.name} 
              href={item.href}
              className="group flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 p-4 hover:bg-background hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl transition-transform group-hover:scale-110 ${item.iconColor}`}>
                  <item.icon className="size-5" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 group-hover:text-primary transition-colors">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  className={`rounded-full border-none shadow-none font-medium px-2.5 py-0.5 text-xs ${
                    item.status === t("updated")
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {item.status}
                </Badge>
                <ChevronRight className="size-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingPage;
