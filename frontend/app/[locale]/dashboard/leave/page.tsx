"use client";

import React, { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import { CalendarRange, Search } from "lucide-react";
import { getAllLeaves, approveLeave, rejectLeave } from "@/services/leave.services";
import { toast } from "sonner";

interface LeaveRequest {
  id: number;
  employee: string;
  type: string;
  from: string;
  to: string;
  status: "pending" | "approved" | "rejected";
  department: string | null;
  department_id: number | null;
}

interface Department {
  id: number;
  name: string;
}

export default function LeavePage() {
  const tl = useTranslations("leave");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return tl("pending") || "Pending";
      case "approved":
        return tl("approved") || "Approved";
      case "rejected":
        return tl("rejected") || "Rejected";
      default:
        return status;
    }
  };

  const initials = (name: string) =>
    (name || "")
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(locale === "km" ? "km-KH" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await getAllLeaves();
      if (res.result) {
        setLeaves(res.data || []);
        if (res.departments) {
          setDepartments(res.departments);
        }
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

  // Filter logic
  const filteredLeaves = leaves.filter((r) => {
    // Status Filter
    if (statusFilter !== "all" && r.status !== statusFilter) {
      return false;
    }

    // Department Filter
    if (departmentFilter !== "all") {
      if (String(r.department_id) !== departmentFilter && r.department !== departmentFilter) {
        return false;
      }
    }

    // Search Query
    if (searchFilter.trim() !== "") {
      const query = searchFilter.toLowerCase();
      const matchEmp = r.employee?.toLowerCase().includes(query);
      const matchDept = r.department?.toLowerCase().includes(query);
      const matchType = r.type?.toLowerCase().includes(query);
      if (!matchEmp && !matchDept && !matchType) return false;
    }

    return true;
  });

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchFilter, departmentFilter, statusFilter]);

  // Pagination calculations
  const totalItems = filteredLeaves.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const paginatedLeaves = filteredLeaves.slice((page - 1) * limit, page * limit);

  const handleApprove = async (id: number) => {
    try {
      const res = await approveLeave(id);
      if (res.result) {
        toast.success(tl("approvedSuccess") || "Leave request approved successfully");
        fetchLeaves();
      } else {
        toast.error(res.message || "Failed to approve leave request");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to approve leave request");
    }
  };

  const handleReject = async (id: number) => {
    try {
      const res = await rejectLeave(id);
      if (res.result) {
        toast.success(tl("rejectedSuccess") || "Leave request rejected successfully");
        fetchLeaves();
      } else {
        toast.error(res.message || "Failed to reject leave request");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to reject leave request");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {tl("title") || "Leave"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {tl("subtitle") || "Manage employee leave requests."}
        </p>
      </div>

      {/* Main Table Card */}
      <Card className="rounded-3xl border border-border/60 bg-primary-foreground shadow-sm">
        <CardHeader className="flex-row items-center justify-between pb-3 px-6">
          <div>
            <CardTitle>{tl("leaveRequests") || "Leave Requests"}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {locale === "km"
                ? `បង្ហាញសំណើឈប់សម្រាកចំនួន ${totalItems} នៅក្នុងបញ្ជី`
                : `Showing ${totalItems} leave requests in the list`}
            </p>
          </div>
          <Badge className="rounded-full bg-primary/10 text-primary">
            {locale === "km" ? "បញ្ជីសំណើ" : "Requests List"}
          </Badge>
        </CardHeader>

        {/* Filter Controls Bar */}
        <div className="px-6 py-3 border-b border-border/40 flex flex-col sm:flex-row gap-3 items-center justify-between bg-muted/10">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center flex-1">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={tl("searchByName") || "Search by employee name..."}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9 h-9 rounded-xl text-xs bg-background border-border/60 shadow-xs"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-9 rounded-xl text-xs bg-background border-border/60 shadow-xs">
                <SelectValue placeholder={tl("selectDepartment") || "Department"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {locale === "km" ? "គ្រប់ផ្នែក (ទាំងអស់)" : "All Departments"}
                </SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px] h-9 rounded-xl text-xs bg-background border-border/60 shadow-xs">
                <SelectValue placeholder={tc("status") || "Status"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {locale === "km" ? "ស្ថានភាពទាំងអស់" : "All Status"}
                </SelectItem>
                <SelectItem value="pending">{tl("pending") || "Pending"}</SelectItem>
                <SelectItem value="approved">{tl("approved") || "Approved"}</SelectItem>
                <SelectItem value="rejected">{tl("rejected") || "Rejected"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-8 px-6">
              <LoadingState variant="table" count={5} />
            </div>
          ) : paginatedLeaves.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center justify-center px-6">
              <div className="rounded-full bg-muted p-4 mb-4">
                <CalendarRange className="size-8 text-muted-foreground" />
              </div>
              <p className="font-semibold text-gray-700 dark:text-zinc-300">
                {locale === "km" ? "រកមិនឃើញទិន្នន័យទេ" : "No records found"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {locale === "km"
                  ? "សូមជ្រើសរើសតម្រងផ្សេងទៀត។"
                  : "Please select a different filter criteria."}
              </p>
            </div>
          ) : (
            <>
              {/* Table Container with identical max-height and custom scrollbar */}
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                <table className="w-full min-w-[700px] text-sm border-collapse text-left">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/20 border-b border-border/50">
                      <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 pl-6 pr-4 border-b border-border/50">
                        {tl("employee") || "Employee"}
                      </th>
                      <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 px-4 border-b border-border/50">
                        {tl("department") || "Department"}
                      </th>
                      <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 px-4 border-b border-border/50 text-center">
                        {tl("type") || "Type"}
                      </th>
                      <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 px-4 border-b border-border/50 text-center">
                        {tl("from") || "From"}
                      </th>
                      <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 px-4 border-b border-border/50 text-center">
                        {tl("to") || "To"}
                      </th>
                      <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 px-4 border-b border-border/50 text-center">
                        {tc("status") || "Status"}
                      </th>
                      <th className="sticky top-0 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-md z-10 py-3 pl-4 pr-6 border-b border-border/50 text-right">
                        {tc("actions") || "Actions"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {paginatedLeaves.map((row) => (
                      <tr key={row.id} className="group transition-colors hover:bg-muted/40">
                        {/* Employee Column */}
                        <td className="py-3.5 pl-6 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {initials(row.employee)}
                            </div>
                            <span className="font-medium leading-tight">{row.employee}</span>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-4 text-muted-foreground text-xs font-medium">
                          {row.department || tl("noDepartment") || "No Department"}
                        </td>

                        {/* Type */}
                        <td className="py-3.5 px-4 text-center">
                          <Badge variant="outline" className="font-medium bg-background">
                            {row.type}
                          </Badge>
                        </td>

                        {/* From Date */}
                        <td className="py-3.5 px-4 text-center text-muted-foreground text-xs">
                          {formatDate(row.from)}
                        </td>

                        {/* To Date */}
                        <td className="py-3.5 px-4 text-center text-muted-foreground text-xs">
                          {formatDate(row.to)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <Badge
                            className={`rounded-full px-2.5 py-0.5 border font-semibold text-xs ${
                              row.status === "approved"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900"
                                : row.status === "pending"
                                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900"
                                : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900"
                            }`}
                          >
                            {getStatusLabel(row.status)}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 pl-4 pr-6 text-right">
                          {row.status === "pending" ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                className="rounded-xl h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-medium cursor-pointer"
                                onClick={() => handleApprove(row.id)}
                              >
                                {tl("approve") || "Approve"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl h-8 px-3 text-xs border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/30 shadow-xs font-medium cursor-pointer"
                                onClick={() => handleReject(row.id)}
                              >
                                {tl("reject") || "Reject"}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground pr-2">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/30 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Select
                      value={String(limit)}
                      onValueChange={(val) => {
                        setLimit(Number(val));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[80px] h-8 rounded-xl shadow-xs">
                        <SelectValue placeholder="10" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">
                      {locale === "km" ? "ជួរក្នុងមួយទំព័រ" : "Rows per page"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-xl shadow-xs text-xs font-medium cursor-pointer"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      {tc("previous") || "មុន"}
                    </Button>
                    <span className="text-xs text-muted-foreground font-semibold px-2">
                      {tc("page") || "ទំព័រ"} {page} {tc("of") || "នៃ"} {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-xl shadow-xs text-xs font-medium cursor-pointer"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      {tc("next") || "បន្ទាប់"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
