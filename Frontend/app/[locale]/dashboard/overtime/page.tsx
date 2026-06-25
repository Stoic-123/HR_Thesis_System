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

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getAllOvertimes();
      if (data?.result) {
        setOvertimes(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch overtimes", error);
      toast.error("Failed to load overtime requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const filteredOvertimes =
    filter === "all"
      ? overtimes
      : overtimes.filter((ot) => ot.status === filter);

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{to("employeeLabel")}</TableHead>
                  <TableHead>{to("from")}</TableHead>
                  <TableHead>{to("to")}</TableHead>
                  <TableHead>{to("reason")}</TableHead>
                  <TableHead>{tc("status")}</TableHead>
                  <TableHead>{tc("actions")}</TableHead>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
