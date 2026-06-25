"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { BellRing, Building2, Shield, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SettingPage = () => {
  const t = useTranslations("setting");

  const settingGroups = [
    { name: t("companyProfile"), detail: t("companyProfileDetail"), status: t("updated") },
    { name: t("accessControl"), detail: t("accessControlDetail"), status: t("needsReview") },
    { name: t("notificationPolicy"), detail: t("notificationPolicyDetail"), status: t("updated") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>
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
            <div
              key={item.name}
              className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 p-4"
            >
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
              </div>
              <Badge
                className={`rounded-full ${
                  item.status === t("updated")
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {item.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingPage;
