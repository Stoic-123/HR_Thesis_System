"use client";

import React, { useState, useEffect } from "react";
import { Link } from "@/src/i18n/routing";
import { Sidebar } from "@/components/Sidebar";
import { NotificationCenter } from "@/components/NotificationCenter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useRouter, usePathname } from "@/src/i18n/routing";
import { api } from "@/lib/api";
import { KeyRound } from "lucide-react";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";

import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { changePassword as changePasswordApi } from "@/services/auth.services";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Bell, Search, Loader2, PanelLeft, ShieldAlert } from "lucide-react";
import { useMe } from "@/hooks/useMe";
import { LoadingState } from "@/components/ui/loading-state";
import { SplashScreen } from "@/components/ui/splash-screen";
import { AnimatePresence, motion } from "framer-motion";
import { HRChatbot } from "@/components/HRChatbot";
import { classifyIntent } from "@/services/ai.services";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslations } from "next-intl";

const routePermissions = [
  { path: "/dashboard/company", permission: "employee:manage" },
  { path: "/dashboard/department", permission: "department:manage" },
  { path: "/dashboard/position", permission: "department:manage" },
  { path: "/dashboard/employee", permission: "employee:manage" },
  { path: "/dashboard/user", permission: "role:manage" },
  { path: "/dashboard/role", permission: "role:manage" },
  { path: "/dashboard/time-attendance/report", permission: "leave:approve" },
  { path: "/dashboard/time-attendance/setup", permission: "department:manage" },
  { path: "/dashboard/timemode", permission: "department:manage" },
  { path: "/dashboard/leave/report", permission: "leave:approve" },
  { path: "/dashboard/leave/setup", permission: "role:manage" },
  { path: "/dashboard/leave/profile", permission: "employee:manage" },
  { path: "/dashboard/leave", permission: "leave:approve" },
  { path: "/dashboard/document-type", permission: "role:manage" },
  { path: "/dashboard/holiday", permission: "department:manage" },
  { path: "/dashboard/overtime", permission: "overtime:approve" },
  { path: "/dashboard/payroll/review", permission: "payroll:manage" },
  { path: "/dashboard/payroll/reports", permission: "payroll:view" },
  { path: "/dashboard/payroll/periods", permission: "payroll:manage" },
  { path: "/dashboard/payroll", permission: "payroll:view" },
  { path: "/dashboard/kpi/cycles", permission: "role:manage" },
  { path: "/dashboard/kpi/templates", permission: "role:manage" },
  { path: "/dashboard/kpi/assign", permission: "kpi:evaluate" },
  { path: "/dashboard/kpi", permission: "kpi:evaluate" },
  { path: "/dashboard/audit-log", permission: "role:manage" },
  { path: "/dashboard/setting", permission: "role:manage" },
  { path: "/dashboard/asset/inventory", permission: "asset:approve" },
  { path: "/dashboard/asset/categories", permission: "role:manage" },
  { path: "/dashboard/asset/requests", permission: "asset:approve" },
  { path: "/dashboard/asset", permission: "asset:approve" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showSplash, setShowSplash] = useState(true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [isClassifying, setIsSearching] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("layout");
  const tc = useTranslations("common");

  const changePasswordMutation = useMutation({
    mutationFn: changePasswordApi,
    onSuccess: () => {
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to change password");
    },
  });

  const handleGlobalSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!globalSearchQuery.trim() || isClassifying) return;
    
    setIsSearching(true);
    try {
      const response = await classifyIntent(globalSearchQuery.trim());
      const { route, category } = response;
      
      if (category === "EMPLOYEE" || !route) {
        router.push(`/dashboard/employee?aiSearch=${encodeURIComponent(globalSearchQuery.trim())}`);
      } else {
        // Use next-intl router to push the route with current locale
        router.push(route);
        toast.info(t("navigating"));
      }
      setGlobalSearchQuery("");
    } catch (error) {
      console.error("[Global Search] Classification failed:", error);
      // Fallback to employee page
      router.push(`/dashboard/employee?aiSearch=${encodeURIComponent(globalSearchQuery.trim())}`);
    } finally {
      setIsSearching(false);
    }
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/api/auth/logout");
      return res.data;
    },
    onSuccess: () => {
      toast.success(t("logoutSuccess"));
      router.push("/login");
      router.refresh();
    },
    onError: () => {
      toast.error(t("logoutError"));
    },
  });
  const { data: user, isLoading, isError } = useMe();

  const matchingRoute = [...routePermissions]
    .sort((a, b) => b.path.length - a.path.length)
    .find((rp) => pathname.startsWith(rp.path));

  const isAuthorized =
    !matchingRoute ||
    user?.employee?.role === "Admin" ||
    user?.employee?.permissions?.includes(matchingRoute.permission);

  console.log("RBAC Guard Status:", {
    pathname,
    matchingRoute,
    role: user?.employee?.role,
    permissions: user?.employee?.permissions,
    isAuthorized
  });


  useEffect(() => {
    if (!isLoading) {
      // Ensure splash screen stays for at least 1.5 seconds to finish animation
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading && !isAuthorized) {
      toast.error("You do not have permission to access that page.");
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
      } else {
        router.push("/dashboard");
      }
    }
  }, [isLoading, isAuthorized, router]);

  useEffect(() => {
    if (isError) {
      router.push("/login");
    }
  }, [isError, router]);

  if (showSplash) {
    return (
      <AnimatePresence>
        {showSplash && <SplashScreen />}
      </AnimatePresence>
    );
  }

  if (isError) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <h1 className="text-2xl font-bold text-rose-500 mb-2">{t("unauthorized")}</h1>
        <p className="text-muted-foreground mb-6">{t("unauthorizedDesc")}</p>
        <Link href="/login">
          <Button className="rounded-2xl">{t("backToLogin")}</Button>
        </Link>
      </div>
    );
  }
  return (
    <div 
      className="flex h-screen overflow-hidden bg-background font-sans relative"
      style={{
        ...(user?.employee?.company?.primary_color && {
          "--primary": user.employee.company.primary_color,
          "--color-primary": user.employee.company.primary_color,
          "--sidebar-primary": user.employee.company.primary_color,
          "--color-sidebar-primary": user.employee.company.primary_color,
          "--sidebar-ring": user.employee.company.primary_color,
          "--color-sidebar-ring": user.employee.company.primary_color,
        }),
        ...(user?.employee?.company?.secondary_color && {
          "--secondary": user.employee.company.secondary_color,
          "--color-secondary": user.employee.company.secondary_color,
        }),
      } as React.CSSProperties}
    >
      {/* Decorative glass background elements */}
      <div className="pointer-events-none absolute -top-[10%] -left-[10%] z-0 h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px]" />
      <div className="pointer-events-none absolute top-[40%] -right-[10%] z-0 h-[40%] w-[40%] rounded-full bg-indigo-500/5 blur-[120px]" />
      <Sidebar collapsed={isSidebarCollapsed} />
      <main className="flex min-w-0 flex-1 flex-col transition-opacity duration-300">
        <header className="sticky top-0 z-10 border-b border-white/40 bg-white/60 px-6 backdrop-blur-xl">
          <div className="flex h-20 w-full items-center justify-between gap-4">
            <div className="min-w-0 flex flex-1 items-center gap-2 max-w-xl">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-2xl border border-white/60 bg-white/70 text-muted-foreground hover:bg-white/80 hover:text-primary"
                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                aria-label="Toggle sidebar"
              >
                <PanelLeft className="size-4.5" />
              </Button>
              <form onSubmit={handleGlobalSearch} className="min-w-0 flex-1">
                <Field orientation="horizontal" className="gap-2">
                  <Input
                    className="h-11 rounded-2xl border-white/60 bg-white/70"
                    type="search"
                    placeholder={t("searchPlaceholder")}
                    value={globalSearchQuery}
                    onChange={(e) => setGlobalSearchQuery(e.target.value)}
                    disabled={isClassifying}
                  />
                  <Button type="submit" disabled={isClassifying || !globalSearchQuery.trim()} className="h-11 rounded-2xl bg-primary px-5 text-primary-foreground hover:bg-primary/90">
                    {isClassifying ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                    {t("searchBtn")}
                  </Button>
                </Field>
              </form>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <NotificationCenter />
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Avatar className="h-11 w-11 cursor-pointer ring-2 ring-primary/20">
                    <AvatarImage
                            src={user?.employee?.profile_path ? `${process.env.NEXT_PUBLIC_API_URL}${user.employee.profile_path}` : ""} 
                      alt="@shadcn"
                    />
                    <AvatarFallback>CN</AvatarFallback>
                    <AvatarBadge className="bg-green-600 dark:bg-green-800" />
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-5">
                  <div>
                    <h1 className="text-2xl">{t("userProfile")}</h1>
                    <div className="my-6 flex flex-row items-center ">
                      <Avatar className="h-18 w-18 cursor-pointer ring-2 ring-primary/20">
                        {user?.employee?.profile_path ? (
                          <AvatarImage
                            src={`${process.env.NEXT_PUBLIC_API_URL}${user.employee.profile_path}`}
                            alt="User Profile"
                          />
                        ) : null}
                        <AvatarFallback>CN</AvatarFallback>
                        <AvatarBadge className="bg-green-600 dark:bg-green-800" />
                      </Avatar>
                      <div className="ms-5">
                        <h1 className="text-xl font-medium ">
                          {user?.username || ""}
                        </h1>
                        <h4>{user?.employee?.role || ""}</h4>
                      </div>
                    </div>
                    <hr />
                    <Dialog>
                      <DialogTrigger asChild>
                        <DropdownMenuItem
                          className="mt-4"
                          onSelect={(e) => e.preventDefault()}
                        >
                          <button className="w-full  flex items-center justify-between">
                            <span className="w-11 h-11 flex flex-row items-center justify-center  bg-[#fff5f5dd]">
                              <KeyRound className="w-5 h-5" />
                            </span>
                            <div>
                              <span className="text-[17px]">
                                {t("changePassword")}
                              </span>
                              <p className="text-[11px]">
                                {t("changePasswordDesc")}
                              </p>
                            </div>
                          </button>
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="text-2xl">
                            {t("changePasswordTitle")}
                          </DialogTitle>

                          <DialogDescription>
                            {t("changePasswordHint")}
                          </DialogDescription>
                        </DialogHeader>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (newPassword !== confirmNewPassword) {
                              toast.error("New passwords do not match");
                              return;
                            }
                            if (newPassword.length < 6) {
                              toast.error("New password must be at least 6 characters");
                              return;
                            }
                            changePasswordMutation.mutate({
                              current_password: currentPassword,
                              new_password: newPassword,
                              confirm_password: confirmNewPassword,
                            });
                          }}
                        >
                          <FieldGroup>
                            <FieldSet>
                              <Field>
                                <FieldLabel>{t("currentPassword")}</FieldLabel>

                                <div className="relative">
                                  <Input
                                    type={
                                      showCurrentPassword ? "text" : "password"
                                    }
                                    value={currentPassword}
                                    required
                                    placeholder={t("enterPassword")}
                                    className="h-11 rounded-2xl border-border/70 bg-background px-4 pr-10 shadow-none focus:border-primary"
                                    onChange={(e) =>
                                      setCurrentPassword(e.target.value)
                                    }
                                  />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowCurrentPassword(
                                        !showCurrentPassword,
                                      )
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                  >
                                    {showCurrentPassword ? (
                                      <EyeOff size={18} />
                                    ) : (
                                      <Eye size={18} />
                                    )}
                                  </button>
                                </div>
                              </Field>
                              <Field>
                                <FieldLabel>{t("newPassword")}</FieldLabel>

                                <div className="relative">
                                  <Input
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPassword}
                                    required
                                    placeholder={t("enterPassword")}
                                    className="h-11 rounded-2xl border-border/70 bg-background px-4 pr-10 shadow-none focus:border-primary"
                                    onChange={(e) =>
                                      setNewPassword(e.target.value)
                                    }
                                  />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowNewPassword(!showNewPassword)
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                  >
                                    {showNewPassword ? (
                                      <EyeOff size={18} />
                                    ) : (
                                      <Eye size={18} />
                                    )}
                                  </button>
                                </div>
                              </Field>
                              <Field>
                                <FieldLabel>{t("confirmPassword")}</FieldLabel>

                                <div className="relative">
                                  <Input
                                    type={
                                      showConfirmNewPassword
                                        ? "text"
                                        : "password"
                                    }
                                    value={confirmNewPassword}
                                    required
                                    placeholder={t("enterPassword")}
                                    className="h-11 rounded-2xl border-border/70 bg-background px-4 pr-10 shadow-none focus:border-primary"
                                    onChange={(e) =>
                                      setConfirmNewPassword(e.target.value)
                                    }
                                  />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowConfirmNewPassword(
                                        !showConfirmNewPassword,
                                      )
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                  >
                                    {showConfirmNewPassword ? (
                                      <EyeOff size={18} />
                                    ) : (
                                      <Eye size={18} />
                                    )}
                                  </button>
                                </div>
                              </Field>
                            </FieldSet>
                          </FieldGroup>
                        </form>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button className="py-4" variant="outline">
                              {tc("cancel")}
                            </Button>
                          </DialogClose>

                          <Button
                            className="px-8 py-4"
                            onClick={() => {
                              if (newPassword !== confirmNewPassword) {
                                toast.error("New passwords do not match");
                                return;
                              }
                              if (newPassword.length < 6) {
                                toast.error("New password must be at least 6 characters");
                                return;
                              }
                              changePasswordMutation.mutate({
                                current_password: currentPassword,
                                new_password: newPassword,
                                confirm_password: confirmNewPassword,
                              });
                            }}
                            disabled={changePasswordMutation.isPending}
                          >
                            {changePasswordMutation.isPending ? (
                              tc("submitting")
                            ) : (
                              tc("save")
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <DropdownMenuItem className="mt-6  bg-[#ff0202] ">
                    <button
                      className="text-white w-full py-2 "
                      onClick={() => {
                        logoutMutation.mutate();
                      }}
                      disabled={logoutMutation.isPending}
                    >
                      {logoutMutation.isPending ? t("loggingOut") : t("logout")}
                    </button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        {isAuthorized ? (
          <div className="custom-scrollbar flex-1 overflow-y-auto bg-body p-6 md:p-8">
            {children}
          </div>
        ) : (
          <div className="custom-scrollbar flex-1 overflow-y-auto bg-body p-6 md:p-8 flex items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        )}
        <HRChatbot />
      </main>
    </div>
  );
}
