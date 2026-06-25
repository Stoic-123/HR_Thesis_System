"use client";

import React, { useMemo } from "react";
import {
  Building2,
  BriefcaseBusiness,
  MapPin,
  ArrowUpRight,
  CalendarDays,
  ClipboardCheck,
  UserMinus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PieChartWithPaddingAngle from "@/components/PieChartDashboard";
import { useMe } from "@/hooks/useMe";
import { LoadingState } from "@/components/ui/loading-state";
import { useTranslations } from "next-intl";
import { useAllEmployee } from "@/hooks/useEmployee";
import { useDepartments, usePositions } from "@/hooks/useOrg";
import { useLocations } from "@/hooks/useLocation";


// Removed static hiring data

const DashboardPage = () => {
  const { data: user, isLoading, isError } = useMe();
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");

  const { data: employeesRes, isLoading: isLoadingEmp } = useAllEmployee(1, 100);
  const { data: deptsRes, isLoading: isLoadingDept } = useDepartments(1, 1, 1);
  const { data: posRes, isLoading: isLoadingPos } = usePositions(1, 1);
  const { data: locsRes, isLoading: isLoadingLoc } = useLocations();

  const isDataLoading = isLoading || isLoadingEmp || isLoadingDept || isLoadingPos || isLoadingLoc;

  const kpis = [
    {
      label: t("totalEmployees") || "Total Employees",
      value: employeesRes?.pagination?.total || employeesRes?.total || employeesRes?.data?.length || 0,
      caption: tc("active") || "Active",
      delta: "",
      icon: Users,
    },
    {
      label: "Total Departments",
      value: deptsRes?.pagination?.total || deptsRes?.total || deptsRes?.data?.length || 0,
      caption: tc("active") || "Active",
      delta: "",
      icon: Building2,
    },
    {
      label: "Total Positions",
      value: posRes?.pagination?.total || posRes?.total || posRes?.data?.length || 0,
      caption: tc("active") || "Active",
      delta: "",
      icon: BriefcaseBusiness,
    },
    {
      label: "Total Locations",
      value: locsRes?.data?.length || 0,
      caption: tc("active") || "Active",
      delta: "",
      icon: MapPin,
    },
  ];

  const chartData = useMemo(() => {
    if (!employeesRes?.data || employeesRes.data.length === 0) return [{ day: "No Data", newHires: 0, headcount: 0 }];
    
    const months = new Map();
    const sortedEmps = [...employeesRes.data].sort((a, b) => {
      const da = a.joined_at ? new Date(a.joined_at).getTime() : 0;
      const db = b.joined_at ? new Date(b.joined_at).getTime() : 0;
      return da - db;
    });

    let cumulative = 0;
    sortedEmps.forEach((emp: any) => {
      if (!emp.joined_at) return;
      
      let date;
      // The backend format is "DD MM YYYY"
      const parts = emp.joined_at.split(' ');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        // Month is 1-indexed in the string, but Date expects 0-indexed month
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        date = new Date(emp.joined_at);
      }
      
      if (isNaN(date.getTime())) return;

      const monthYear = date.toLocaleString('en-US', { month: 'short' });
      
      cumulative++;
      if (!months.has(monthYear)) {
        months.set(monthYear, { day: monthYear, newHires: 1, headcount: cumulative });
      } else {
        const data = months.get(monthYear);
        data.newHires += 1;
        data.headcount = cumulative;
      }
    });

    const result = Array.from(months.values());
    return result.length > 0 ? result.slice(-7) : [{ day: "No Data", newHires: 0, headcount: 0 }];
  }, [employeesRes]);

  const pieData = useMemo(() => {
    if (!employeesRes?.data) return [];
    const male = employeesRes.data.filter((e: any) => e.gender?.toLowerCase() === "male").length;
    const female = employeesRes.data.filter((e: any) => e.gender?.toLowerCase() === "female").length;
    const total = male + female;
    
    return [
      { name: "Male", value: male, fill: "#0071E3", percentage: total ? Math.round((male / total) * 100) : 0 },
      { name: "Female", value: female, fill: "#FF5A5F", percentage: total ? Math.round((female / total) * 100) : 0 }
    ].filter(d => d.value > 0);
  }, [employeesRes]);

  const employmentStatus = useMemo(() => {
    const total = employeesRes?.pagination?.total || 0;
    const active = employeesRes?.pagination?.total_active || 0;
    const inactive = total - active;
    const totalPct = total > 0 ? total : 1; // avoid division by zero
    
    return [
      { label: "Active", value: active, color: "bg-emerald-500", pct: (active / totalPct) * 100 },
      { label: "Inactive", value: inactive, color: "bg-rose-500", pct: (inactive / totalPct) * 100 },
    ];
  }, [employeesRes]);

  if (isDataLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-20 w-1/3 bg-gray-100 rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
           <div className="lg:col-span-8 h-80 bg-gray-100 rounded-2xl" />
           <div className="lg:col-span-4 h-80 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <p className="text-rose-500 font-bold">{t("errorLoading")}</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("welcome")} <span className="text-primary">{user?.username || ""}</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => {
          const isNegative = item.delta.startsWith("-");
          return (
            <Card key={item.label} size="sm" className="p-2 ">
              <CardHeader className="flex-row items-start justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {item.label}
                </CardTitle>
                <div className="rounded-2xl bg-primary/10 p-2 w-9 h-9 flex items-center justify-center text-primary">
                  <item.icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <p className="text-3xl font-semibold tracking-tight">
                    {item.value}
                  </p>
                  {item.delta && (
                    <Badge
                      className={`gap-1 rounded-full px-2.5 ${
                        isNegative
                          ? "bg-rose-50 text-rose-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      <ArrowUpRight className="size-3.5" />
                      {item.delta}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{item.caption}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Headcount Growth</CardTitle>
            <Badge className="rounded-full bg-primary/10 text-primary">
              All Time
            </Badge>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <ComposedChart
                data={chartData}
                margin={{ top: 20, bottom: 20, left: 8, right: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke="rgba(0,0,0,0.08)"
                />
                <XAxis dataKey="day" axisLine={false} tickLine={false} dy={10} />
                <YAxis axisLine={false} tickLine={false} width={34} domain={[0, 'dataMax + 1']} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.55)",
                    background: "rgba(255,255,255,0.75)",
                    backdropFilter: "blur(16px)",
                  }}
                />
                <Bar
                  name="New Hires"
                  dataKey="newHires"
                  barSize={14}
                  radius={12}
                  fill="rgba(0,113,227,0.35)"
                />
                <Line
                  name="Total Headcount"
                  type="monotone"
                  dataKey="headcount"
                  stroke="#0071e3"
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 2, fill: "#ffffff" }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="xl:col-span-4 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Employment Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex h-9 items-center gap-1 rounded-2xl bg-muted/60 p-2 overflow-hidden">
                {employmentStatus.map((s, idx) => (
                  <div 
                    key={idx} 
                    className={`h-5 rounded-full ${s.color}`} 
                    style={{ width: `${s.pct > 0 ? Math.max(s.pct, 5) : 0}%`, transition: "width 0.5s ease" }} 
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {employmentStatus.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl bg-background/60 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                    <p className="mt-2 text-lg font-semibold">{s.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Gender Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-7">
                  <PieChartWithPaddingAngle data={pieData} />
                </div>
                <div className="col-span-5 space-y-2 text-xs text-muted-foreground">
                  {pieData.map((d, idx) => (
                    <div key={idx} className="rounded-2xl bg-background/60 p-3">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                          {d.name}
                        </span>
                        <span className="font-semibold text-foreground/80">
                          {d.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {pieData.length === 0 && (
                    <div className="text-center italic mt-4">No data</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="xl:col-span-12">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent Employees</CardTitle>
            <Badge className="rounded-full bg-primary/10 text-primary">
              Latest
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/35">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      {tc("status")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      {tc("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employeesRes?.data?.slice(0, 5).map((row: any) => (
                    <tr
                      key={row.id || row.full_name}
                      className="border-b border-white/30 last:border-0 hover:bg-white/5"
                    >
                      <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold overflow-hidden">
                          {row.profile_path ? (
                            <img src={`${process.env.NEXT_PUBLIC_API_URL}${row.profile_path}`} className="w-full h-full object-cover" alt="" />
                          ) : (
                            row.full_name?.split(" ").slice(0, 2).map((s: string) => s[0]).join("")
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{row.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.position?.name || "No Position"}
                          </p>
                        </div>
                      </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {row.email}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                      <Badge className="rounded-full bg-emerald-50 text-emerald-700">
                        Active
                      </Badge>
                      </td>
                      <td className="px-4 py-3">
                      <button className="rounded-xl bg-muted/60 px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-muted">
                        {tc("view")}
                      </button>
                      </td>
                    </tr>
                  ))}
                  {(!employeesRes?.data || employeesRes.data.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        No employees found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
