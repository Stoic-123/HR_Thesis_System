"use client";

import React, { useState, useEffect, useMemo } from "react";
import { usePathname } from "@/src/i18n/routing";
import { Link } from "@/src/i18n/routing";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";

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
  Smartphone,
  ChevronDown,
  ChevronRight,
  FileText,
  Wrench,
  Banknote,
  CalendarClock,
  Laptop,
  Megaphone,
  UserPlus,
  GripVertical,
  Award,
} from "lucide-react";
import { useMe } from "@/hooks/useMe";
import { useCompany } from "@/hooks/useCompany";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
    permission: "announcement:manage",
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
    title: "Recruitment",
    labelKey: "recruitment",
    icon: UserPlus,
    href: "/dashboard/recruitment",
    permission: "recruitment:manage",
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
    title: "Holiday",
    labelKey: "holiday",
    icon: CalendarDays,
    href: "/dashboard/holiday",
    permission: "department:manage",
  },
  {
    title: "Document Type",
    labelKey: "documentType",
    icon: FileText,
    href: "/dashboard/document-type",
    permission: "role:manage",
  },
  {
    title: "Overtime",
    labelKey: "overtime",
    icon: Timer,
    submenu: [
      {
        title: "Requests",
        labelKey: "overtimeRequests",
        icon: Timer,
        href: "/dashboard/overtime",
        permission: "overtime:approve",
      },
      {
        title: "Report",
        labelKey: "report",
        icon: FileText,
        href: "/dashboard/overtime/report",
        permission: "overtime:approve",
      },
    ],
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
    title: "Performance (KPI)",
    labelKey: "kpi",
    icon: Award,
    href: "/dashboard/kpi",
    permission: "payroll:view",
  },
  {
    title: "Asset",
    labelKey: "asset",
    icon: Laptop,
    href: "/dashboard/asset",
    permission: "asset:approve",
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
      {
        title: "App Config",
        labelKey: "appConfig",
        icon: Smartphone,
        href: "/dashboard/app-config",
        permission: "role:manage",
      },
    ],
  },
];

const SIDEBAR_ORDER_STORAGE_KEY = "sarana_sidebar_order_v1";

