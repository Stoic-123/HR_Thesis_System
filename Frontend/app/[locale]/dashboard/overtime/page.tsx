"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import {
  getAllOvertimes,
  approveOvertime,
  rejectOvertime,
  type Overtime,
} from "@/services/overtime.services";
import { toast } from "sonner";

export default function OvertimePage() {
  const to = useTranslations("overtime");
  const tc = useTranslations("common");
  const [overtimes, setOvertimes] = useState<Overtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getAllOvertimes({
        page,
        limit,
        status: filter,
      });
      if (data?.result) {
        setOvertimes(data.data);
        if (data.pagination) {
          setTotal(data.pagination.total);
          setTotalPages(data.pagination.totalPages);
        }
      }
    } catch (error) {
      console.error("Failed to fetch overtimes", error);
      toast.error("Failed to load overtime requests");
    } finally {
      setLoading(false);
    }
  };

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [filter, page, limit]);

  const handleApprove = async (id: number) => {
    try {
      const res = await approveOvertime(id);
      if (res.result) {
        toast.success(to("approvedSuccess") || "Overtime request approved successfully");
        fetchData();
      } else {
        toast.error(res.message || "Failed to approve overtime request");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to approve overtime request");
    }
  };

  const handleReject = async (id: number) => {
    try {
      const res = await rejectOvertime(id);
      if (res.result) {
        toast.success(to("rejectedSuccess") || "Overtime request rejected successfully");
        fetchData();
      } else {
        toast.error(res.message || "Failed to reject overtime request");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to reject overtime request");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            {to("pending")}
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {to("approved")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            {to("rejected")}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            {to("unknown")}
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredOvertimes = overtimes;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{to("title")}</h1>
          <p className="text-gray-500">{to("subtitle")}</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={to("filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{to("allRequests")}</SelectItem>
            <SelectItem value="pending">{to("pending")}</SelectItem>
            <SelectItem value="approved">{to("approved")}</SelectItem>
            <SelectItem value="rejected">{to("rejected")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{to("overtimeList")}</CardTitle>
          <CardDescription>{to("overtimeListDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState variant="table" count={6} />
          ) : (
            <>
              <div className="max-h-[500px] overflow-y-auto relative">
                <Table>
                  <TableHeader className="sticky top-0 bg-white dark:bg-zinc-950 z-10">
                    <TableRow>
                      <TableHead className="bg-white dark:bg-zinc-950">{to("employeeLabel")}</TableHead>
                      <TableHead className="bg-white dark:bg-zinc-950">{to("from")}</TableHead>
                      <TableHead className="bg-white dark:bg-zinc-950">{to("to")}</TableHead>
                      <TableHead className="bg-white dark:bg-zinc-950">{to("reason")}</TableHead>
                      <TableHead className="bg-white dark:bg-zinc-950">{tc("status")}</TableHead>
                      <TableHead className="bg-white dark:bg-zinc-950">{tc("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {filteredOvertimes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        {to("noRequests")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOvertimes.map((ot) => (
                      <TableRow key={ot.id}>
                        <TableCell className="font-medium">
                          {ot.employee_overtime_employee_idToemployee
                            ? `${ot.employee_overtime_employee_idToemployee.first_name} ${ot.employee_overtime_employee_idToemployee.last_name}`
                            : ot.employee_id
                            ? `Employee #${ot.employee_id}`
                            : "Unknown Employee"}
                        </TableCell>
                        <TableCell>{formatDate(ot.start_date)}</TableCell>
                        <TableCell>{formatDate(ot.end_date)}</TableCell>
                        <TableCell>{ot.reason || to("noReason")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(ot.status)}
                            {getStatusBadge(ot.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {ot.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => handleApprove(ot.id)}
                              >
                                {to("approve")}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(ot.id)}
                              >
                                {to("reject")}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

              {/* Pagination Controls */}
              {overtimes.length > 0 && (
                <div className="flex items-center justify-between border-t border-border/30 px-2 py-4 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">បង្ហាញ / Show:</span>
                    <Select
                      value={String(limit)}
                      onValueChange={(val) => {
                        setLimit(Number(val));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[85px] h-8 rounded-xl shadow-sm">
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
                      ជួរក្នុងមួយទំព័រ / Rows per page
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-xl shadow-sm text-xs font-medium cursor-pointer"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      {tc("previous")}
                    </Button>
                    <span className="text-xs text-muted-foreground font-semibold px-2">
                      {tc("page")} {page} {tc("of")} {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-xl shadow-sm text-xs font-medium cursor-pointer"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      {tc("next")}
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
