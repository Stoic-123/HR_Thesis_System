"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "@/src/i18n/routing";
import { Link } from "@/src/i18n/routing";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  Building2,
  BriefcaseBusiness,
  UsersRound,
  Shield,
  FileArchive,
  CalendarCheck2,
  Timer,
  Settings,
  ChevronDown,
  ChevronRight,
  FileText,
  Wrench,
  Banknote,
  CalendarClock,
  Target,
  Laptop,
  Megaphone,
} from "lucide-react";
import { useMe } from "@/hooks/useMe";
import { useCompany } from "@/hooks/useCompany";

type SubMenuItem = {
  title: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  permission?: string;
};

type MenuItem = {
  title: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  submenu?: SubMenuItem[];
  permission?: string;
};

const menuItems: MenuItem[] = [
  {
    title: "Overview",
    labelKey: "overview",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Announcements",
    labelKey: "announcements",
    icon: Megaphone,
    href: "/dashboard/announcement",
  },
  {
    title: "Organization",
    labelKey: "organization",
    icon: Building2,
    submenu: [
      {
        title: "Company",
        labelKey: "company",
        icon: Building2,
        href: "/dashboard/company",
        permission: "employee:manage",
      },
      {
        title: "Department",
        labelKey: "department",
        icon: BriefcaseBusiness,
        href: "/dashboard/department",
        permission: "department:manage",
      },
      {
        title: "Position",
        labelKey: "position",
        icon: BriefcaseBusiness,
        href: "/dashboard/position",
        permission: "department:manage",
      },
    ],
  },
  {
    title: "People",
    labelKey: "people",
    icon: UsersRound,
    submenu: [
      {
        title: "Employee",
        labelKey: "employee",
        icon: UsersRound,
        href: "/dashboard/employee",
        permission: "employee:manage",
      },
      {
        title: "User",
        labelKey: "user",
        icon: UsersRound,
        href: "/dashboard/user",
        permission: "role:manage",
      },
      {
        title: "Role",
        labelKey: "role",
        icon: Shield,
        href: "/dashboard/role",
        permission: "role:manage",
      },
    ],
  },
  {
    title: "Time Attendance",
    labelKey: "timeAttendance",
    icon: Clock,
    submenu: [
      {
        title: "Report",
        labelKey: "report",
        icon: FileText,
        href: "/dashboard/time-attendance/report",
        permission: "leave:approve",
      },
      {
        title: "Setup",
        labelKey: "setup",
        icon: Wrench,
        href: "/dashboard/time-attendance/setup",
        permission: "department:manage",
      },
      {
        title: "Time Mode",
        labelKey: "timeMode",
        icon: Clock,
        href: "/dashboard/timemode",
        permission: "department:manage",
      },
    ],
  },
  {
    title: "Leave Management",
    labelKey: "leaveManagement",
    icon: CalendarDays,
    submenu: [
      {
        title: "Leave Requests",
        labelKey: "leaveRequests",
        icon: CalendarDays,
        href: "/dashboard/leave",
        permission: "leave:approve",
      },
      {
        title: "Report",
        labelKey: "report",
        icon: FileText,
        href: "/dashboard/leave/report",
        permission: "leave:approve",
      },
      {
        title: "Setup",
        labelKey: "setup",
        icon: Wrench,
        href: "/dashboard/leave/setup",
        permission: "role:manage",
      },
      {
        title: "Leave Profile",
        labelKey: "leaveProfile",
        icon: UsersRound,
        href: "/dashboard/leave/profile",
        permission: "employee:manage",
      },
    ],
  },
  {
    title: "Documents",
    labelKey: "documents",
    icon: FileArchive,
    submenu: [
      {
        title: "Document Type",
        labelKey: "documentType",
        icon: FileText,
        href: "/dashboard/document-type",
        permission: "role:manage",
      },
      {
        title: "Holiday",
        labelKey: "holiday",
        icon: CalendarDays,
        href: "/dashboard/holiday",
        permission: "department:manage",
      },
    ],
  },
  {
    title: "Overtime",
    labelKey: "overtime",
    icon: Timer,
    href: "/dashboard/overtime",
    permission: "overtime:approve",
  },
  {
    title: "Payroll",
    labelKey: "payroll",
    icon: Banknote,
    submenu: [
      {
        title: "Dashboard",
        labelKey: "payrollDashboard",
        icon: Banknote,
        href: "/dashboard/payroll",
        permission: "payroll:view",
      },
      {
        title: "Review",
        labelKey: "payrollReview",
        icon: FileText,
        href: "/dashboard/payroll/review",
        permission: "payroll:manage",
      },
      {
        title: "Reports",
        labelKey: "payrollReports",
        icon: FileText,
        href: "/dashboard/payroll/reports",
        permission: "payroll:view",
      },
      {
        title: "Periods",
        labelKey: "payrollPeriods",
        icon: CalendarClock,
        href: "/dashboard/payroll/periods",
        permission: "payroll:manage",
      },
    ],
  },
  {
    title: "KPI",
    labelKey: "kpi",
    icon: Target,
    submenu: [
      {
        title: "Dashboard",
        labelKey: "kpiDashboard",
        icon: LayoutDashboard,
        href: "/dashboard/kpi",
        permission: "kpi:evaluate",
      },
      {
        title: "Cycles",
        labelKey: "kpiCycles",
        icon: Target,
        href: "/dashboard/kpi/cycles",
        permission: "role:manage",
      },
      {
        title: "Templates",
        labelKey: "kpiTemplates",
        icon: FileText,
        href: "/dashboard/kpi/templates",
        permission: "role:manage",
      },
      {
        title: "Assign",
        labelKey: "kpiAssign",
        icon: UsersRound,
        href: "/dashboard/kpi/assign",
        permission: "kpi:evaluate",
      },
    ],
  },
  {
    title: "System",
    labelKey: "system",
    icon: Shield,
    submenu: [
      {
        title: "Audit Log",
        labelKey: "auditLog",
        icon: FileText,
        href: "/dashboard/audit-log",
        permission: "role:manage",
      },
      {
        title: "Setting",
        labelKey: "setting",
        icon: Settings,
        href: "/dashboard/setting",
        permission: "role:manage",
      },
    ],
  },
  {
    title: "Asset",
    labelKey: "asset",
    icon: Laptop,
    submenu: [
      {
        title: "Dashboard",
        labelKey: "assetDashboard",
        icon: LayoutDashboard,
        href: "/dashboard/asset",
        permission: "asset:approve",
      },
      {
        title: "Inventory",
        labelKey: "assetInventory",
        icon: FileText,
        href: "/dashboard/asset/inventory",
        permission: "asset:approve",
      },
      {
        title: "Categories",
        labelKey: "assetCategories",
        icon: FileText,
        href: "/dashboard/asset/categories",
        permission: "role:manage",
      },
      {
        title: "Requests",
        labelKey: "assetRequests",
        icon: FileText,
        href: "/dashboard/asset/requests",
        permission: "asset:approve",
      },
    ],
  },
];

