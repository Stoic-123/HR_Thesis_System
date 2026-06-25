"use client";
import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState<string>("");

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return tl("pending");
      case "approved": return tl("approved");
      case "rejected": return tl("rejected");
      default: return status;
    }
  };

  const fetchLeaves = async () => {
    try {
      const params: { department_id?: string; search?: string } = {};
      if (departmentFilter !== "all") {
        params.department_id = departmentFilter;
      }
      if (searchFilter) {
        params.search = searchFilter;
      }
      
      const res = await getAllLeaves(params);
      if (res.result) {
        setLeaves(res.data);
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
  }, [departmentFilter, searchFilter]);

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{tl("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {tl("subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle>{tl("leaveRequests")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder={tl("searchByName")}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="max-w-xs"
            />
            <Select
              value={departmentFilter}
              onValueChange={setDepartmentFilter}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={tl("selectDepartment")} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{tc("all")}</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8">{tc("loading")}</div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/35">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      {tl("employee")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      {tl("department")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      {tl("type")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      {tl("from")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      {tl("to")}
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
                  {leaves.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        {tl("noRequests")}
                      </td>
                    </tr>
                  ) : (
                    leaves.map((r) => (
                      <tr key={r.id} className="border-b border-white/30 last:border-0 hover:bg-white/5">
                        <td className="px-4 py-3 font-semibold">{r.employee}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {r.department || tl("noDepartment")}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{r.type}</td>
                        <td className="px-4 py-3">{r.from}</td>
                        <td className="px-4 py-3">{r.to}</td>
                        <td className="px-4 py-3">
                          <Badge
                            className={`rounded-full ${
                              r.status === "approved"
                                ? "bg-emerald-50 text-emerald-700"
                                : r.status === "pending"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {getStatusLabel(r.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {r.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => handleApprove(r.id)}
                              >
                                {tl("approve")}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(r.id)}
                              >
                                {tl("reject")}
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
