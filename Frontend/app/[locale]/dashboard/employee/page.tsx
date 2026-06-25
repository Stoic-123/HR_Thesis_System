"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/routing";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { Plus, Filter, Search, Camera, ChevronRight, UsersRound, Sparkles, Loader2, Building2, Activity, X } from "lucide-react";
import { useAllEmployee } from "@/hooks/useEmployee";
import { LoadingState } from "@/components/ui/loading-state";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { getDepartments } from "@/services/department.services";
import { getPositions } from "@/services/position.services";
import { getRoles } from "@/services/role.services";
import { addEmployee } from "@/services/employee.services";
import { smartSearchEmployees } from "@/services/ai.services";
import { useMe } from "@/hooks/useMe";
import { toast } from "sonner";

export default function EmployeePage() {
  const queryClient = useQueryClient();
  const t = useTranslations("employee");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const { data: me } = useMe();
  const company_id = me?.employee?.company_id;

  const [page, setPage] = React.useState(1);
  const [open, setOpen] = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState<string>("all");
  const [filterDept, setFilterDept] = React.useState<string>("all");
  const limit = 8;
  const { data: employee, isLoading, isError } = useAllEmployee(
    page, 
    limit, 
    filterStatus === "all" ? null : filterStatus, 
    filterDept === "all" ? null : filterDept
  );
  const [preview, setPreview] = React.useState("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  // AI Smart Search State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSmartSearch, setIsSmartSearch] = React.useState(false);
  const [smartResults, setSmartResults] = React.useState<any[] | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);

  // Handle URL parameters for AI Search
  React.useEffect(() => {
    const aiSearch = searchParams.get("aiSearch");
    if (aiSearch) {
      setIsSmartSearch(true);
      setSearchQuery(aiSearch);
      
      // Auto-trigger search
      const triggerSearch = async () => {
        setIsSearching(true);
        try {
          const response = await smartSearchEmployees(aiSearch);
          setSmartResults(response.data);
        } catch (error: any) {
          console.error("[Smart Search] Error:", error);
          toast.error(t("smartSearchUnavailable"));
        } finally {
          setIsSearching(false);
        }
      };
      triggerSearch();
    }
  }, [searchParams]);

  const handleSmartSearch = async () => {
    if (!searchQuery.trim()) {
      setSmartResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const response = await smartSearchEmployees(searchQuery);
      setSmartResults(response.data);
    } catch (error: any) {
      console.error("[Smart Search] Error:", error);
      const message = error?.response?.data?.message || t("smartSearchUnavailable");
      toast.error(message);
    } finally {
      setIsSearching(false);
    }
  };

  React.useEffect(() => {
    if (!isSmartSearch) {
      setSmartResults(null);
    }
  }, [isSmartSearch]);

  // Form State
  const [formData, setFormData] = React.useState({
    first_name: "",
    last_name: "",
    age: "",
    gender: "",
    phone_number1: "",
    phone_number2: "",
    email: "",
    address: "",
    department_id: "",
    position_id: "",
    role_id: "",
    telegram_username: "",
    base_salary: "",
    joined_at: new Date().toISOString().split("T")[0],
    is_active: "active",
  });

  const { data: departments } = useQuery({
    queryKey: ["departments", company_id],
    queryFn: () => getDepartments(1, 1, 100), // is_active=1, page=1, limit=100
    enabled: !!company_id,
  });

  const { data: positions } = useQuery({
    queryKey: ["positions", formData.department_id],
    queryFn: () => getPositions(1, 100, Number(formData.department_id)),
    enabled: !!formData.department_id,
  });

  const { data: roles } = useQuery({
    queryKey: ["roles", company_id],
    queryFn: () => getRoles(),
    enabled: !!company_id,
  });

  // Add Employee Mutation
  const addMutation = useMutation({
    mutationFn: (data: FormData) => addEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success(t("employeeAdded"));
      setOpen(false);
      setFormData({
        first_name: "",
        last_name: "",
        age: "",
        gender: "",
        phone_number1: "",
        phone_number2: "",
        email: "",
        address: "",
        department_id: "",
        position_id: "",
        role_id: "",
        telegram_username: "",
        base_salary: "",
        joined_at: new Date().toISOString().split("T")[0],
        is_active: "active",
      });
      setPreview("");
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || tc("error"));
    },
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value);
    });
    if (selectedFile) data.append("profile_path", selectedFile);

    addMutation.mutate(data);
  };
  return (
    <div className="space-y-8 max-w-400 mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-base">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="rounded-2xl gap-2 h-11 px-5 border-white/40 bg-white/40 backdrop-blur-md"
              >
                <Filter className="size-4" />
                {tc("filter")}
                {(filterStatus !== "all" || filterDept !== "all") && (
                  <span className="flex h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4 rounded-xl z-[100]" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Filter className="size-4" />
                    {tc("filter")}
                  </h4>
                  {(filterStatus !== "all" || filterDept !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilterStatus("all");
                        setFilterDept("all");
                        setPage(1);
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{tc("department")}</Label>
                    <Select value={filterDept} onValueChange={(v) => { setFilterDept(v); setPage(1); }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={tc("department")} />
                      </SelectTrigger>
                      <SelectContent className="z-[110]">
                        <SelectItem value="all">{tc("all")}</SelectItem>
                        {departments?.data?.map((dept: any) => (
                          <SelectItem key={dept.id} value={dept.id.toString()}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs">{tc("status")}</Label>
                    <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={tc("status")} />
                      </SelectTrigger>
                      <SelectContent className="z-[110]">
                        <SelectItem value="all">{tc("all")}</SelectItem>
                        <SelectItem value="active">{tc("active")}</SelectItem>
                        <SelectItem value="inactive">{tc("inactive")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl gap-2 h-11 px-6 shadow-lg shadow-primary/20">
                <Plus className="size-4" />
                {t("addEmployee")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-220">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle className="text-2xl">
                    {t("addNewEmployee")}
                  </DialogTitle>
                  <DialogDescription>
                    {t("addEmployeeDesc")}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-center mb-6">
                  <label className="relative cursor-pointer group">
                    <Avatar className="h-34 w-34 border-4 border-white shadow-xl">
                      <AvatarImage src={preview} className="object-cover" />
                      <AvatarFallback className="text-3xl font-bold">
                        U
                      </AvatarFallback>
                    </Avatar>

                    <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <Camera className="h-7 w-7 text-white" />
                    </div>

                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUpload}
                    />
                  </label>
                </div>

                <FieldGroup className="grid grid-cols-2 gap-4 max-h-[330px] p-2 overflow-auto">
                  <Field className="col-span-1">
                    <Label htmlFor="first_name">{t("firstName")}</Label>
                    <Input id="first_name" name="first_name" value={formData.first_name} onChange={handleInputChange} required />
                  </Field>
                  <Field className="col-span-1">
                    <Label htmlFor="last_name">{t("lastName")}</Label>
                    <Input id="last_name" name="last_name" value={formData.last_name} onChange={handleInputChange} required />
                  </Field>
                  <Field className="col-span-1">
                    <Label htmlFor="age">{t("age")}</Label>
                    <Input id="age" name="age" type="number" value={formData.age} onChange={handleInputChange} required />
                  </Field>
                  <Field className="col-span-1">
                    <Label htmlFor="gender">{t("gender")}</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(v) => setFormData({ ...formData, gender: v })}
                    >
                      <SelectTrigger id="gender" className="w-full">
                        <SelectValue placeholder={t("selectGender")} />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[100]">
                        <SelectItem value="male">{t("male")}</SelectItem>
                        <SelectItem value="female">{t("female")}</SelectItem>
                        <SelectItem value="other">{t("other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field className="col-span-1">
                    <Label htmlFor="phone_number1">{t("phone1")}</Label>
                    <Input id="phone_number1" name="phone_number1" value={formData.phone_number1} onChange={handleInputChange} required />
                  </Field>
                  <Field className="col-span-1">
                    <Label htmlFor="phone_number2">{t("phone2")}</Label>
                    <Input id="phone_number2" name="phone_number2" value={formData.phone_number2} onChange={handleInputChange} />
                  </Field>
                  <Field className="col-span-1">
                    <Label htmlFor="email">{tc("email")}</Label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required />
                  </Field>
                  <Field className="col-span-1">
                    <Label htmlFor="address">{t("address")}</Label>
                    <Input id="address" name="address" value={formData.address} onChange={handleInputChange} required />
                  </Field>
                  <Field className="col-span-1">
                    <Label htmlFor="department_id">{tc("department")}</Label>
                    <Select
                      value={formData.department_id}
                      onValueChange={(v) => {
                        setFormData({ ...formData, department_id: v, position_id: "" });
                      }}
                    >
                      <SelectTrigger id="department_id" className="w-full">
                        <SelectValue placeholder={t("selectDepartment")} />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[100]">
                        <SelectGroup>
                          {departments?.data?.map((dept: any) => (
                            <SelectItem key={dept.id} value={dept.id.toString()}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field className="col-span-1">
                    <Label htmlFor="position_id">{tc("position")}</Label>
                    <Select
                      value={formData.position_id}
                      disabled={!formData.department_id}
                      onValueChange={(v) =>
                        setFormData({ ...formData, position_id: v })
                      }
                    >
                      <SelectTrigger id="position_id" className="w-full">
                        <SelectValue
                          placeholder={
                            formData.department_id ? t("selectPosition") : t("selectDepartmentFirst")
                          }
                        />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[100]">
                        <SelectGroup>
                          {positions?.data?.map((pos: any) => (
                            <SelectItem key={pos.id} value={pos.id.toString()}>
                              {pos.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field className="col-span-1">
                    <Label htmlFor="role_id">{t("userRole")}</Label>
                    <Select
                      value={formData.role_id}
                      onValueChange={(v) => setFormData({ ...formData, role_id: v })}
                    >
                      <SelectTrigger id="role_id" className="w-full">
                        <SelectValue placeholder={t("selectRole")} />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[100]">
                        <SelectGroup>
                          {roles?.data?.map((role: any) => (
                            <SelectItem key={role.id} value={role.id.toString()}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field className="col-span-1">
                    <Label htmlFor="telegram_username">{t("telegramUsername")}</Label>
                    <Input id="telegram_username" name="telegram_username" value={formData.telegram_username} onChange={handleInputChange} />
                  </Field>
                  <Field className="col-span-1">
                    <Label htmlFor="base_salary">{t("baseSalary")}</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="base_salary"
                        name="base_salary"
                        type="text"
                        className="pl-7"
                        value={formData.base_salary}
                        onChange={handleInputChange}
                        placeholder={t("baseSalaryPlaceholder")}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{t("baseSalaryHint")}</p>
                  </Field>
                </FieldGroup>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">{tc("cancel")}</Button>
                  </DialogClose>
                  <Button type="submit" disabled={addMutation.isPending}>
                    {addMutation.isPending ? tc("saving") : tc("save")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative w-full lg:max-w-xl flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={isSmartSearch ? t("searchAIDesc") : t("searchByName")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && isSmartSearch && handleSmartSearch()}
              className={cn(
                "h-12 pl-11 pr-12 rounded-2xl border-white/40 bg-white/50 backdrop-blur-xl focus:bg-white/80 transition-all shadow-sm w-full",
                isSmartSearch && "border-primary/40 ring-2 ring-primary/5"
              )}
            />
            {isSmartSearch && (
              <Button 
                onClick={handleSmartSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="absolute right-1 top-1 h-10 w-10 rounded-xl p-0"
              >
                {isSearching ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            onClick={() => setIsSmartSearch(!isSmartSearch)}
            className={cn(
              "rounded-2xl gap-2 h-12 px-4 transition-all",
              isSmartSearch ? "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20" : "bg-white/40 border border-white/40 hover:bg-white/60"
            )}
          >
            <Sparkles className={cn("size-4", isSmartSearch ? "animate-pulse" : "text-primary")} />
            <span className="hidden sm:inline">{t("smartSearch")}</span>
          </Button>
        </div>
        <div className="flex items-center gap-6 ml-auto overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto">
          <StatBadge label={tc("total")} count={employee?.pagination?.total ?? 0} />
          <div className="h-8 w-px bg-white/30 hidden sm:block" />
          <StatBadge
            label={tc("active")}
            count={employee?.pagination?.total_active ?? 0}
            color="text-emerald-600"
          />
          <div className="h-8 w-px bg-white/30 hidden sm:block" />
        </div>
      </div>

      {/* Employee Grid */}
      {isLoading || isSearching ? (
        <LoadingState variant="card" count={limit} />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-64 text-red-500">
          <p>{t("errorLoadingList")}</p>
        </div>
      ) : isSmartSearch && smartResults === null ? (
        <div className="flex flex-col items-center justify-center h-64 bg-primary/5 backdrop-blur-md rounded-[2.5rem] border border-primary/20 shadow-xl border-dashed">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
            <Sparkles className="size-12 text-primary relative" />
          </div>
          <p className="text-xl font-bold text-primary/80 uppercase tracking-tight">{t("aiReady")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("aiReadyDesc")}</p>
        </div>
      ) : (isSmartSearch && smartResults?.length === 0) || (!isSmartSearch && (!employee?.data || employee.data.length === 0)) ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/60 shadow-xl">
          <UsersRound className="size-12 text-muted-foreground/40 mb-4" />
          <p className="text-xl font-bold text-muted-foreground/80">{t("noEmployeesFound")}</p>
          <p className="text-sm text-muted-foreground">{t("noEmployeesDesc")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(smartResults || employee?.data)?.map((e: any) => (
            <Link
              key={e.id}
              href={`/dashboard/employee/${e.id}`}
              className="group"
            >
              <Card className="apple-surface overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 border-white/40 h-full flex flex-col relative">
                {isSmartSearch && e.relevanceScore && (
                  <div className="absolute top-3 right-3 z-10">
                    <div className="bg-primary/10 backdrop-blur-md border border-primary/20 rounded-full px-2 py-1 flex items-center gap-1">
                      <Sparkles className="size-3 text-primary" />
                      <span className="text-[10px] font-bold text-primary">
                        {t("matchPercent", { score: Math.round(e.relevanceScore * 100) })}
                      </span>
                    </div>
                  </div>
                )}
                {e.status !== "active" && (
                  <div className="absolute top-3 left-3 z-10">
                    <Badge variant="destructive" className="bg-rose-500 text-white hover:bg-rose-600 shadow-sm">
                      {tc("inactive")}
                    </Badge>
                  </div>
                )}
                <CardContent className="p-0 flex-1 flex flex-col">
                  <div className="p-6 flex flex-col items-center text-center space-y-5 flex-1">
                    {/* Avatar with Status */}
                    <div className="relative">
                      <div className="h-24 w-24 rounded-[2rem] bg-linear-to-br from-primary/10 to-indigo-500/10 flex items-center justify-center text-primary border border-white/60 shadow-inner overflow-hidden">
                        {e.profile_path ? (
                          <img 
                            src={`${process.env.NEXT_PUBLIC_API_URL}${e.profile_path}`} 
                            alt={e.full_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold tracking-tighter">
                            {e.full_name
                              ? e.full_name
                                  .split(" ")
                                  .map((n: any) => n[0])
                                  .join("")
                              : "UN"}
                          </span>
                        )}
                      </div>
                      <div
                        className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-white flex items-center justify-center ${e.status === "active" ? "bg-emerald-500" : "bg-rose-500"} shadow-sm`}
                      >
                        {e.status === "active" && (
                          <div className="h-2 w-2 rounded-full bg-white/50 animate-pulse" />
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-1">
                      <h3 className="font-bold text-xl tracking-tight text-foreground/90 group-hover:text-primary transition-colors">
                        {e.full_name}
                      </h3>
                      <p className="text-sm font-medium text-primary/80 uppercase tracking-widest text-[10px]">
                        {e.position_name}
                      </p>
                    </div>

                    <div className="w-full h-px bg-linear-to-r from-transparent via-white/40 to-transparent" />

                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
                        <span>{tc("department")}</span>
                        <span className="font-semibold text-foreground/70">
                          {e.department_name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
                        <span>{tc("email")}</span>
                        <span className="font-medium text-foreground/70">
                          {e.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Link */}
                  <div className="px-6 py-4 bg-white/30 border-t border-white/40 flex items-center justify-between group-hover:bg-primary/5 transition-colors mt-auto">
                    <span className="text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                      {t("viewProfile")}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!isSmartSearch && employee?.pagination && employee.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8 pb-10">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-xl border-white/40 bg-white/20 backdrop-blur-sm"
          >
            {tc("previous")}
          </Button>
          <span className="text-sm font-medium text-muted-foreground">
            {tc("page")} <span className="text-foreground font-bold">{page}</span> {tc("of")}{" "}
            <span className="text-foreground font-bold">
              {employee.pagination.totalPages}
            </span>
          </span>
          <Button
            variant="outline"
            onClick={() =>
              setPage((p) => Math.min(employee.pagination.totalPages, p + 1))
            }
            disabled={page === employee.pagination.totalPages}
            className="rounded-xl border-white/40 bg-white/20 backdrop-blur-sm"
          >
            {tc("next")}
          </Button>
        </div>
      )}
    </div>
  );
}

function StatBadge({
  label,
  count,
  color = "text-foreground",
}: {
  label: string;
  count: number;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-start lg:items-center">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-0.5">
        {label}
      </span>
      <span
        className={`text-xl font-black tabular-nums tracking-tight ${color}`}
      >
        {count}
      </span>
    </div>
  );
}
