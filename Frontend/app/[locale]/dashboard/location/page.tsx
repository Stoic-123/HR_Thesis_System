"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useLocations } from "@/hooks/useLocation";
import { useEmployeeLocations } from "@/hooks/useEmployeeLocation";
import {
  assignEmployeeLocations,
  EmployeeLocationData,
  LocationData,
} from "@/services/location.services";
import { toast } from "sonner";
import { LoadingState } from "@/components/ui/loading-state";
import {
  MapPin,
  Search,
  Check,
  Loader2,
  Edit2,
  Users,
  Building2,
  X,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


export const LocationPage = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("location");
  const tc = useTranslations("common");
  const { data: locationsRes, isLoading: isLocationsLoading } = useLocations();
  const { data: employeeLocsRes, isLoading: isEmployeeLocsLoading } = useEmployeeLocations();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeLocationData | null>(null);
  const [primaryLocationId, setPrimaryLocationId] = useState<string>("none");
  const [secondaryLocationIds, setSecondaryLocationIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const locations = locationsRes?.data || [];
  const employeeLocations = employeeLocsRes?.data || [];

  // Mutation
  const assignMutation = useMutation({
    mutationFn: (data: {
      employee_id: number;
      location_id: number | null;
      secondary_location_ids: number[];
    }) => assignEmployeeLocations(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeeLocations"] });
      toast.success(t("updateSuccess"));
      setIsDialogOpen(false);
      setSelectedEmployee(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || tc("error"));
    },
  });

  const getEmployeeInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
  };

  const handleEditClick = (emp: EmployeeLocationData) => {
    setSelectedEmployee(emp);
    setPrimaryLocationId(emp.location_id ? String(emp.location_id) : "none");
    setSecondaryLocationIds(emp.secondary_locations.map((loc) => loc.id));
    setIsDialogOpen(true);
  };

  const handleSecondaryToggle = (locId: number, checked: boolean) => {
    if (checked) {
      setSecondaryLocationIds([...secondaryLocationIds, locId]);
    } else {
      setSecondaryLocationIds(secondaryLocationIds.filter((id) => id !== locId));
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const locationId = primaryLocationId === "none" ? null : parseInt(primaryLocationId);
    
    // Filter secondary locations to make sure primary is not duplicate
    const filteredSecondaryIds = secondaryLocationIds.filter((id) => id !== locationId);

    assignMutation.mutate({
      employee_id: selectedEmployee.id,
      location_id: locationId,
      secondary_location_ids: filteredSecondaryIds,
    });
  };

  const filteredEmployees = employeeLocations.filter((emp: EmployeeLocationData) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      emp.full_name.toLowerCase().includes(query) ||
      (emp.email && emp.email.toLowerCase().includes(query)) ||
      (emp.department_name && emp.department_name.toLowerCase().includes(query)) ||
      (emp.position_name && emp.position_name.toLowerCase().includes(query))
    );
  });

  if (isLocationsLoading || isEmployeeLocsLoading) {
    return <LoadingState variant="table" count={5} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/dashboard/company"
            className="inline-flex items-center gap-2 text-xs text-primary hover:underline font-bold bg-primary/5 px-4 h-11 rounded-2xl border border-primary/10 transition-colors"
          >
            <Building2 size={14} />
            {t("manageCompanyLocations")}
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      <Card className="border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl rounded-3xl">
        <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-gray-800">{t("employeeLocationList")}</CardTitle>
            <CardDescription>
              {t("employeeLocationDesc")}
            </CardDescription>
          </div>
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="pl-9 pr-4 h-10 rounded-2xl border-white/80 bg-white/60 focus:bg-white text-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
            <table className="w-full text-sm min-w-[1000px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-left text-gray-600 font-semibold">
                  <th className="px-6 py-4">{t("employee")}</th>
                  <th className="px-6 py-4">{t("deptAndPosition")}</th>
                  <th className="px-6 py-4">{t("primaryLocation")}</th>
                  <th className="px-6 py-4">{t("secondaryLocations")}</th>
                  <th className="px-6 py-4 text-right">{tc("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp: EmployeeLocationData) => (
                  <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50/50 last:border-0 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-2xl border border-gray-100 shadow-sm">
                          <AvatarImage
                            src={
                              emp.profile_path
                                ? `${process.env.NEXT_PUBLIC_API_URL}${emp.profile_path}`
                                : undefined
                            }
                            alt={emp.full_name}
                          />
                          <AvatarFallback className="font-bold text-xs bg-gradient-to-br from-primary/10 to-indigo-500/10 text-primary">
                            {getEmployeeInitials(emp.first_name, emp.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-gray-900">{emp.full_name}</div>
                          <div className="text-xs text-muted-foreground">{emp.email || tc("noEmail")}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">{emp.department_name || <span className="text-gray-300">-</span>}</div>
                      <div className="text-xs text-muted-foreground">{emp.position_name || <span className="text-gray-300">-</span>}</div>
                    </td>
                    <td className="px-6 py-4">
                      {emp.primary_location ? (
                        <Badge className="bg-primary text-white hover:bg-primary gap-1 font-bold border border-primary/20 rounded-full px-3 py-1 shadow-sm shadow-primary/10">
                          <MapPin size={12} />
                          {emp.primary_location.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/40 italic text-xs">{tc("notSet")}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-sm">
                        {emp.secondary_locations.map((loc) => (
                          <Badge
                            key={loc.id}
                            variant="secondary"
                            className="bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                          >
                            {loc.name}
                          </Badge>
                        ))}
                        {emp.secondary_locations.length === 0 && (
                          <span className="text-muted-foreground/30 text-xs italic">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(emp)}
                        className="rounded-xl hover:bg-primary/5 text-primary hover:text-primary gap-1.5 h-9 px-3 border border-transparent hover:border-primary/20 transition-all font-bold"
                      >
                        <Edit2 size={13} />
                        {t("setLocation")}
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="h-36 text-center text-muted-foreground italic">
                      <div className="flex flex-col items-center justify-center space-y-2 py-6">
                        <Users size={24} className="text-muted-foreground/20" />
                        <span>{t("noEmployees")}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Location Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedEmployee(null);
        }}
      >
        <DialogContent className="sm:max-w-md border-white/60 bg-white/95 shadow-2xl backdrop-blur-xl rounded-3xl">
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <MapPin className="size-5 text-primary animate-pulse" />
                {t("setLocationFor")}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {t("setLocationDesc", { name: selectedEmployee?.full_name || "" })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-5">
              {/* Primary Location Select */}
              <div className="space-y-2">
                <Label htmlFor="primary-location" className="text-sm font-bold text-gray-700">
                  {t("primaryLabel")} <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={primaryLocationId}
                  onValueChange={setPrimaryLocationId}
                >
                  <SelectTrigger id="primary-location" className="w-full h-11 rounded-xl border-gray-200">
                    <SelectValue placeholder={t("selectPrimary")} />
                  </SelectTrigger>
                  <SelectContent className="z-[150] rounded-xl">
                    <SelectGroup>
                      <SelectItem value="none" className="font-semibold text-rose-500">
                        {t("noPrimary")}
                      </SelectItem>
                      {locations.map((loc: LocationData) => (
                        <SelectItem key={loc.id} value={String(loc.id)}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  {t("primaryHint")}
                </p>
              </div>

              {/* Secondary Locations Checkbox List */}
              <div className="space-y-2.5">
                <Label className="text-sm font-bold text-gray-700">
                  {t("secondaryLabel")}
                </Label>
                <div className="border border-gray-100 rounded-2xl bg-gray-50/50 p-4 max-h-[200px] overflow-y-auto space-y-3 shadow-inner">
                  {locations
                    .filter((loc: LocationData) => String(loc.id) !== primaryLocationId)
                    .map((loc: LocationData) => {
                      const isChecked = secondaryLocationIds.includes(loc.id!);
                      return (
                        <div
                          key={loc.id}
                          className={`flex items-center space-x-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? "bg-white border-primary/20 shadow-sm"
                              : "border-transparent hover:bg-gray-100/50"
                          }`}
                          onClick={() => handleSecondaryToggle(loc.id!, !isChecked)}
                        >
                          <input
                            type="checkbox"
                            id={`sec-${loc.id}`}
                            checked={isChecked}
                            onChange={(e) => handleSecondaryToggle(loc.id!, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4.5 w-4.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                          />
                          <div className="flex-1 select-none">
                            <label
                              htmlFor={`sec-${loc.id}`}
                              className="text-sm font-semibold text-gray-800 cursor-pointer block"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {loc.name}
                            </label>
                            {loc.radius && (
                              <span className="text-[10px] text-muted-foreground">
                                {t("radiusInfo", { radius: loc.radius })}
                              </span>
                            )}
                          </div>
                          <MapPin size={14} className={isChecked ? "text-primary" : "text-gray-300"} />
                        </div>
                      );
                    })}

                  {locations.filter((loc: LocationData) => String(loc.id) !== primaryLocationId).length === 0 && (
                    <div className="text-center py-6 text-xs text-muted-foreground italic">
                      {t("noOtherLocations")}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  {t("secondaryHint")}
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="rounded-2xl">
                  {tc("cancel")}
                </Button>
              </DialogClose>
              <Button
                type="submit"
                className="rounded-2xl gap-2 shadow-lg shadow-primary/10 px-6 bg-primary text-white"
                disabled={assignMutation.isPending}
              >
                {assignMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {tc("saving")}
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    {tc("save")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Redirect component for standalone page access
import { useEffect } from "react";
import { useRouter } from "@/src/i18n/routing";

const LocationRedirectPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/time-attendance/setup");
  }, [router]);

  return null;
};

export default LocationRedirectPage;
