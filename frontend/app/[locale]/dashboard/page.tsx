"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  BriefcaseBusiness,
  MapPin,
  ArrowUpRight,
  CalendarDays,
  ClipboardCheck,
  UserMinus,
  Users,
  Download,
  Printer,
} from "lucide-react";
import { Link } from "@/src/i18n/routing";
import { exportToCSV } from "@/lib/exportUtils";
import { exportReportToPDF } from "@/lib/pdf-export";
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
      href: "/dashboard/employee",
    },
    {
      label: t("totalDepartments") || "Total Departments",
      value: deptsRes?.pagination?.total || deptsRes?.total || deptsRes?.data?.length || 0,
      caption: tc("active") || "Active",
      delta: "",
      icon: Building2,
      href: "/dashboard/department",
    },
    {
      label: t("totalPositions") || "Total Positions",
      value: posRes?.pagination?.total || posRes?.total || posRes?.data?.length || 0,
      caption: tc("active") || "Active",
      delta: "",
      icon: BriefcaseBusiness,
      href: "/dashboard/position",
    },
    {
      label: t("totalLocations") || "Total Locations",
      value: locsRes?.data?.length || 0,
      caption: tc("active") || "Active",
      delta: "",
      icon: MapPin,
      href: "/dashboard/company",
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
      { name: tc("male") || "Male", value: male, fill: "#0071E3", percentage: total ? Math.round((male / total) * 100) : 0 },
      { name: tc("female") || "Female", value: female, fill: "#FF5A5F", percentage: total ? Math.round((female / total) * 100) : 0 }
    ].filter(d => d.value > 0);
  }, [employeesRes, tc]);

  const employmentStatus = useMemo(() => {
    const total = employeesRes?.pagination?.total || 0;
    const active = employeesRes?.pagination?.total_active || 0;
    const inactive = total - active;
    const totalPct = total > 0 ? total : 1; // avoid division by zero
    
    return [
      { label: tc("active") || "Active", value: active, color: "bg-emerald-500", pct: (active / totalPct) * 100 },
      { label: tc("inactive") || "Inactive", value: inactive, color: "bg-rose-500", pct: (inactive / totalPct) * 100 },
    ];
  }, [employeesRes, tc]);

  const recentEmployees = useMemo(() => {
    if (!employeesRes?.data) return [];
    return [...employeesRes.data]
      .sort((a: any, b: any) => (b.id || 0) - (a.id || 0))
      .slice(0, 5);
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
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } }
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("welcome")} <span className="text-primary">{user?.username || ""}</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => {
          const isNegative = item.delta.startsWith("-");
          return (
            <Link key={item.label} href={item.href} className="block group">
              <Card
                size="sm"
                className="p-2 transition-all duration-200 hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5 cursor-pointer bg-card/70 backdrop-blur-sm"
              >
                <CardHeader className="flex-row items-start justify-between pb-2">
                  <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                    {item.label}
                  </CardTitle>
                  <div className="rounded-2xl bg-primary/10 p-2 w-9 h-9 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-xs">
                    <item.icon className="size-4" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-end justify-between gap-3">
                    <p className="text-3xl font-semibold tracking-tight group-hover:text-primary transition-colors">
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
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{item.caption}</span>
                    <span className="text-[11px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      {tc("view") || "View"} &rarr;
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t("headcountGrowth")}</CardTitle>
            <Badge className="rounded-full bg-primary/10 text-primary">
              {t("allTime")}
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
                  name={t("newHires")}
                  dataKey="newHires"
                  barSize={14}
                  radius={12}
                  fill="rgba(0,113,227,0.35)"
                />
                <Line
                  name={t("totalHeadcount")}
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
              <CardTitle>{t("employmentStatus")}</CardTitle>
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
              <CardTitle>{t("genderDistribution")}</CardTitle>
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
                    <div className="text-center italic mt-4">{tc("noData")}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="xl:col-span-12">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>{t("recentEmployees")}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const cols = [
                    { header: "Name", key: "full_name" },
                    { header: "Position", key: "position_name" },
                    { header: "Email", key: "email" },
                    { header: "Status", key: "status" },
                  ];
                  const rows = (employeesRes?.data || []).map((e: any) => ({
                    full_name: e.full_name,
                    position_name: e.position_name || "N/A",
                    email: e.email || "N/A",
                    status: e.is_active || "Active",
                  }));
                  exportToCSV("Employees_List", cols, rows);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-sm transition-all cursor-pointer"
              >
                <Download className="size-3.5 text-emerald-600" /> {tc("exportExcel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  const apiBaseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
                  const companyLogo = user?.employee?.company?.logo_path
                    ? (user.employee.company.logo_path.startsWith("http")
                        ? user.employee.company.logo_path
                        : `${apiBaseURL}${user.employee.company.logo_path}`)
                    : "";
                  const userFullName = user?.employee ? `${user.employee.first_name} ${user.employee.last_name}` : "";

                  exportReportToPDF({
                    titleKh: "របាយការណ៍បញ្ជីឈ្មោះបុគ្គលិក",
                    titleEn: "Employee List Report",
                    companyName: user?.employee?.company?.name || "ក្រុមហ៊ុន សារណៈ",
                    companyLogo,
                    orientation: "portrait",
                    metadata: [
                      { labelKh: "កាលបរិច្ឆេទ", labelEn: "Date", value: new Date().toLocaleDateString("km-KH", { year: "numeric", month: "long", day: "numeric" }) },
                      { labelKh: "រៀបចំដោយ", labelEn: "Prepared By", value: userFullName || "រដ្ឋបាល / Admin" }
                    ],
                    tableHeaders: [
                      { kh: "ឈ្មោះបុគ្គលិក", en: "Employee Name" },
                      { kh: "តួនាទី / ផ្នែក", en: "Position / Department" },
                      { kh: "អ៊ីមែល", en: "Email" },
                      { kh: "ស្ថានភាព", en: "Status", align: "center" }
                    ],
                    tableRows: (employeesRes?.data || []).map((emp: any) => ({
                      cells: [
                        { text: `<b>${emp.full_name || (emp.first_name + ' ' + (emp.last_name || ''))}</b>` },
                        { text: emp.position_name || "N/A" },
                        { text: emp.email || "N/A" },
                        { text: `<span class="text-emerald font-semibold">${emp.is_active || 'Active'}</span>`, align: "center" }
                      ]
                    }))
                  });
                }}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-sm transition-all cursor-pointer"
              >
                <Printer className="size-3.5 text-blue-600" /> {tc("printPdf")}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Desktop Table View */}
            <div className="hidden md:block w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/35">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      {tc("employee")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      {tc("email")}
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
                  {recentEmployees.map((row: any) => (
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
                            {row.position_name || tc("notSet")}
                          </p>
                        </div>
                      </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {row.email || tc("noEmail")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                      <Badge className="rounded-full bg-emerald-50 text-emerald-700">
                        {row.is_active === "inactive" ? tc("inactive") : tc("active")}
                      </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/employee/${row.id}`}
                          className="rounded-xl bg-muted/60 px-3.5 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-primary hover:text-white transition-colors cursor-pointer inline-flex items-center"
                        >
                          {tc("view")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {(!employeesRes?.data || employeesRes.data.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        {t("noEmployeesFound")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Grid View */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {recentEmployees.map((row: any) => (
                <div key={row.id || row.full_name} className="p-3.5 rounded-2xl border bg-card/60 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-semibold overflow-hidden">
                        {row.profile_path ? (
                          <img src={`${process.env.NEXT_PUBLIC_API_URL}${row.profile_path}`} className="w-full h-full object-cover" alt="" />
                        ) : (
                          row.full_name?.split(" ").slice(0, 2).map((s: string) => s[0]).join("")
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{row.full_name}</p>
                        <p className="text-xs text-muted-foreground">{row.position_name || tc("notSet")}</p>
                      </div>
                    </div>
                    <Badge className="rounded-full bg-emerald-50 text-emerald-700 text-[10px]">
                      {row.is_active === "inactive" ? tc("inactive") : tc("active")}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground truncate pt-2 border-t flex items-center justify-between">
                    <span>✉️ {row.email || tc("noEmail")}</span>
                    <Link
                      href={`/dashboard/employee/${row.id}`}
                      className="rounded-lg bg-muted/60 px-2.5 py-1 text-[11px] font-semibold text-foreground/80 hover:bg-primary hover:text-white transition-colors"
                    >
                      {tc("view")}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default DashboardPage;
