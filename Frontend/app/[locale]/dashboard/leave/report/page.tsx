"use client";
import React, { useEffect, useState } from "react";
import { CalendarCheck2, CalendarClock, CalendarRange } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { getAllLeaves } from "@/services/leave.services";

interface LeaveRequest {
  id: number;
  employee: string;
  type: string;
  from: string;
  to: string;
  status: "pending" | "approved" | "rejected";
}

const LeaveReportPage = () => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("leaveReport");
  const tl = useTranslations("leave");

  const fetchLeaves = async () => {
    try {
      const res = await getAllLeaves();
      if (res.result) {
        setLeaves(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch leaves:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const currentMonthLeaves = leaves.filter(leave => {
    const leaveDate = new Date(leave.from);
    const now = new Date();
    return leaveDate.getMonth() === now.getMonth() && leaveDate.getFullYear() === now.getFullYear();
  });

  const stats = {
    total: currentMonthLeaves.length,
    approved: currentMonthLeaves.filter(l => l.status === "approved").length,
    pending: currentMonthLeaves.filter(l => l.status === "pending").length,
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return tl("pending");
      case "approved": return tl("approved");
      case "rejected": return tl("rejected");
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <CalendarRange className="size-4.5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("thisMonthRequests")}</p>
              <p className="text-xl font-semibold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
              <CalendarCheck2 className="size-4.5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("approvedCount")}</p>
              <p className="text-xl font-semibold">{stats.approved}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
              <CalendarClock className="size-4.5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("pendingCount")}</p>
              <p className="text-xl font-semibold">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t("allRequests")}</CardTitle>
          <Badge className="rounded-full bg-primary/10 text-primary">{t("weekBadge")}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            leaves.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 p-4"
              >
                <div>
                  <p className="font-semibold">{row.employee}</p>
                  <p className="text-sm text-muted-foreground">
                    {row.type}
                  </p>
                </div>
                <Badge
                  className={`rounded-full ${
                    row.status === "approved"
                      ? "bg-emerald-50 text-emerald-700"
                      : row.status === "pending"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {getStatusLabel(row.status)}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveReportPage;
