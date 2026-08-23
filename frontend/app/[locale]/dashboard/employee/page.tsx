"use client";

import React, { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
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

import { Plus, Filter, Search, Camera, ChevronRight, UsersRound, Sparkles, Loader2, Building2, Activity, X, CreditCard } from "lucide-react";
import { EmployeeCardModal } from "@/components/EmployeeCardModal";
import { AllEmployeeCardsModal } from "@/components/AllEmployeeCardsModal";
import { EmployeeCardData } from "@/components/EmployeeCard";
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
  const locale = useLocale();
  const queryClient = useQueryClient();
  const t = useTranslations("employee");
  const tc = useTranslations("common");
  const tec = useTranslations("employeeCard");
  const searchParams = useSearchParams();
  const { data: me } = useMe();
  const company_id = me?.employee?.company_id;

  const [page, setPage] = React.useState(1);
  const [open, setOpen] = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState<string>("all");
  const [filterDept, setFilterDept] = React.useState<string>("all");
  const limit = 8;

  // Card Modal States
  const [singleCardEmployee, setSingleCardEmployee] = React.useState<EmployeeCardData | null>(null);
  const [isSingleCardOpen, setIsSingleCardOpen] = React.useState(false);
  const [isAllCardsOpen, setIsAllCardsOpen] = React.useState(false);

  // Search State
  const [localSearch, setLocalSearch] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");

  const { data: employee, isLoading, isError } = useAllEmployee(
    page, 
    limit, 
    filterStatus === "all" ? null : filterStatus, 
    filterDept === "all" ? null : filterDept,
    searchQuery.trim() || null
  );
  const [preview, setPreview] = React.useState("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const handleSearchTrigger = () => {
    setSearchQuery(localSearch.trim());
    setPage(1);
  };

  const handleClearSearch = () => {
    setLocalSearch("");
    setSearchQuery("");
    setPage(1);
  };

  // Handle URL parameters for search
  React.useEffect(() => {
    const querySearch = searchParams.get("search") || searchParams.get("aiSearch");
    if (querySearch) {
      setLocalSearch(querySearch);
      setSearchQuery(querySearch);
      setPage(1);
    }
  }, [searchParams]);

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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
      setFormErrors({});
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
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.first_name?.trim()) {
      errs.first_name = locale === "km" ? "សូមបញ្ចូលនាមខ្លួន (First name required)" : "First name is required";
    }
    if (!formData.last_name?.trim()) {
      errs.last_name = locale === "km" ? "សូមបញ្ចូលនាមត្រកូល (Last name required)" : "Last name is required";
    }
    if (!formData.age || parseInt(formData.age) <= 0) {
      errs.age = locale === "km" ? "សូមបញ្ចូលអាយុឱ្យបានត្រឹមត្រូវ" : "Valid age is required";
    }
    if (!formData.gender) {
      errs.gender = locale === "km" ? "សូមជ្រើសរើសភេទ" : "Please select gender";
    }
    if (!formData.phone_number1?.trim()) {
      errs.phone_number1 = locale === "km" ? "សូមបញ្ចូលលេខទូរស័ព្ទ" : "Phone number is required";
    }
    if (!formData.email?.trim()) {
      errs.email = locale === "km" ? "សូមបញ្ចូលអ៊ីមែល" : "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = locale === "km" ? "ទម្រង់អ៊ីមែលមិនត្រឹមត្រូវ" : "Please enter a valid email address";
    }
    if (!formData.address?.trim()) {
      errs.address = locale === "km" ? "សូមបញ្ចូលអាសយដ្ឋាន" : "Address is required";
    }
    if (!formData.department_id) {
      errs.department_id = locale === "km" ? "សូមជ្រើសរើសផ្នែក (Department required)" : "Please select a department";
    }
    if (!formData.position_id) {
      errs.position_id = locale === "km" ? "សូមជ្រើសរើសតួនាទី (Position required)" : "Please select a position";
    }
    if (!formData.role_id) {
      errs.role_id = locale === "km" ? "សូមជ្រើសរើសសិទ្ធិប្រើប្រាស់ (Role required)" : "Please select a user role";
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error(locale === "km" ? "សូមពិនិត្យ និងបំពេញព័ត៌មានដែលចាំបាច់" : "Please fill in all required fields");
      return;
    }
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
          <Button
            variant="outline"
            onClick={() => setIsAllCardsOpen(true)}
            className="rounded-2xl gap-2 h-11 px-5 border-white/40 bg-white/50 backdrop-blur-md hover:bg-white/80 transition-all text-gray-800 font-semibold shadow-sm"
          >
            <CreditCard className="size-4 text-[#F58220]" />
            <span>{tec("generateAllCards")}</span>
          </Button>
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
              <form onSubmit={handleSubmit} noValidate>
                <DialogHeader>
                  <DialogTitle className="text-2xl">
                    {t("addNewEmployee")}
                  </DialogTitle>
                  <DialogDescription>
                    {t("addEmployeeDesc")}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-center mb-6">
                  <div className="relative group">
                    <label className="relative cursor-pointer block">
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
                    {preview && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedFile(null);
                          setPreview("");
                        }}
                        className="absolute -top-1 -right-1 z-20 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1.5 shadow-md transition-all hover:scale-110 cursor-pointer"
                        title="Clear Image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <FieldGroup className="grid grid-cols-2 gap-4 max-h-[330px] p-2 overflow-auto">
                  <Field className="col-span-1">
                    <Label htmlFor="first_name">
                      {t("firstName")} <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className={formErrors.first_name ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                    />
                    {formErrors.first_name && (
                      <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.first_name}</p>
                    )}
                  </Field>
                  <Field className="col-span-1">
                    <Label htmlFor="last_name">
                      {t("lastName")} <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className={formErrors.last_name ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                    />
                    {formErrors.last_name && (
                      <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.last_name}</p>
                    )}
                  </Field>
                  <Field className="col-span-1">
                    <Label htmlFor="age">
                      {t("age")} <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="age"
                      name="age"
                      type="number"
                      value={formData.age}
                      onChange={handleInputChange}
                      className={formErrors.age ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                    />
                    {formErrors.age && (
                      <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.age}</p>
                    )}
                  </Field>
                  <Field className="col-span-1">
                    <Label htmlFor="gender">
                      {t("gender")} <span className="text-rose-500">*</span>
                    </Label>
                    <Select
                      value={formData.gender || undefined}
                      onValueChange={(v) => {
                        setFormData({ ...formData, gender: v });
                        if (formErrors.gender) {
                          setFormErrors((prev) => {
                            const next = { ...prev };
                            delete next.gender;
                            return next;
                          });
                        }
                      }}
                    >
                      <SelectTrigger id="gender" className={`w-full ${formErrors.gender ? "border-rose-500 focus:ring-rose-500" : ""}`}>
                        <SelectValue placeholder={t("selectGender")} />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[100]">
                        <SelectItem value="male">{t("male")}</SelectItem>
                        <SelectItem value="female">{t("female")}</SelectItem>
                        <SelectItem value="other">{t("other")}</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.gender && (
                      <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.gender}</p>
                    )}
                  </Field>
                  <Field className="col-span-1">
                    <Label htmlFor="phone_number1">
                      {t("phone1")} <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="phone_number1"
                      name="phone_number1"
                      value={formData.phone_number1}
                      onChange={handleInputChange}
                      className={formErrors.phone_number1 ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                    />
                    {formErrors.phone_number1 && (
                      <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.phone_number1}</p>
                    )}
                  </Field>
                  <Field className="col-span-1">
                    <Label htmlFor="phone_number2">{t("phone2")}</Label>
                    <Input id="phone_number2" name="phone_number2" value={formData.phone_number2} onChange={handleInputChange} />
                  </Field>
                  <Field className="col-span-1">
                    <Label htmlFor="email">
                      {tc("email")} <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={formErrors.email ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                    />
                    {formErrors.email && (
                      <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.email}</p>
                    )}
                  </Field>
                  <Field className="col-span-1">
                    <Label htmlFor="address">
                      {t("address")} <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className={formErrors.address ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                    />
                    {formErrors.address && (
                      <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.address}</p>
                    )}
                  </Field>
                  <Field className="col-span-1">
                    <Label htmlFor="department_id">
                      {tc("department")} <span className="text-rose-500">*</span>
                    </Label>
                    <Select
                      value={formData.department_id || undefined}
                      onValueChange={(v) => {
                        setFormData({ ...formData, department_id: v, position_id: "" });
                        if (formErrors.department_id) {
                          setFormErrors((prev) => {
                            const next = { ...prev };
                            delete next.department_id;
                            return next;
                          });
                        }
                      }}
                    >
                      <SelectTrigger id="department_id" className={`w-full ${formErrors.department_id ? "border-rose-500 focus:ring-rose-500" : ""}`}>
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
                    {formErrors.department_id && (
                      <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.department_id}</p>
                    )}
                  </Field>
                  <Field className="col-span-1">
                    <Label htmlFor="position_id">
                      {tc("position")} <span className="text-rose-500">*</span>
                    </Label>
                    <Select
                      value={formData.position_id || undefined}
                      disabled={!formData.department_id}
                      onValueChange={(v) => {
                        setFormData({ ...formData, position_id: v });
                        if (formErrors.position_id) {
                          setFormErrors((prev) => {
                            const next = { ...prev };
                            delete next.position_id;
                            return next;
                          });
                        }
                      }}
                    >
                      <SelectTrigger id="position_id" className={`w-full ${formErrors.position_id ? "border-rose-500 focus:ring-rose-500" : ""}`}>
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
                    {formErrors.position_id && (
                      <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.position_id}</p>
                    )}
                  </Field>
                  <Field className="col-span-1">
                    <Label htmlFor="role_id">
                      {t("userRole")} <span className="text-rose-500">*</span>
                    </Label>
                    <Select
                      value={formData.role_id || undefined}
                      onValueChange={(v) => {
                        setFormData({ ...formData, role_id: v });
                        if (formErrors.role_id) {
                          setFormErrors((prev) => {
                            const next = { ...prev };
                            delete next.role_id;
                            return next;
                          });
                        }
                      }}
                    >
                      <SelectTrigger id="role_id" className={`w-full ${formErrors.role_id ? "border-rose-500 focus:ring-rose-500" : ""}`}>
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
                    {formErrors.role_id && (
                      <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.role_id}</p>
                    )}
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
              placeholder={t("searchByName")}
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                if (e.target.value === "") {
                  setSearchQuery("");
                }
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSearchTrigger()}
              className="h-12 pl-11 pr-24 rounded-2xl border-white/40 bg-white/50 backdrop-blur-xl focus:bg-white/80 transition-all shadow-sm w-full"
            />
            {localSearch && (
              <Button 
                variant="ghost"
                onClick={handleClearSearch}
                className="absolute right-12 top-1 h-10 w-10 rounded-xl p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </Button>
            )}
            <Button 
              onClick={handleSearchTrigger}
              className="absolute right-1 top-1 h-10 w-10 rounded-xl p-0 bg-primary hover:bg-primary/90 text-white"
            >
              <Search className="size-4" />
            </Button>
          </div>
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
      {isLoading ? (
        <LoadingState variant="card" count={limit} />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-64 text-red-500">
          <p>{t("errorLoadingList")}</p>
        </div>
      ) : !employee?.data || employee.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/60 shadow-xl">
          <UsersRound className="size-12 text-muted-foreground/40 mb-4" />
          <p className="text-xl font-bold text-muted-foreground/80">{t("noEmployeesFound")}</p>
          <p className="text-sm text-muted-foreground">{t("noEmployeesDesc")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {employee.data.map((e: any) => (
            <Link
              key={e.id}
              href={`/dashboard/employee/${e.id}`}
              className="group"
            >
              <Card className="apple-surface overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 border-white/40 h-full flex flex-col relative">

                {e.status !== "active" && (
                  <div className="absolute top-3 left-3 z-10">
                    <Badge variant="destructive" className="bg-rose-500 text-white hover:bg-rose-600 shadow-sm">
                      {tc("inactive")}
                    </Badge>
                  </div>
                )}
                <CardContent className="p-0 flex-1 flex flex-col">
                  {/* ID Card Action Button */}
                  <div className="absolute top-3 right-3 z-20">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(evt) => {
                        evt.preventDefault();
                        evt.stopPropagation();
                        setSingleCardEmployee(e);
                        setIsSingleCardOpen(true);
                      }}
                      className="h-8 w-8 p-0 rounded-full bg-white/60 backdrop-blur-md hover:bg-[#2575FC] hover:text-white text-gray-700 shadow-sm border border-white/60 transition-all"
                      title="Generate Employee ID Card"
                    >
                      <CreditCard className="size-4" />
                    </Button>
                  </div>

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
      {employee?.pagination && employee.pagination.totalPages > 1 && (
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

      {/* Card Modals */}
      <EmployeeCardModal
        open={isSingleCardOpen}
        onOpenChange={setIsSingleCardOpen}
        employee={singleCardEmployee}
      />

      <AllEmployeeCardsModal
        open={isAllCardsOpen}
        onOpenChange={setIsAllCardsOpen}
        employees={employee?.data || []}
      />
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