function SidebarItemRow({
  item,
  isActive,
  isOpen,
  isExpanded,
  toggleMenu,
  pathname,
  t,
}: {
  item: MenuItem;
  isActive: boolean;
  isOpen: boolean;
  isExpanded: boolean;
  toggleMenu: (title: string) => void;
  pathname: string;
  t: (key: string) => string;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={dragControls}
      className="relative select-none group"
      whileDrag={{
        scale: 1.02,
        zIndex: 50,
        boxShadow: "0 12px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)",
      }}
      transition={{ duration: 0.15 }}
    >
      {item.submenu ? (
        <div>
          {isExpanded ? (
            <div
              className={`relative flex w-full items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                isActive || isOpen
                  ? "bg-gray-50/80 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
              onClick={() => toggleMenu(item.title)}
            >
              <div className="flex items-center gap-3 relative z-10">
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                <span>{t(item.labelKey)}</span>
              </div>
              <div className="flex items-center gap-1.5 relative z-10">
                {/* Drag Grip Handle */}
                <div
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    dragControls.start(e);
                  }}
                  className="cursor-grab active:cursor-grabbing p-1 -m-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Drag to reorder"
                >
                  <GripVertical className="size-3.5 text-gray-400 hover:text-gray-600" />
                </div>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
          ) : (
            <div
              className="relative"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <Link
                href={item.submenu[0]?.href || "#"}
                draggable={false}
                className={`relative flex w-full items-center justify-center rounded-xl py-2.5 transition-colors ${
                  isActive
                    ? "text-white font-semibold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarCollapsedPill"
                    className="absolute inset-0 bg-primary rounded-xl z-0 shadow-md shadow-primary/20"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <item.icon className="h-4.5 w-4.5 relative z-10" />
              </Link>
            </div>
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
                {item.submenu?.map((subItem) => {
                  const hasMoreSpecificMatch = item.submenu?.some((otherSub) =>
                    otherSub.href !== subItem.href &&
                    otherSub.href.length > subItem.href.length &&
                    pathname.startsWith(otherSub.href)
                  ) ?? false;
                  const isSubActive =
                    pathname === subItem.href ||
                    (pathname.startsWith(subItem.href + "/") && !hasMoreSpecificMatch);
                  return (
                    <Link
                      key={subItem.title}
                      href={subItem.href}
                      draggable={false}
                      className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isSubActive
                          ? "text-primary font-semibold"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      {isSubActive && (
                        <motion.div
                          layoutId="activeSidebarSubPill"
                          className="absolute inset-0 bg-primary/10 rounded-lg z-0"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <subItem.icon className="h-4 w-4 relative z-10" />
                      <span className="relative z-10">{t(subItem.labelKey)}</span>
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="relative">
          <Link
            href={item.href || "#"}
            draggable={false}
            className={`relative flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive
                ? "text-white font-semibold"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            } ${!isExpanded ? "justify-center px-0" : ""}`}
          >
            {isActive && (
              <motion.div
                layoutId="activeSidebarMainPill"
                className="absolute inset-0 bg-primary rounded-xl z-0 shadow-md shadow-primary/20"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <div className="flex items-center gap-3 relative z-10">
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {isExpanded && <span>{t(item.labelKey)}</span>}
            </div>

            {isExpanded && (
              <div
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dragControls.start(e);
                }}
                className="cursor-grab active:cursor-grabbing p-1 -m-1 opacity-0 group-hover:opacity-100 transition-opacity relative z-10"
                title="Drag to reorder"
              >
                <GripVertical
                  className={`size-3.5 ${
                    isActive ? "text-white/80 hover:text-white" : "text-gray-400 hover:text-gray-600"
                  }`}
                />
              </div>
            )}
          </Link>
        </div>
      )}
    </Reorder.Item>
  );
}

export function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [menuList, setMenuList] = useState<MenuItem[]>([]);
  const { data: user, isLoading: isLoadingUser } = useMe();
  const { data: companyRes, isLoading: isLoadingCompany } = useCompany();
  const company = companyRes?.data;
  const isLoading = isLoadingUser || isLoadingCompany;
  const t = useTranslations("sidebar");

  const filteredMenuItems = useMemo(() => {
    const userPermissions = user?.employee?.permissions || [];
    const isSuperAdmin = userPermissions.includes("*") || user?.employee?.role?.toLowerCase() === "admin";

    return menuItems
      .map((item) => {
        if (item.submenu) {
          const visibleSubmenu = item.submenu.filter((sub) => {
            if (!sub.permission) return true;
            if (isSuperAdmin) return true;
            return userPermissions.includes(sub.permission);
          });
          return { ...item, submenu: visibleSubmenu };
        }
        if (!item.permission) return item;
        if (isSuperAdmin) return item;
        const hasPerm = userPermissions.includes(item.permission);
        return hasPerm ? item : null;
      })
      .filter((item): item is MenuItem => item !== null && (!item.submenu || item.submenu.length > 0));
  }, [user]);

  // Load and apply saved order to menuList
  useEffect(() => {
    if (filteredMenuItems.length === 0) return;

    let order: string[] = [];
    try {
      const stored = localStorage.getItem(SIDEBAR_ORDER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          order = parsed;
        }
      }
    } catch (e) {
      console.error("Failed to load sidebar order:", e);
    }

    if (order.length > 0) {
      const orderMap = new Map(order.map((title, idx) => [title, idx]));
      const sorted = [...filteredMenuItems].sort((a, b) => {
        const posA = orderMap.has(a.title) ? orderMap.get(a.title)! : 999;
        const posB = orderMap.has(b.title) ? orderMap.get(b.title)! : 999;
        return posA - posB;
      });
      setMenuList(sorted);
    } else {
      setMenuList(filteredMenuItems);
    }
  }, [filteredMenuItems]);

  const handleReorder = (newItems: MenuItem[]) => {
    setMenuList(newItems);
    const newOrder = newItems.map((item) => item.title);
    try {
      localStorage.setItem(SIDEBAR_ORDER_STORAGE_KEY, JSON.stringify(newOrder));
    } catch (e) {
      console.error("Failed to save sidebar order:", e);
    }
  };

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
    <motion.aside
      animate={{ width: isExpanded ? 256 : 64 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="h-screen border-r border-gray-200 bg-white flex flex-col overflow-hidden"
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

      <Reorder.Group
        axis="y"
        values={menuList}
        onReorder={handleReorder}
        className="flex-1 overflow-y-auto px-2 py-4 space-y-1 custom-scrollbar list-none"
        as="div"
      >
        {menuList.map((item) => {
          const isActive =
            item.href === pathname ||
            (item.submenu &&
              item.submenu.some((sub) => pathname.startsWith(sub.href)));
          const isOpen = openMenus[item.title] && isExpanded;

          return (
            <SidebarItemRow
              key={item.title}
              item={item}
              isActive={!!isActive}
              isOpen={!!isOpen}
              isExpanded={isExpanded}
              toggleMenu={toggleMenu}
              pathname={pathname}
              t={t}
            />
          );
        })}
      </Reorder.Group>

      <div className="p-4 border-t border-gray-100">
        <div
          className={`flex items-center ${!isExpanded ? "justify-center" : ""}`}
        >
          {isExpanded && (
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-9 w-9 shrink-0 ring-2 ring-primary/10">
                <AvatarImage
                  src={user?.employee?.profile_path ? `${process.env.NEXT_PUBLIC_API_URL}${user.employee.profile_path}` : ""}
                  alt={user?.username || "User"}
                />
                <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                  {(user?.employee?.first_name ? user.employee.first_name[0] : (user?.username?.[0] || "U")).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-semibold text-gray-900">
                  {user?.employee?.first_name ? `${user.employee.first_name} ${user.employee.last_name || ""}` : (user?.username || "")}
                </div>
                <div className="truncate text-xs text-gray-500">
                  {user?.employee?.email || user?.username}
                </div>
              </div>
            </div>
          )}
          {!isExpanded && (
            <Avatar className="h-9 w-9 shrink-0 ring-2 ring-primary/10">
              <AvatarImage
                src={user?.employee?.profile_path ? `${process.env.NEXT_PUBLIC_API_URL}${user.employee.profile_path}` : ""}
                alt={user?.username || "User"}
              />
              <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                {(user?.employee?.first_name ? user.employee.first_name[0] : (user?.username?.[0] || "U")).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
