"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuditLogs } from "@/hooks/useAuditLog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Activity, ShieldAlert, User as UserIcon, Clock } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";
export default function AuditLogPage() {
  const t = useTranslations("auditlog");
  const tc = useTranslations("common");
  const [page, setPage] = React.useState(1);
  const limit = 10;
  const { data: logsData, isLoading, isError } = useAuditLogs(page, limit);

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case "CREATE":
        return "bg-green-100 text-green-700 border-green-200";
      case "UPDATE":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "DELETE":
        return "bg-red-100 text-red-700 border-red-200";
      case "DEACTIVATE":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "ACTIVATE":
        return "bg-cyan-100 text-cyan-700 border-cyan-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (isLoading) {
    return <LoadingState variant="table" count={limit} />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500">
        <ShieldAlert className="size-12 mb-4" />
        <p>{t("errorLoading")}</p>
      </div>
    );
  }

  const logs = logsData?.data || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-lg">
          {t("subtitle")}
        </p>
      </div>

      <Card className="border-none shadow-xl bg-white/60 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-5 text-primary" />
            {t("activityHistory")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-white/40 overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-gray-50/50">
                  <tr className="border-b border-white/40">
                    <th className="w-[180px] px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      {t("timestamp")}
                    </th>
                    <th className="w-[150px] px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      {t("user")}
                    </th>
                    <th className="w-[120px] px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      {t("module")}
                    </th>
                    <th className="w-[120px] px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      {t("action")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      {t("description")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                      {t("ipAddress")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="h-32 px-4 text-center text-muted-foreground"
                      >
                        {t("noLogs")}
                      </td>
                    </tr>
                  ) : (
                    logs.map((log: any) => (
                      <tr
                        key={log.id}
                        className="border-b border-white/30 transition-colors hover:bg-gray-50/50"
                      >
                        <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <Clock className="size-3.5 text-muted-foreground" />
                          {format(new Date(log.created_at), "MMM dd, yyyy HH:mm:ss")}
                        </div>
                        </td>
                        <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserIcon className="size-4 text-primary" />
                          </div>
                          <span className="font-medium text-sm">
                            {log.user?.username || t("system")}
                          </span>
                        </div>
                        </td>
                        <td className="px-4 py-3">
                        <Badge variant="outline" className="font-semibold bg-white/50">
                          {log.module}
                        </Badge>
                        </td>
                        <td className="px-4 py-3">
                        <Badge className={`${getActionColor(log.action)} border font-bold px-2.5 py-0.5`}>
                          {log.action}
                        </Badge>
                        </td>
                        <td className="max-w-md px-4 py-3 truncate text-gray-600">
                        {log.description}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                        {log.ip_address || t("notAvailable")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {logsData?.pagination && logsData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-xl border-white/40 bg-white/20 backdrop-blur-sm"
          >
            {tc("previous")}
          </Button>
          <span className="text-sm font-medium text-muted-foreground">
            {tc("page")} <span className="text-foreground font-bold">{page}</span> {tc("of")}{" "}
            <span className="text-foreground font-bold">
              {logsData.pagination.totalPages}
            </span>
          </span>
          <Button
            variant="outline"
            onClick={() =>
              setPage((p) => Math.min(logsData.pagination.totalPages, p + 1))
            }
            disabled={page === logsData.pagination.totalPages}
            className="rounded-xl border-white/40 bg-white/20 backdrop-blur-sm"
          >
            {tc("next")}
          </Button>
        </div>
      )}
    </div>
  );
}
