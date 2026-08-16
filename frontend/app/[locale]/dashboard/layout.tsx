
"use client";

import React, { useState, useEffect } from "react";
import { Link } from "@/src/i18n/routing";
import { Sidebar } from "@/components/Sidebar";
import { NotificationCenter } from "@/components/NotificationCenter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
import {
  changePassword as changePasswordApi,
  updateProfile as updateProfileApi,
} from "@/services/auth.services";
import { Label } from "@/components/ui/label";
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
import { Bell, Search, Loader2, PanelLeft, ShieldAlert, Pencil, Camera, User, X, Check } from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
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
  { path: "/dashboard/recruitment", permission: "employee:manage" },
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
  const queryClient = useQueryClient();
  const [showSplash, setShowSplash] = useState(true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Edit Profile States
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("layout");
  const tc = useTranslations("common");
  const apiBaseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  const { data: user, isLoading, isError } = useMe();

  const getInitials = (userData: any) => {
    if (userData?.employee?.first_name || userData?.employee?.last_name) {
      const fn = userData.employee.first_name || "";
      const ln = userData.employee.last_name || "";
      return `${fn[0] || ""}${ln[0] || ""}`.toUpperCase() || "U";
    }
    if (userData?.username) {
      return userData.username.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  useEffect(() => {
    if (isEditProfileOpen && user) {
      setEditFirstName(user.employee?.first_name || "");
      setEditLastName(user.employee?.last_name || "");
      setEditUsername(user.username || "");
      setProfileFile(null);
      setProfilePreview(null);
    }
  }, [isEditProfileOpen, user]);

  const updateProfileMutation = useMutation({
    mutationFn: updateProfileApi,
    onSuccess: async (data) => {
      if (data.result) {
        toast.success(data.message || "Profile updated successfully!");
        await queryClient.invalidateQueries();
        setIsEditProfileOpen(false);
      } else {
        toast.error(data.message || "Failed to update profile");
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update profile");
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("first_name", editFirstName);
    formData.append("last_name", editLastName);
    formData.append("username", editUsername);
    if (profileFile) {
      formData.append("profile_path", profileFile);
    }
    updateProfileMutation.mutate(formData);
  };

  const changePasswordMutation = useMutation({
    mutationFn: changePasswordApi,
    onSuccess: () => {
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setIsChangePasswordOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to change password");
    },
  });


  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/api/auth/logout");
      return res.data;
    },
    onSuccess: () => {
      toast.success(t("logoutSuccess"));
      window.location.href = "/km/login?logout=true";
    },
    onError: () => {
      toast.error(t("logoutError"));
      window.location.href = "/km/login?logout=true";
    },
  });

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
    if (user?.employee?.company?.primary_color) {
      const pColor = user.employee.company.primary_color;
      document.documentElement.style.setProperty("--primary", pColor);
      document.documentElement.style.setProperty("--color-primary", pColor);
      document.documentElement.style.setProperty("--sidebar-primary", pColor);
      document.documentElement.style.setProperty("--sidebar-ring", pColor);
    }
    if (user?.employee?.company?.secondary_color) {
      const sColor = user.employee.company.secondary_color;
      document.documentElement.style.setProperty("--secondary", sColor);
      document.documentElement.style.setProperty("--color-secondary", sColor);
    }
  }, [user?.employee?.company?.primary_color, user?.employee?.company?.secondary_color]);

  useEffect(() => {
    if (isError) {
      api.post("/api/auth/logout").finally(() => {
        window.location.href = "/login?logout=true";
      });
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
        <Button 
          className="rounded-2xl" 
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t("backToLogin")}
        </Button>
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
      {user?.employee?.company?.logo_path && (
        <link 
          rel="icon" 
          href={`${apiBaseURL}${user.employee.company.logo_path}`} 
          sizes="any" 
        />
      )}
      {/* Decorative glass background elements */}
      <div className="pointer-events-none absolute -top-[10%] -left-[10%] z-0 h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px]" />
      <div className="pointer-events-none absolute top-[40%] -right-[10%] z-0 h-[40%] w-[40%] rounded-full bg-indigo-500/5 blur-[120px]" />
      <Sidebar collapsed={isSidebarCollapsed} />
      <main className="flex min-w-0 flex-1 flex-col transition-opacity duration-300">
        <header className="sticky top-0 z-30 border-b border-white/40 bg-white/60 px-6 backdrop-blur-xl">
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

            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <NotificationCenter />
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Avatar className="h-11 w-11 cursor-pointer ring-2 ring-primary/20">
                    <AvatarImage
                      src={user?.employee?.profile_path ? `${apiBaseURL}${user.employee.profile_path}` : ""} 
                      alt={user?.username || "User"}
                    />
                    <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                      {getInitials(user)}
                    </AvatarFallback>
                    <AvatarBadge className="bg-green-600 dark:bg-green-800" />
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-84 p-5 rounded-2xl">
                  <div>
                    <h1 className="text-xl font-bold">{t("userProfile")}</h1>
                    <div className="my-5 flex flex-row items-center">
                      <Avatar className="h-16 w-16 cursor-pointer ring-2 ring-primary/20 shrink-0">
                        <AvatarImage
                          src={user?.employee?.profile_path ? `${apiBaseURL}${user.employee.profile_path}` : ""}
                          alt="User Profile"
                        />
                        <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                          {getInitials(user)}
                        </AvatarFallback>
                        <AvatarBadge className="bg-green-600 dark:bg-green-800" />
                      </Avatar>
                      <div className="ms-4 min-w-0">
                        <h1 className="text-lg font-bold truncate">
                          {user?.employee?.first_name ? `${user.employee.first_name} ${user.employee.last_name || ""}` : (user?.username || "")}
                        </h1>
                        <p className="text-xs text-muted-foreground font-medium">{user?.employee?.role || "Admin"}</p>
                        <p className="text-[11px] text-muted-foreground/80 truncate">@{user?.username}</p>
                      </div>
                    </div>
                    <hr className="my-3 border-border/60" />

                    {/* Edit Profile Menu Item */}
                    <DropdownMenuItem
                      className="mt-2 p-2.5 rounded-xl cursor-pointer hover:bg-muted/60 transition-colors"
                      onSelect={() => setIsEditProfileOpen(true)}
                    >
                      <div className="w-full flex items-center gap-3">
                        <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                          <Pencil className="w-4 h-4" />
                        </span>
                        <div className="flex-1 text-left min-w-0">
                          <span className="text-sm font-semibold block leading-tight">
                            {t("editProfile")}
                          </span>
                          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                            {t("editProfileDesc")}
                          </p>
                        </div>
                      </div>
                    </DropdownMenuItem>

                    {/* Change Password Menu Item */}
                    <DropdownMenuItem
                      className="mt-2 p-2.5 rounded-xl cursor-pointer hover:bg-muted/60 transition-colors"
                      onSelect={() => setIsChangePasswordOpen(true)}
                    >
                      <div className="w-full flex items-center gap-3">
                        <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
                          <KeyRound className="w-4 h-4" />
                        </span>
                        <div className="flex-1 text-left min-w-0">
                          <span className="text-sm font-semibold block leading-tight">
                            {t("changePassword")}
                          </span>
                          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                            {t("changePasswordDesc")}
                          </p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </div>

                  <DropdownMenuItem
                    className="mt-5 rounded-xl bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                    onSelect={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    <button className="text-white w-full py-2 font-medium text-center">
                      {logoutMutation.isPending ? t("loggingOut") : t("logout")}
                    </button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* ── Standalone Edit Profile Dialog (outside DropdownMenu to prevent autoclose on file upload) ── */}
              <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl z-50">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold">{t("editProfileTitle")}</DialogTitle>
                    <DialogDescription>{t("editProfileHint")}</DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleProfileSubmit} className="space-y-4 pt-2">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div 
                        className="relative group cursor-pointer"
                      >
                        <Avatar className="h-24 w-24 ring-4 ring-primary/20 shadow-md">
                          <AvatarImage
                            src={profilePreview || (user?.employee?.profile_path ? `${apiBaseURL}${user.employee.profile_path}` : "")}
                            alt="Profile Upload"
                          />
                          <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                            {getInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <div 
                          className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Camera className="w-6 h-6 text-white" />
                        </div>
                        {(profilePreview || profileFile || user?.employee?.profile_path) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProfileFile(null);
                              setProfilePreview(null);
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            className="absolute -top-1 -right-1 z-20 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1.5 shadow-md transition-all hover:scale-110 cursor-pointer"
                            title="Clear Image"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setProfileFile(file);
                            setProfilePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl text-xs"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Camera className="w-3.5 h-3.5 mr-1.5" />
                          {t("uploadPhoto")}
                        </Button>
                        {(profilePreview || profileFile) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-xl text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => {
                              setProfileFile(null);
                              setProfilePreview(null);
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                          >
                            <X className="w-3.5 h-3.5 mr-1" />
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">{t("firstName")}</Label>
                        <Input
                          value={editFirstName}
                          onChange={(e) => setEditFirstName(e.target.value)}
                          placeholder="First Name"
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">{t("lastName")}</Label>
                        <Input
                          value={editLastName}
                          onChange={(e) => setEditLastName(e.target.value)}
                          placeholder="Last Name"
                          className="rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">{t("username")}</Label>
                      <Input
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        placeholder="Username"
                        className="rounded-xl"
                      />
                    </div>

                    <DialogFooter className="pt-3 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => setIsEditProfileOpen(false)}
                      >
                        {tc("cancel")}
                      </Button>
                      <Button
                        type="submit"
                        className="rounded-xl"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("saving")}
                          </>
                        ) : (
                          t("saveChanges")
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* ── Standalone Change Password Dialog ── */}
              <Dialog 
                open={isChangePasswordOpen} 
                onOpenChange={(open) => {
                  setIsChangePasswordOpen(open);
                  if (!open) {
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmNewPassword("");
                    setShowCurrentPassword(false);
                    setShowNewPassword(false);
                    setShowConfirmNewPassword(false);
                  }
                }}
              >
                <DialogContent className="sm:max-w-md rounded-2xl z-50">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold">{t("changePasswordTitle")}</DialogTitle>
                    <DialogDescription>{t("changePasswordHint")}</DialogDescription>
                  </DialogHeader>
                  {(() => {
                    const isMinLength = newPassword.length >= 8;
                    const hasLetter = /[a-zA-Z]/.test(newPassword);
                    const hasNumber = /[0-9]/.test(newPassword);
                    const hasSymbol = /[^a-zA-Z0-9]/.test(newPassword);
                    const isStrong = isMinLength && hasLetter && hasNumber && hasSymbol;

                    return (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!isStrong) {
                            toast.error(t("pwdCriteriaNotMet"));
                            return;
                          }
                          if (newPassword !== confirmNewPassword) {
                            toast.error(t("pwdMismatch"));
                            return;
                          }
                          changePasswordMutation.mutate({
                            current_password: currentPassword,
                            new_password: newPassword,
                            confirm_password: confirmNewPassword,
                          });
                        }}
                        className="space-y-4 pt-2"
                      >
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">{t("currentPassword")}</Label>
                          <div className="relative">
                            <Input
                              type={showCurrentPassword ? "text" : "password"}
                              value={currentPassword}
                              required
                              placeholder={t("enterPassword")}
                              className="rounded-xl pr-10 h-10"
                              onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-muted transition cursor-pointer flex items-center justify-center"
                              tabIndex={-1}
                            >
                              {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">{t("newPassword")}</Label>
                          <div className="relative">
                            <Input
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              required
                              placeholder={t("enterPassword")}
                              className="rounded-xl pr-10 h-10"
                              onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-muted transition cursor-pointer flex items-center justify-center"
                              tabIndex={-1}
                            >
                              {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>

                          {/* Password Criteria Checklist */}
                          {newPassword.length > 0 && (
                            <div className="grid grid-cols-2 gap-1.5 pt-1.5 px-0.5 text-xs animate-in fade-in duration-200">
                              <div className={`flex items-center gap-1.5 transition-colors ${isMinLength ? "text-emerald-600 font-medium" : "text-muted-foreground/70"}`}>
                                <Check className={`size-3.5 shrink-0 ${isMinLength ? "text-emerald-600" : "opacity-30"}`} />
                                <span>{t("pwdLength")}</span>
                              </div>
                              <div className={`flex items-center gap-1.5 transition-colors ${hasLetter ? "text-emerald-600 font-medium" : "text-muted-foreground/70"}`}>
                                <Check className={`size-3.5 shrink-0 ${hasLetter ? "text-emerald-600" : "opacity-30"}`} />
                                <span>{t("pwdLetter")}</span>
                              </div>
                              <div className={`flex items-center gap-1.5 transition-colors ${hasNumber ? "text-emerald-600 font-medium" : "text-muted-foreground/70"}`}>
                                <Check className={`size-3.5 shrink-0 ${hasNumber ? "text-emerald-600" : "opacity-30"}`} />
                                <span>{t("pwdNumber")}</span>
                              </div>
                              <div className={`flex items-center gap-1.5 transition-colors ${hasSymbol ? "text-emerald-600 font-medium" : "text-muted-foreground/70"}`}>
                                <Check className={`size-3.5 shrink-0 ${hasSymbol ? "text-emerald-600" : "opacity-30"}`} />
                                <span>{t("pwdSymbol")}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">{t("confirmPassword")}</Label>
                          <div className="relative">
                            <Input
                              type={showConfirmNewPassword ? "text" : "password"}
                              value={confirmNewPassword}
                              required
                              placeholder={t("enterPassword")}
                              className="rounded-xl pr-10 h-10"
                              onChange={(e) => setConfirmNewPassword(e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-muted transition cursor-pointer flex items-center justify-center"
                              tabIndex={-1}
                            >
                              {showConfirmNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          {confirmNewPassword.length > 0 && newPassword !== confirmNewPassword && (
                            <p className="text-xs text-rose-500 pt-0.5">{t("pwdMismatch")}</p>
                          )}
                        </div>

                        <DialogFooter className="pt-3 gap-2">
                          <Button
                            type="button"
                            className="rounded-xl"
                            variant="outline"
                            onClick={() => setIsChangePasswordOpen(false)}
                          >
                            {tc("cancel")}
                          </Button>
                          <Button
                            type="submit"
                            className="rounded-xl"
                            disabled={changePasswordMutation.isPending || !isStrong}
                          >
                            {changePasswordMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {tc("submitting")}
                              </>
                            ) : (
                              tc("save")
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    );
                  })()}
                </DialogContent>
              </Dialog>
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
        {(user?.employee?.role === "Admin" || user?.employee?.permissions?.includes("chatbot:access")) && (
          <HRChatbot />
        )}
      </main>
    </div>
  );
}
