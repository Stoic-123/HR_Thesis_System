"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/loading-state";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Edit, RefreshCw, FileText, User, ArrowUpRight, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/routing";
import {
  getLeaveProfiles,
  updateLeaveProfile,
  syncLeaveProfiles,
  getEmployeeLeaveProfiles,
  type LeaveProfile,
} from "@/services/leaveProfile.services";
import { getAllLeaveTypes, type LeaveType } from "@/services/leavetype.services";
import { getAllEmployees, type Employee } from "@/services/employee.services";

function CircularGauge({
  value,
  max,
  label,
  color = "#F59E0B"
}: {
  value: number;
  max: number;
  label?: string;
  color?: string;
}) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} stroke="#E5E7EB" strokeWidth="8" fill="none" />
        <circle
          cx="50" cy="50" r={radius} stroke={color} strokeWidth="8" fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-800">{Math.round(percentage)}%</span>
        {label && <span className="text-sm text-gray-500 font-medium mt-1">{label}</span>}
      </div>
    </div>
  );
}

export default function LeaveProfilePage() {
  const [loading, setLoading] = useState(true);
  const [leaveProfiles, setLeaveProfiles] = useState<LeaveProfile[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedEmployeeProfiles, setSelectedEmployeeProfiles] = useState<LeaveProfile[]>([]);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<LeaveProfile | null>(null);
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null);
  const [editAssignment, setEditAssignment] = useState<string>("");
  const [editBalance, setEditBalance] = useState<string>("");
  const router = useRouter();
  const t = useTranslations("leaveProfile");
  const tc = useTranslations("common");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leaveProfilesData, leaveTypesData, employeesData] = await Promise.all([
        getLeaveProfiles(),
        getAllLeaveTypes(1, 100),
        getAllEmployees(1, 100),
      ]);
      if (leaveProfilesData?.result) setLeaveProfiles(leaveProfilesData.data);
      if (leaveTypesData?.result) setLeaveTypes(leaveTypesData.data);
      if (employeesData?.result) {
        const filteredEmployees = (employeesData.data || []).filter((emp: Employee) => {
          const roleName = (emp.role_name || "").toLowerCase();
          return roleName !== "admin" && roleName !== "superadmin";
        });
        setEmployees(filteredEmployees);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleEmployeeClick = async (employee: Employee) => {
    setSelectedEmployee(employee);
    try {
      const response = await getEmployeeLeaveProfiles(employee.id);
      if (response?.result) setSelectedEmployeeProfiles(response.data);
      else setSelectedEmployeeProfiles([]);
      setIsEmployeeModalOpen(true);
    } catch (error) {
      console.error("Failed to get employee leave profiles", error);
      toast.error(t("loadEmployeeFailed"));
    }
  };

  const handleSync = async (employeeId: number) => {
    try {
      const response = await syncLeaveProfiles(employeeId);
      if (response?.result) {
        toast.success(response.message);
        await fetchData();
        if (selectedEmployee?.id === employeeId) {
          const employeeResponse = await getEmployeeLeaveProfiles(employeeId);
          if (employeeResponse?.result) setSelectedEmployeeProfiles(employeeResponse.data);
        }
      }
    } catch (error) {
      console.error("Failed to sync leave profiles", error);
      toast.error(t("syncFailed"));
    }
  };

  const handleEdit = (profile: LeaveProfile, leaveType: LeaveType) => {
    setEditingProfile(profile);
    setEditingLeaveType(leaveType);
    setEditAssignment(profile.assignment?.toString() || "");
    setEditBalance(profile.balance?.toString() || "");
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingProfile) return;
    try {
      await updateLeaveProfile(editingProfile.id, {
        assignment: parseInt(editAssignment),
        balance: parseInt(editBalance) || parseInt(editAssignment),
      });
      toast.success(t("updated"));
      await fetchData();
      if (selectedEmployee) {
        const employeeResponse = await getEmployeeLeaveProfiles(selectedEmployee.id);
        if (employeeResponse?.result) setSelectedEmployeeProfiles(employeeResponse.data);
      }
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Failed to update leave profile", error);
      toast.error(t("updateFailed"));
    }
  };

  const getEmployeeProfiles = (employeeId: number) => {
    return leaveProfiles.filter(lp => lp.employee_id === employeeId);
  };

  const getProfileImageUrl = (profilePath?: string) => {
    if (!profilePath) return null;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    return `${baseUrl}${profilePath.startsWith('/') ? '' : '/'}${profilePath}`;
  };

  if (loading) return <LoadingState variant="table" count={6} />;

  return (
    <div className="p-6 space-y-6 overflow-x-hidden [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-gray-500">{t("subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {employees.map((employee) => {
          const empProfiles = getEmployeeProfiles(employee.id);
          return (
            <Card
              key={employee.id}
              className="cursor-pointer hover:shadow-xl transition-all duration-200 overflow-hidden border-2 border-gray-100 hover:border-gray-200"
              onClick={() => handleEmployeeClick(employee)}
            >
              <CardHeader className="pb-4">
                <div className="flex gap-4 items-start">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                    {(() => {
                      const imgUrl = getProfileImageUrl(employee.profile_path);
                      if (imgUrl) {
                        return (
                          <img src={imgUrl} alt={employee.first_name} className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        );
                      } else {
                        return <User className="h-10 w-10 text-gray-400" />;
                      }
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl truncate font-semibold text-gray-800">
                      {employee.first_name} {employee.last_name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border border-green-200">
                        {t("passedProbation")}
                      </Badge>
                    </div>
                    {employee.joined_at && (
                      <div className="flex items-center gap-2 mt-2">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <p className="text-sm text-gray-500">
                          {t("joined", { date: employee.joined_at })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pb-4">
                <div className="grid grid-cols-3 gap-3">
                  {leaveTypes.slice(0, 3).map((lt) => {
                    const profile = empProfiles.find(p => p.leave_type_id === lt.id);
                    const used = profile?.used || 0;
                    const assignment = profile?.assignment || 0;
                    return (
                      <div key={lt.id} className="text-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-xs text-gray-500 font-medium truncate mb-1">{lt.code}</p>
                        <div className="flex items-center justify-center gap-1">
                          <span className={`text-lg font-bold ${used > assignment ? 'text-red-600' : 'text-gray-800'}`}>{used}</span>
                          {assignment > 0 && <span className="text-sm text-gray-400">/{assignment}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>

              <CardContent className="pt-0 border-t border-gray-100">
                <Button variant="ghost" size="sm" className="w-full text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-semibold flex items-center justify-center"
                  onClick={(e) => { e.stopPropagation(); handleEmployeeClick(employee); }}>
                  <FileText className="h-4 w-4 mr-2" />
                  {t("profileTab")}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Employee Detail Modal */}
      <Dialog open={isEmployeeModalOpen} onOpenChange={setIsEmployeeModalOpen}>
        <DialogContent className="max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          <DialogHeader className="bg-slate-50 -mx-6 -mt-6 px-8 py-8 rounded-t-lg overflow-hidden">
            <div className="flex items-center gap-8">
              <div className="w-28 h-28 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                {(() => {
                  const imgUrl = getProfileImageUrl(selectedEmployee?.profile_path);
                  if (imgUrl) {
                    return (
                      <img src={imgUrl} alt={selectedEmployee?.first_name} className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    );
                  } else {
                    return <User className="h-14 w-14 text-gray-400" />;
                  }
                })()}
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-3xl font-bold text-gray-800">
                  {selectedEmployee?.first_name} {selectedEmployee?.last_name}
                </DialogTitle>
                <p className="text-lg text-gray-500 mt-1">{t("leaveProfileLabel")}</p>
                <div className="flex items-center gap-4 mt-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600 font-medium">{t("yearLabel")}: {new Date().getFullYear()}</span>
                  </div>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border border-green-200 px-3 py-1">
                    {t("passedProbation")}
                  </Badge>
                  {selectedEmployee?.joined_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 font-medium">
                        {t("joined", { date: selectedEmployee.joined_at })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {selectedEmployeeProfiles.map((profile) => {
              const leaveType = leaveTypes.find(lt => lt.id === profile.leave_type_id);
              const assignment = profile.assignment || 0;
              const used = profile.used || 0;
              const balance = profile.balance || 0;

              return (
                <Card key={profile.id} className="overflow-hidden border border-gray-100 hover:border-gray-200 shadow-sm transition-all rounded-2xl">
                  <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-50 bg-gray-50/50 px-6 py-4">
                    <CardTitle className="text-lg font-bold text-gray-800">
                      {leaveType?.name}
                      <span className="text-xs text-gray-400 font-normal ml-2">({leaveType?.code})</span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl h-8 px-3 border-gray-200 hover:bg-gray-50 text-xs"
                        onClick={() => router.push('/dashboard/leave/report')}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                        {t("viewReport")}
                      </Button>
                      <Button variant="outline" size="sm"
                        className="rounded-xl h-8 px-3 text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:text-amber-700 text-xs font-semibold"
                        onClick={() => handleEdit(profile, leaveType!)}>
                        <Edit className="h-3.5 w-3.5 mr-1.5" />
                        {t("adjust")}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex flex-col xl:flex-row items-start xl:items-center gap-6">
                      <div className="flex-shrink-0 self-center">
                        <CircularGauge value={used} max={assignment} label={t("usedLabel")} />
                      </div>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">{t("entitlement")}</p>
                          <p className="text-2xl font-bold text-gray-900">{assignment}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">{t("usedLabel")}</p>
                          <p className="text-2xl font-bold text-gray-900">{used}</p>
                        </div>
                      </div>
                      <div className="w-full sm:w-auto flex-shrink-0 bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-2xl border border-amber-100 text-center min-w-[130px]">
                        <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-1">{t("balance")}</p>
                        <p className={`text-3xl font-black ${balance < 0 ? 'text-red-600' : 'text-amber-600'}`}>{balance}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {selectedEmployeeProfiles.length === 0 && (
              <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-2xl">
                <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg">{t("noProfiles")}</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-end items-center gap-3 mt-8 pb-4">
            <Button onClick={() => setIsEmployeeModalOpen(false)} className="rounded-xl px-6 bg-gray-900 text-white hover:bg-black font-semibold">
              {tc("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("adjustTitle")} {editingLeaveType?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("assignmentDays")}</label>
              <Input type="number" value={editAssignment} onChange={(e) => setEditAssignment(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("balanceDays")}</label>
              <Input type="number" value={editBalance} onChange={(e) => setEditBalance(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button onClick={handleSaveEdit}>{tc("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