export function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const { data: user, isLoading: isLoadingUser } = useMe();
  const { data: companyRes, isLoading: isLoadingCompany } = useCompany();
  const company = companyRes?.data;
  const isLoading = isLoadingUser || isLoadingCompany;
  const t = useTranslations("sidebar");

  const filteredMenuItems = menuItems
    .map((item) => {
      if (item.submenu) {
        const visibleSubmenu = item.submenu.filter((sub) => {
          if (!sub.permission) return true;
          if (user?.employee?.role === "Admin") return true;
          return user?.employee?.permissions?.includes(sub.permission);
        });
        return { ...item, submenu: visibleSubmenu };
      }
      if (!item.permission) return item;
      if (user?.employee?.role === "Admin") return item;
      const hasPerm = user?.employee?.permissions?.includes(item.permission);
      return hasPerm ? item : null;
    })
    .filter((item): item is MenuItem => item !== null && (!item.submenu || item.submenu.length > 0));

  useEffect(() => {
    filteredMenuItems.forEach((item) => {
      if (item.submenu) {
        const isSubActive = item.submenu.some((sub) =>
          pathname.startsWith(sub.href),
        );
        const isOnSetupPages =
          pathname.startsWith("/dashboard/timesheet") ||
          pathname.startsWith("/dashboard/dayofweek") ||
          pathname.startsWith("/dashboard/employeeworkingprofile");
        if (
          isSubActive ||
          (item.title === "Time Attendance" && isOnSetupPages)
        ) {
          setOpenMenus({ [item.title]: true });
        }
      }
    });
  }, [pathname, isLoadingUser]);

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => {
      if (prev[title]) {
        return { [title]: false };
      }
      return { [title]: true };
    });
  };

  if (isLoading) {
    return (
      <aside className="w-64 h-screen border-r border-gray-200 bg-white flex flex-col">
        <div className="p-6">
          <div className="h-10 bg-gray-100 rounded-lg" />
        </div>
        <div className="flex-1 space-y-1 px-3 py-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </aside>
    );
  }

  const isExpanded = !collapsed;

  return (
    <aside
      className={`h-screen border-r border-gray-200 bg-white flex flex-col transition-all duration-300 ${
        isExpanded ? "w-64" : "w-16"
      }`}
    >
      <div
        className={`relative p-4 border-b border-gray-100 flex items-center ${
          isExpanded ? "justify-start gap-3" : "justify-center"
        }`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white overflow-hidden shrink-0">
          {company?.logo_path ? (
            <img 
              src={`${process.env.NEXT_PUBLIC_API_URL}${company.logo_path}`} 
              alt={company.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            company?.name?.charAt(0).toUpperCase() || "C"
          )}
        </div>
        {isExpanded && (
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 truncate">{company?.name || "Company"}</div>
            <div className="text-xs text-gray-500">{t("adminPanel")}</div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1 custom-scrollbar">
        {filteredMenuItems.map((item) => {
          const isActive =
            item.href === pathname ||
            (item.submenu &&
              item.submenu.some((sub) => pathname.startsWith(sub.href)));
          const isOpen = openMenus[item.title] && isExpanded;

          return (
            <div key={item.title} className="relative">
              {item.submenu ? (
                <div>
                  {isExpanded ? (
                    <button
                      onClick={() => toggleMenu(item.title)}
                      className={`flex w-full items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive || isOpen
                          ? "bg-gray-50 text-gray-900"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                      type="button"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4.5 w-4.5" />
                        {t(item.labelKey)}
                      </div>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  ) : (
                    <Link
                      href={item.submenu[0]?.href || "#"}
                      className={`flex w-full items-center justify-center rounded-lg py-2.5 transition-colors ${
                        isActive
                          ? "bg-primary text-white"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <item.icon className="h-4.5 w-4.5" />
                    </Link>
                  )}

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="ml-3 mt-1 space-y-1 border-l border-gray-200 pl-3 overflow-hidden"
                      >
                        {item.submenu.map((subItem) => {
                          const isSubActive =
                            pathname === subItem.href ||
                            pathname.startsWith(subItem.href + "/");
                          return (
                            <Link
                              key={subItem.title}
                              href={subItem.href}
                              className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors ${
                                isSubActive
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                              }`}
                            >
                              <subItem.icon className="h-4 w-4" />
                              {t(subItem.labelKey)}
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  href={item.href || "#"}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  } ${!isExpanded ? "justify-center px-0" : ""}`}
                >
                  <item.icon className="h-4.5 w-4.5" />
                  {isExpanded && t(item.labelKey)}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-gray-100">
        <div
          className={`flex items-center ${!isExpanded ? "justify-center" : ""}`}
        >
          {isExpanded && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-base font-semibold text-gray-900 overflow-hidden">
                {user?.employee?.profile_path ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL}${user.employee.profile_path}`}
                    alt={user.employee.full_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>
                    {user?.employee?.full_name
                      ? user.employee.full_name
                          .split(" ")
                          .map((n: any) => n[0])
                          .join("")
                      : "UN"}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-semibold text-gray-900">
                  {user?.username}
                </div>
                <div className="truncate text-xs text-gray-500">
                  {user?.employee?.email}
                </div>
              </div>
            </div>
          )}
          {!isExpanded && (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-base font-semibold text-gray-900 overflow-hidden">
              {user?.employee?.profile_path ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL}${user.employee.profile_path}`}
                  alt={user.employee.full_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>
                  {user?.employee?.full_name
                    ? user.employee.full_name
                        .split(" ")
                        .map((n: any) => n[0])
                        .join("")
                    : "UN"}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
