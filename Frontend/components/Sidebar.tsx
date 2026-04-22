"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  Timer,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  FileText,
  Wrench,
  MoreVertical,
} from "lucide-react";

const menuItems = [
  {
    title: "Overviews",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Time Attendance",
    icon: Clock,
    submenu: [
      {
        title: "Report",
        icon: FileText,
        href: "/dashboard/time-attendance/report",
      },
      {
        title: "Setup",
        icon: Wrench,
        href: "/dashboard/time-attendance/setup",
      },
    ],
  },
  {
    title: "Leave Management",
    icon: CalendarDays,
    submenu: [
      { title: "Report", icon: FileText, href: "/dashboard/leave/report" },
      { title: "Setup", icon: Wrench, href: "/dashboard/leave/setup" },
    ],
  },
  {
    title: "Overtime",
    icon: Timer,
    href: "/dashboard/overtime",
  },
  {
    title: "Setting",
    icon: Settings,
    href: "/dashboard/setting",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    "Time Attendance": false,
    "Leave Management": false,
  });
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Automatically open menu if a submenu item is active
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.submenu) {
        const isSubActive = item.submenu.some((sub) =>
          pathname.startsWith(sub.href),
        );
        if (isSubActive) {
          setOpenMenus((prev) => ({ ...prev, [item.title]: true }));
        }
      }
    });
  }, [pathname]);

  const toggleMenu = (title: string) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setOpenMenus((prev) => ({ ...prev, [title]: true }));
    } else {
      setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }));
    }
  };

  return (
    <aside
      className={`flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 relative transition-all duration-400 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${isCollapsed ? "w-24" : "w-70"}`}
    >
      {/* Collapse Toggle Button - Realigned below header to avoid overlapping logo */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-22.5 w-7 h-7 flex items-center justify-center bg-background border border-sidebar-border shadow-md text-sidebar-foreground hover:text-primary rounded-full z-50 transition-colors ring-4 ring-background cursor-pointer"
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 ml-0.5 opacity-80" />
        ) : (
          <ChevronLeft className="w-4 h-4 mr-0.5 opacity-80" />
        )}
      </button>

      {/* Sidebar Header with ambient glow effect */}
      <div
        className={`h-24 flex items-center transition-all duration-400 border-b border-sidebar-border/40 relative overflow-hidden ${isCollapsed ? "justify-center px-0" : "px-6"}`}
      >
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-secondary/15 rounded-full blur-2xl pointer-events-none" />

        <div
          className={`flex items-center relative z-10 transition-all duration-400 ${isCollapsed ? "w-auto justify-center" : "w-full gap-4 px-2"}`}
        >
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-linear-to-br from-primary to-secondary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-[0_4px_16px_0_rgba(99,103,255,0.4)] ring-1 ring-primary/20">
            HR
          </div>
          <div
            className={`flex flex-col whitespace-nowrap overflow-hidden transition-all duration-400 ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}
          >
            <span className="text-xl font-extrabold bg-clip-text text-transparent bg-linear-to-r from-primary to-secondary leading-none tracking-tight">
              Sarana
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1.5 opacity-80">
              Workspace
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div
        className={`flex-1 overflow-y-auto overflow-x-hidden py-8 space-y-2 custom-scrollbar transition-all duration-400 ${isCollapsed ? "px-3" : "px-4"}`}
      >
        <div
          className={`text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-[0.2em] xl:px-3 px-2 transition-all duration-400 whitespace-nowrap overflow-hidden ${isCollapsed ? "w-0 opacity-0 h-0 mb-0" : "w-auto opacity-100 mb-4 h-auto"}`}
        >
          Main Menu
        </div>

        {menuItems.map((item) => {
          const isActive =
            item.href === pathname ||
            (item.submenu &&
              item.submenu.some((sub) => pathname.startsWith(sub.href)));
          const isOpen = openMenus[item.title] && !isCollapsed;

          return (
            <div
              key={item.title}
              className="mb-2 flex flex-col relative w-full"
            >
              {item.submenu ? (
                <div>
                  <button
                    onClick={() => toggleMenu(item.title)}
                    title={isCollapsed ? item.title : ""}
                    className={`transition-all duration-300 group flex items-center relative overflow-hidden ${
                      isActive || openMenus[item.title]
                        ? isCollapsed
                          ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/30"
                          : "bg-primary/5 text-primary font-semibold shadow-sm"
                        : "hover:bg-sidebar-accent/50 hover:text-primary text-sidebar-foreground/80 font-medium"
                    } ${isCollapsed ? "w-12 h-12 justify-center mx-auto rounded-full p-0 shrink-0" : "w-full px-3 py-3 justify-between rounded-4xl"}`}
                  >
                    <div className="flex items-center gap-3 w-full h-full">
                      <div
                        className={`flex shrink-0 items-center justify-center transition-all duration-300 ${isCollapsed ? "w-full h-full rounded-full" : "p-1.5 rounded-lg"} ${!isCollapsed && (isActive || openMenus[item.title]) ? "bg-primary/10 text-primary shadow-sm" : isCollapsed ? "" : "bg-transparent text-sidebar-foreground/50 group-hover:text-primary group-hover:bg-primary/5"}`}
                      >
                        <item.icon
                          className={`transition-transform duration-300 ${isCollapsed ? "w-5.5 h-5.5" : "w-5 h-5"}`}
                        />
                      </div>
                      <span
                        className={`text-[14px] whitespace-nowrap overflow-hidden transition-all duration-400 ${isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 group-hover:translate-x-1 block"}`}
                      >
                        {item.title}
                      </span>
                    </div>
                    {!isCollapsed &&
                      (openMenus[item.title] ? (
                        <ChevronDown className="w-4 h-4 shrink-0 opacity-60 transition-transform duration-300 ml-2" />
                      ) : (
                        <ChevronRight className="w-4 h-4 shrink-0 opacity-40 transition-transform duration-300 ml-2" />
                      ))}
                  </button>

                  {/* Enhanced Submenu visualization */}
                  <div
                    className={`overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.23,1,0.32,1)] drop-shadow-sm ${
                      isOpen
                        ? "max-h-75 opacity-100 mt-1"
                        : "max-h-0 opacity-0 hidden"
                    }`}
                  >
                    <div className="pl-4 ml-6 border-l border-sidebar-border/60 py-2 space-y-1.5 relative">
                      {item.submenu.map((subItem) => {
                        const isSubActive =
                          pathname === subItem.href ||
                          pathname.startsWith(subItem.href + "/");
                        return (
                          <Link
                            key={subItem.title}
                            href={subItem.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 text-sm group relative whitespace-nowrap ${
                              isSubActive
                                ? "text-primary font-bold bg-primary/10 shadow-sm"
                                : "hover:text-primary hover:bg-sidebar-accent/30 text-sidebar-foreground/70 font-medium"
                            }`}
                          >
                            {/* Branch horizontal line joining submenu */}
                            <div
                              className={`absolute -left-4.25 top-1/2 -translate-y-1/2 w-4 h-0.5 transition-colors rounded-r-full ${isSubActive ? "bg-primary" : "bg-sidebar-border/60 group-hover:bg-primary/40"}`}
                            />

                            {/* Active dot indicator */}
                            {isSubActive && (
                              <div className="absolute -left-5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary ring-4 ring-primary/20 shadow-[0_0_8px_rgba(99,103,255,0.6)]" />
                            )}

                            <subItem.icon
                              className={`w-3.75 h-3.75 shrink-0 transition-transform duration-300 group-hover:scale-110 ${isSubActive ? "text-primary" : "opacity-50"}`}
                            />
                            <span
                              className={`transform transition-transform duration-300 ${isSubActive ? "" : "group-hover:translate-x-0.5"}`}
                            >
                              {subItem.title}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  href={item.href || "#"}
                  title={isCollapsed ? item.title : ""}
                  className={`transition-all duration-300 group flex items-center relative overflow-hidden ${
                    isActive
                      ? isCollapsed
                        ? "bg-primary text-primary-foreground font-semibold shadow-[0_4px_16px_rgba(99,103,255,0.4)]"
                        : "bg-primary text-primary-foreground font-semibold shadow-[0_4px_16px_rgba(99,103,255,0.3)]"
                      : "hover:bg-sidebar-accent/50 hover:text-primary text-sidebar-foreground/80 font-medium"
                  } ${isCollapsed ? "w-12 h-12 justify-center mx-auto rounded-full p-0 shrink-0" : "w-full px-3 py-3 gap-3 rounded-4xl"}`}
                >
                  {!isActive && !isCollapsed && (
                    <div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out" />
                  )}

                  <div
                    className={`flex items-center justify-center shrink-0 transition-colors ${isCollapsed ? "w-full h-full rounded-full" : "p-1.5 rounded-lg z-10"} ${isActive ? (isCollapsed ? "text-primary-foreground" : "bg-white/20 text-white shadow-inner") : "text-sidebar-foreground/50 group-hover:text-primary group-hover:bg-primary/5"}`}
                  >
                    <item.icon
                      className={`transition-transform duration-300 z-10 ${isCollapsed ? "w-5.5 h-5.5 group-hover:scale-110" : "w-5 h-5"}`}
                    />
                  </div>
                  <span
                    className={`text-[14px] whitespace-nowrap overflow-hidden z-10 transform transition-all duration-400 ${isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block"} ${isActive ? "" : "group-hover:translate-x-1"}`}
                  >
                    {item.title}
                  </span>
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer User Profile Area */}
      <div
        className={`p-4 border-t border-sidebar-border/40 bg-sidebar/50 backdrop-blur-sm transition-all duration-400 ${isCollapsed ? "flex justify-center px-2" : ""}`}
      >
        <button
          className={`flex items-center rounded-2xl hover:bg-sidebar-accent/60 transition-all duration-300 group border border-transparent hover:border-sidebar-border/50 shadow-sm ${isCollapsed ? "justify-center w-12 h-12 p-0 shadow-none bg-transparent hover:bg-sidebar-accent/50 mx-auto rounded-full ring-2 ring-transparent hover:ring-primary/20" : "w-full justify-between p-2.5"}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 shrink-0 rounded-full bg-linear-to-tr from-accent to-secondary/80 text-background flex items-center justify-center font-bold text-xs shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 ${isCollapsed ? "w-11 h-11 text-[13px] shadow-md ring-2 ring-background" : "ring-2 ring-background shadow-inner"}`}
            >
              AD
            </div>
            <div
              className={`flex flex-col text-left whitespace-nowrap overflow-hidden transition-all duration-400 ${isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block"}`}
            >
              <span className="text-sm font-bold truncate leading-tight group-hover:text-primary transition-colors">
                Admin User
              </span>
              <span className="text-[11px] opacity-60 font-semibold mt-0.5">
                admin@sarana.com
              </span>
            </div>
          </div>
          {!isCollapsed && (
            <div className="p-1.5 rounded-lg bg-transparent transition-colors text-sidebar-foreground/40 group-hover:text-primary group-hover:bg-primary/10">
              <MoreVertical className="w-5 h-5 shrink-0" />
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
