"use client";
import React, { useState, useEffect } from "react";
import { Link, useRouter } from "@/src/i18n/routing";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  ShieldCheck,
  User,
  Edit3,
  Trash2,
  Globe,
  DollarSign,
  Clock,
  Hash,
  Heart,
  Baby,
  ShieldAlert,
  Navigation,
  FileText,
  Download,
  Plus,
  Upload,
  Camera,
  Scan,
  X,
  Loader2,
  Eye,
  ExternalLink,
} from "lucide-react";
import { ScannerDialog } from "@/components/ScannerDialog";
import { scanDocument } from "@/services/scanner.services";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Field,
  FieldGroup,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { updateEmployee, uploadDocument, deleteEmployee, deleteDocument } from "@/services/employee.services";
import { getDepartments } from "@/services/department.services";
import { getPositions } from "@/services/position.services";
import { getRoles } from "@/services/role.services";
import { getDocumentTypes } from "@/services/document.services";
import { useEmployee } from "@/hooks/useEmployee";
import { useMe } from "@/hooks/useMe";
import { toast } from "sonner";
import { LoadingState } from "@/components/ui/loading-state";

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const t = useTranslations("employeeProfile");
  const te = useTranslations("employee");
  const tc = useTranslations("common");
  const employeeId = id as string;
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const company_id = me?.employee?.company_id;

  const [isMounted, setIsMounted] = useState(false);
  const { data: emp, isLoading, isError } = useEmployee(employeeId);
  const employee = emp?.data;
  
  const [imgError, setImgError] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDocDialogOpen, setIsDocDialogOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ name: string; path: string } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  // Edit Form State
  const [formData, setFormData] = useState({
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
    is_active: "active",
    joined_at: "",
    // Relationship Info
    relationship_status: "single",
    partner_name: "",
    partner_age: "",
    partner_occupation: "",
    total_children: "0",
    total_sons: "0",
    total_daughters: "0",
    // Family Info
    father_name: "",
    father_age: "",
    father_live_status: "alive",
    mother_name: "",
    mother_age: "",
    mother_live_status: "alive",
    // Emergency Contact
    guardian_name: "",
    guardian_relationship: "",
    guardian_phone_number: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");

  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreview, setDocPreview] = useState<string | null>(null);
  const [docTypeId, setDocTypeId] = useState<string>("");

  // Add keyframes for the loading animation
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes loading {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(300%); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch Data for Dropdowns
  const { data: departments } = useQuery({
    queryKey: ["departments", company_id],
    queryFn: () => getDepartments(1, 1, 100),
    enabled: !!company_id && isEditDialogOpen,
  });

  const { data: positions } = useQuery({
    queryKey: ["positions", formData.department_id],
    queryFn: () => getPositions(1, 100, Number(formData.department_id)),
    enabled: !!formData.department_id && isEditDialogOpen,
  });

  const { data: roles } = useQuery({
    queryKey: ["roles", company_id],
    queryFn: () => getRoles(),
    enabled: !!company_id && isEditDialogOpen,
  });

  const { data: documentTypes } = useQuery({
    queryKey: ["document-types"],
    queryFn: () => getDocumentTypes(),
    enabled: isDocDialogOpen,
  });

  // Prefill form when opening dialog
  const handleOpenEdit = () => {
    if (employee) {
      setFormData({
        first_name: employee.first_name || "",
        last_name: employee.last_name || "",
        age: employee.age?.toString() || "",
        gender: employee.gender || "",
        phone_number1: employee.phone_number1 || "",
        phone_number2: employee.phone_number2 || "",
        email: employee.email || "",
        address: employee.address || "",
        department_id: employee.department_id?.toString() || "",
        position_id: employee.position_id?.toString() || "",
        role_id: employee.role_id?.toString() || "",
        telegram_username: employee.telegram_username || "",
        base_salary: employee.base_salary != null ? String(employee.base_salary) : "",
        is_active: employee.status || "active",
        joined_at: employee.joined_at || "",
        // Relationship Info
        relationship_status: employee.relationship_info?.relationship_status || "single",
        partner_name: employee.relationship_info?.partner_name || "",
        partner_age: employee.relationship_info?.partner_age?.toString() || "",
        partner_occupation: employee.relationship_info?.partner_occupation || "",
        total_children: employee.relationship_info?.total_children?.toString() || "0",
        total_sons: employee.relationship_info?.total_sons?.toString() || "0",
        total_daughters: employee.relationship_info?.total_daughters?.toString() || "0",
        // Family Info
        father_name: employee.family_info?.father_name || "",
        father_age: employee.family_info?.father_age?.toString() || "",
        father_live_status: employee.family_info?.father_live_status || "alive",
        mother_name: employee.family_info?.mother_name || "",
        mother_age: employee.family_info?.mother_age?.toString() || "",
        mother_live_status: employee.family_info?.mother_live_status || "alive",
        // Guardian Info
        guardian_name: employee.guardian_info?.guardian_name || "",
        guardian_relationship: employee.guardian_info?.guardian_relationship || "",
        guardian_phone_number: employee.guardian_info?.guardian_phone_number || "",
      });
      setPreview(employee.profile_path ? `${process.env.NEXT_PUBLIC_API_URL}${employee.profile_path}` : "");
      setIsEditDialogOpen(true);
    }
  };

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => updateEmployee(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emp", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success(t("updateSuccess"));
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t("updateError"));
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: (data: FormData) => uploadDocument(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emp", employeeId] });
      toast.success("បានអាប់ឡូដឯកសារ");
      setIsDocDialogOpen(false);
      setDocFile(null);
      setDocPreview(null);
      setDocTypeId("");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "មិនអាចអាប់ឡូដឯកសារបានទេ");
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => deleteDocument(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emp", employeeId] });
      toast.success("បានលុបឯកសារ");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "មិនអាចលុបឯកសារបានទេ");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteEmployee(employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("បានលុបបុគ្គលិក");
      router.push("/dashboard/employee");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "មិនអាចលុបបុគ្គលិកបានទេ");
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value);
    });
    if (selectedFile) data.append("profile_path", selectedFile);
    updateMutation.mutate(data);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // If it's an image, try auto-scanning
    if (file.type.startsWith("image/")) {
      setIsScanning(true);
      try {
        const scannedBlob = await scanDocument(file, docTypeId);
        const scannedFile = new File([scannedBlob], file.name, { type: "image/jpeg" });
        setDocFile(scannedFile);
        setDocPreview(URL.createObjectURL(scannedBlob));
        toast.success("ស្កេនដោយ AI រួចរាល់!");
      } catch (error: any) {
        console.error("Auto-scan failed:", error);
        
        let customMessage = "";
        try {
          if (error.response?.data) {
            const errText = await error.response.data.text();
            const errObj = JSON.parse(errText);
            customMessage = errObj.message;
          }
        } catch (e) {
          console.error("Failed to parse error blob", e);
        }

        if (customMessage) {
          toast.error(customMessage);
          setDocFile(null);
          setDocPreview(null);
          e.target.value = "";
        } else {
          setDocFile(file); // Fallback to original file
          setDocPreview(URL.createObjectURL(file));
          toast.error("ស្កេន AI បរាជ័យ កំពុងប្រើរូបដើម");
        }
      } finally {
        setIsScanning(false);
      }
    } else {
      setDocFile(file);
      if (file.type === "application/pdf") {
        setDocPreview(null); // No preview for PDF yet
      }
    }
  };

  const handleDocUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile || !docTypeId) {
      toast.error("សូមជ្រើសរើសឯកសារ និងប្រភេទឯកសារ");
      return;
    }
    const data = new FormData();
    data.append("document", docFile);
    data.append("document_type_id", docTypeId);
    uploadDocMutation.mutate(data);
  };

  const handleDelete = () => {
    const trimmed = deleteConfirmText.trim();
    const normalized = trimmed.toLowerCase();
    if (trimmed !== tc("delete") && normalized !== "delete") return;
    deleteMutation.mutate();
    setIsDeleteDialogOpen(false);
    setDeleteConfirmText("");
  };
  
  if (!isMounted) return null;
  
  if (isLoading) return <LoadingState variant="profile" />;
  if (isError || !employee) return (
    <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
      <ShieldAlert className="size-16 text-rose-500" />
      <h2 className="text-2xl font-bold">{t("notFound")}</h2>
      <p className="text-muted-foreground">{t("notFoundDesc")}</p>
      <Link href="/dashboard/employee">
        <Button className="rounded-2xl">{t("backToList")}</Button>
      </Link>
    </div>
  );

  const fullName = employee.full_name || `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || "បុគ្គលិក (មិនមានឈ្មោះ)";

  if (isEditDialogOpen) {
    return (
      <div className="space-y-8 max-w-400 mx-auto pb-12">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setIsEditDialogOpen(false)}
            className="rounded-2xl gap-2 h-10 px-4 hover:bg-white/40 group"
          >
            <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
            បោះបង់ការកែប្រែ
          </Button>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleUpdateSubmit}
              disabled={updateMutation.isPending}
              className="rounded-2xl gap-2 h-10 px-6 shadow-lg shadow-primary/20"
            >
              <ShieldCheck className="size-4" />
              {updateMutation.isPending ? tc("saving") : t("saveChanges")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Avatar & Basic Info */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="apple-surface border-white/40 pt-12">
              <CardContent className="flex flex-col items-center text-center space-y-6 pb-10">
                <div className="relative inline-block w-40 h-40">
                  <label className="relative cursor-pointer group flex h-full w-full">
                    <Avatar className="h-full w-full border-4 border-white shadow-2xl">
                      <AvatarImage src={preview} className="object-cover" crossOrigin="anonymous" />
                      <AvatarFallback className="text-4xl font-bold">
                        {formData.first_name?.[0]}{formData.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <Camera className="h-10 w-10 text-white" />
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>

                <div className="w-full space-y-4 px-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-left">
                      <Label>{t("firstName")}</Label>
                      <Input name="first_name" value={formData.first_name} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2 text-left">
                      <Label>{t("lastName")}</Label>
                      <Input name="last_name" value={formData.last_name} onChange={handleInputChange} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-left">
                      <Label>{t("age")}</Label>
                      <Input name="age" type="number" value={formData.age} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2 text-left">
                      <Label>{t("gender")}</Label>
                      <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="male">{t("male")}</SelectItem>
                          <SelectItem value="female">{t("female")}</SelectItem>
                          <SelectItem value="other">{t("other")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="apple-surface border-white/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">
                  {t("accountStatus")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{tc("status")}</Label>
                  <Select value={formData.is_active} onValueChange={(v) => setFormData({ ...formData, is_active: v })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="active">{t("statusActive")}</SelectItem>
                      <SelectItem value="inactive">{t("statusInactive")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: All Forms */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="apple-surface border-white/40">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Briefcase className="size-5 text-primary" /> {t("workAndContact")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{tc("email")}</Label>
                  <Input name="email" type="email" value={formData.email} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label>{t("telegramUsername")}</Label>
                  <Input name="telegram_username" value={formData.telegram_username} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label>{t("phone1")}</Label>
                  <Input name="phone_number1" value={formData.phone_number1} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label>{t("phone2")}</Label>
                  <Input name="phone_number2" value={formData.phone_number2} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label>{tc("department")}</Label>
                  <Select value={formData.department_id} onValueChange={(v) => setFormData({ ...formData, department_id: v, position_id: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent position="popper">
                      {departments?.data?.map((d: any) => (
                        <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{tc("position")}</Label>
                  <Select value={formData.position_id} disabled={!formData.department_id} onValueChange={(v) => setFormData({ ...formData, position_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent position="popper">
                      {positions?.data?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("joinedAt")}</Label>
                  <DatePicker
                    value={formData.joined_at}
                    onChange={(date) => setFormData({ ...formData, joined_at: date })}
                    placeholder={t("joinedAt")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{te("baseSalary")}</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      $
                    </span>
                    <Input
                      name="base_salary"
                      type="text"
                      className="pl-7"
                      value={formData.base_salary}
                      onChange={handleInputChange}
                      placeholder={te("baseSalaryPlaceholder")}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{te("baseSalaryHint")}</p>
                </div>
                <div className="space-y-2">
                  <Label>{t("systemRole")}</Label>
                  <Select value={formData.role_id} onValueChange={(v) => setFormData({ ...formData, role_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent position="popper">
                      {roles?.data?.map((r: any) => (
                        <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{t("address")}</Label>
                  <Input name="address" value={formData.address} onChange={handleInputChange} />
                </div>
              </CardContent>
            </Card>

            <Card className="apple-surface border-white/40">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Heart className="size-5 text-rose-500" /> {t("familyAndRelations")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{t("maritalStatus")}</Label>
                  <Select value={formData.relationship_status} onValueChange={(v) => setFormData({ ...formData, relationship_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="single">{t("single")}</SelectItem>
                      <SelectItem value="married">{t("married")}</SelectItem>
                      <SelectItem value="divorced">{t("divorced")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("partnerName")}</Label>
                  <Input name="partner_name" value={formData.partner_name} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label>{t("partnerAge")}</Label>
                  <Input name="partner_age" type="number" value={formData.partner_age} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label>{t("partnerOccupation")}</Label>
                  <Input name="partner_occupation" value={formData.partner_occupation} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label>{t("totalChildren")}</Label>
                  <Input name="total_children" type="number" value={formData.total_children} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("sons")}</Label>
                    <Input name="total_sons" type="number" value={formData.total_sons} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("daughters")}</Label>
                    <Input name="total_daughters" type="number" value={formData.total_daughters} onChange={handleInputChange} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="apple-surface border-white/40">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <User className="size-5 text-indigo-500" /> {t("parentInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="font-bold text-sm text-muted-foreground uppercase">{t("father")}</p>
                  <div className="space-y-2">
                    <Label>{tc("name")}</Label>
                    <Input name="father_name" value={formData.father_name} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("age")}</Label>
                    <Input name="father_age" type="number" value={formData.father_age} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>{tc("status")}</Label>
                    <Select value={formData.father_live_status} onValueChange={(v) => setFormData({ ...formData, father_live_status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="alive">{t("alive")}</SelectItem>
                        <SelectItem value="deceased">{t("deceased")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="font-bold text-sm text-muted-foreground uppercase">{t("mother")}</p>
                  <div className="space-y-2">
                    <Label>{tc("name")}</Label>
                    <Input name="mother_name" value={formData.mother_name} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("age")}</Label>
                    <Input name="mother_age" type="number" value={formData.mother_age} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>{tc("status")}</Label>
                    <Select value={formData.mother_live_status} onValueChange={(v) => setFormData({ ...formData, mother_live_status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="alive">{t("alive")}</SelectItem>
                        <SelectItem value="deceased">{t("deceased")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="apple-surface border-white/40">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <ShieldAlert className="size-5 text-rose-500" /> {t("emergencyContact")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{t("contactName")}</Label>
                  <Input name="guardian_name" value={formData.guardian_name} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label>{t("relationship")}</Label>
                  <Input name="guardian_relationship" value={formData.guardian_relationship} onChange={handleInputChange} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{tc("phone")}</Label>
                  <Input name="guardian_phone_number" value={formData.guardian_phone_number} onChange={handleInputChange} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-350 mx-auto pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/employee">
          <Button
            variant="ghost"
            className="rounded-2xl gap-2 h-10 px-4 hover:bg-white/40 group"
          >
            <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
            ត្រឡប់ទៅបញ្ជីបុគ្គលិក
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleOpenEdit}
            className="rounded-2xl gap-2 h-10 px-4 border-white/40 bg-white/40 backdrop-blur-md"
          >
            <Edit3 className="size-4" />
            កែប្រែប្រវត្តិ
          </Button>
          <Button 
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={deleteMutation.isPending}
            className="rounded-2xl gap-2 h-10 px-4 bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20"
          >
            <Trash2 className="size-4" />
            {deleteMutation.isPending ? t("deleting") : tc("delete")}
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        setIsDeleteDialogOpen(open);
        if (!open) setDeleteConfirmText("");
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <ShieldAlert className="size-5" /> លុបបុគ្គលិក
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-2">
              <p>
                {t.rich("deleteEmployeeConfirm", { name: fullName, strong: (chunks) => <strong>{chunks}</strong> })}
              </p>
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {t.rich("typeDeleteToConfirm", { span: (chunks) => `<span className="text-rose-600">${chunks}</span>` })}
                </Label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={t("typeDeletePlaceholder")}
                  className="rounded-xl border-rose-100 focus-visible:ring-rose-500"
                />
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="ghost" className="rounded-xl">{tc("cancel")}</Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={
                deleteMutation.isPending ||
                (deleteConfirmText.trim() !== tc("delete") && deleteConfirmText.trim().toLowerCase() !== "delete")
              }
              className="rounded-xl bg-rose-500 hover:bg-rose-600"
            >
              {deleteMutation.isPending ? t("deleting") : t("confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Profile Card & Quick Info */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="apple-surface border-white/40 pt-12">
            <CardContent className="flex flex-col items-center text-center space-y-6 pb-10">
              <div className="relative">
                <div className="h-40 w-40 rounded-[3.5rem] bg-linear-to-br from-primary/10 to-indigo-500/10 flex items-center justify-center text-primary border-4 border-white shadow-2xl overflow-hidden">
                  {employee.profile_path && !imgError ? (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL}${employee.profile_path}`}
                      alt="profile"
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <span className="text-4xl font-black tracking-tighter">
                      {employee.first_name?.[0] || "U"}
                      {employee.last_name?.[0] || "E"}
                    </span>
                  )}
                </div>
                <div
                  className={`absolute bottom-2 right-2 h-8 w-8 rounded-full border-4 border-white flex items-center justify-center ${employee.status === "active" ? "bg-emerald-500" : "bg-sky-500"} shadow-lg`}
                >
                  {employee.status === "active" && (
                    <div className="h-2 w-2 rounded-full bg-white/60 animate-pulse" />
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-black tracking-tight">
                  {fullName}
                </h2>
                <p className="text-primary font-bold uppercase tracking-widest text-xs mt-1">
                  {employee.position_name || t("noRole")}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Badge
                    variant="outline"
                    className="rounded-full bg-white/50 border-white/60 capitalize"
                  >
                    {employee.gender === "male"
                      ? t("male")
                      : employee.gender === "female"
                        ? t("female")
                        : employee.gender
                          ? employee.gender
                          : t("other")}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full bg-white/50 border-white/60"
                  >
                    {employee.age || t("none")} {t("years")}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="apple-surface border-white/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">
                {t("contactInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ContactItem icon={Mail} label={tc("email")} value={employee.email || t("none")} />
              <ContactItem
                icon={Phone}
                label={t("phone1")}
                value={employee.phone_number1 || t("none")}
              />
              <ContactItem
                icon={Phone}
                label={t("phone2")}
                value={employee.phone_number2 || t("none")}
              />
              <ContactItem
                icon={Globe}
                label="Telegram"
                value={employee.telegram_username || t("none")}
              />
            </CardContent>
          </Card>

          <Card className="apple-surface border-white/40 bg-rose-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-rose-600/80 flex items-center gap-2">
                <ShieldAlert className="size-4" /> {t("contactInfo")}បន្ទាន់
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/40 border border-white/60 space-y-2">
                <p className="text-sm font-bold text-foreground/90">
                  {employee.guardian_info?.guardian_name || t("notEntered")}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("contactInfo")}</span>
                  <span className="font-semibold text-foreground/70">
                    {employee.guardian_info?.guardian_relationship || t("none")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{tc("phone")}</span>
                  <span className="font-semibold text-foreground/70">
                    {employee.guardian_info?.guardian_phone_number || t("none")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Detailed Tabs/Sections */}
        <div className="lg:col-span-8 space-y-6">
          {/* Work Information */}
          <Card className="apple-surface border-white/40">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Briefcase className="size-5 text-primary" /> {t("workInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
              <InfoRow
                icon={Hash}
                label={t("employeeId")}
                value={`EMP-${employee.id}`}
              />
              <InfoRow
                icon={Briefcase}
                label={tc("department")}
                value={employee.department_name || t("noDepartment")}
              />
              <InfoRow
                icon={Navigation}
                label={tc("location")}
                value={employee.location || t("noLocation")}
              />
              <InfoRow
                icon={ShieldCheck}
                label={t("systemRole")}
                value={employee.role_name || t("noRole")}
              />
              <InfoRow
                icon={Clock}
                label={t("joinedAt")}
                value={employee.joined_at || tc("notSet")}
              />
              <InfoRow
                icon={DollarSign}
                label={te("baseSalary")}
                value={
                  employee.base_salary != null && employee.base_salary !== "0" && employee.base_salary !== ""
                    ? `$${employee.base_salary}`
                    : tc("notSet")
                }
              />
              <InfoRow
                icon={Clock}
                label={t("contractStatus")}
                value={t("permanentFullTime")}
              />
            </CardContent>
          </Card>

          {/* Family Information */}
          <Card className="apple-surface border-white/40">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Heart className="size-5 text-rose-500" /> គ្រួសារ និង {t("contactInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                <InfoRow
                  icon={Heart}
                  label={t("maritalStatus")}
                  value={
                    employee.relationship_info?.relationship_status === "married"
                      ? t("married")
                      : employee.relationship_info?.relationship_status === "divorced"
                        ? t("divorced")
                        : employee.relationship_info?.relationship_status === "single"
                          ? t("single")
                          : employee.relationship_info?.relationship_status || t("single")
                  }
                />
                <InfoRow
                  icon={User}
                  label={t("partnerName")}
                  value={employee.relationship_info?.partner_name || t("none")}
                />
                <InfoRow
                  icon={Calendar}
                  label={t("partnerAge")}
                  value={employee.relationship_info?.partner_age || t("none")}
                />
                <InfoRow
                  icon={Briefcase}
                  label={t("partnerOccupation")}
                  value={employee.relationship_info?.partner_occupation || t("none")}
                />
                <InfoRow
                  icon={Baby}
                  label={t("children")}
                  value={`${employee.relationship_info?.total_children || 0} (${employee.relationship_info?.total_daughters || 0} ${t("daughters")}, ${employee.relationship_info?.total_sons || 0} ${t("sons")})`}
                />
                <InfoRow
                  icon={MapPin}
                  label={t("address")}
                  value={employee.address || t("noAddress")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/30">
                <ParentBadge
                  label={t("father")}
                  name={employee.family_info?.father_name}
                  age={employee.family_info?.father_age}
                  status={employee.family_info?.father_live_status}
                />
                <ParentBadge
                  label={t("mother")}
                  name={employee.family_info?.mother_name}
                  age={employee.family_info?.mother_age}
                  status={employee.family_info?.mother_live_status}
                />
              </div>
            </CardContent>
          </Card>
          <Card className="apple-surface border-white/40">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="size-5 text-sky-500" /> {t("employeeDocs")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {employee.document?.map((doc: any, index: number) => (
                  <DocCard
                      key={index}
                      id={doc.id}
                      name={doc.document_name || t("document")}
                      path={doc.document_path}
                      onPreview={() => {
                        setPreviewDoc({ name: doc.document_name || t("document"), path: doc.document_path });
                        setIsPreviewDialogOpen(true);
                      }}
                      onDelete={() => deleteDocMutation.mutate(doc.id)}
                      isDeleting={deleteDocMutation.isPending && deleteDocMutation.variables === doc.id}
                    />
                  ))}
                
                {/* AI-Powered Upload Card */}
                <Dialog open={isDocDialogOpen} onOpenChange={setIsDocDialogOpen}>
                  <DialogTrigger asChild>
                    <div className="border-2 border-dashed border-primary/30 bg-primary/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2 hover:bg-primary/10 transition-colors cursor-pointer group col-span-1 md:col-span-2">
                      <div className="rounded-full bg-primary/10 p-3 group-hover:scale-110 transition-transform">
                        <Upload className="size-5 text-primary" />
                      </div>
                      <p className="text-xs font-bold text-primary uppercase tracking-widest">
                        {t("uploadAndScanAI")}
                      </p>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="overflow-hidden">
                    {isScanning && (
                      <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                          <div className="relative bg-primary/10 p-4 rounded-full">
                            <Scan className="size-8 text-primary animate-pulse" />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-primary uppercase tracking-tighter">{t("scanning")}</p>
                          <p className="text-xs text-muted-foreground">{t("detectingBorders")}</p>
                        </div>
                        <div className="w-48 h-1.5 bg-primary/10 rounded-full overflow-hidden">
                          <div className="h-full bg-primary w-1/3 animate-[loading_1.5s_infinite_ease-in-out]" />
                        </div>
                      </div>
                    )}
                    <form onSubmit={handleDocUploadSubmit}>
                      <DialogHeader>
                        <DialogTitle>{t("uploadDoc")}</DialogTitle>
                        <DialogDescription>
                          {t("uploadDocDesc")}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        <div className="space-y-2">
                          <Label>{t("docType")}</Label>
                          <Select value={docTypeId} onValueChange={setDocTypeId}>
                            <SelectTrigger>
                              <SelectValue placeholder={t("selectType")} />
                            </SelectTrigger>
                            <SelectContent>
                              {documentTypes?.data?.map((type: any) => (
                                <SelectItem key={type.id} value={type.id.toString()}>
                                  {type.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>ឯកសារ</Label>
                          {docFile ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="p-2 rounded-lg bg-primary/10">
                                    <FileText className="size-4 text-primary" />
                                  </div>
                                  <span className="text-sm font-medium truncate">{docFile.name}</span>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-full hover:bg-rose-100 hover:text-rose-600"
                                  onClick={() => {
                                    setDocFile(null);
                                    setDocPreview(null);
                                  }}
                                >
                                  <X className="size-4" />
                                </Button>
                              </div>
                              
                              {/* Preview Area */}
                              {docPreview && (
                                <div className="relative group rounded-xl overflow-hidden border border-border shadow-sm aspect-[3/2] bg-zinc-100">
                                  <img 
                                    src={docPreview} 
                                    alt="Document preview" 
                                    className="w-full h-full object-contain"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <p className="text-white text-xs font-medium">លទ្ធផលស្កេន</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <Input 
                              type="file" 
                              onChange={handleFileSelect} 
                              className="cursor-pointer"
                              accept="image/*,.pdf"
                            />
                          )}
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">{tc("cancel")}</Button>
                        </DialogClose>
                        <Button type="submit" disabled={uploadDocMutation.isPending || isScanning}>
                          {uploadDocMutation.isPending ? "កំពុងអាប់ឡូដ..." : "អាប់ឡូដ"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Document Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-white border-none shadow-2xl">
          <DialogHeader className="p-4 bg-white/80 backdrop-blur-md border-b border-zinc-100 flex flex-row items-center justify-between sticky top-0 z-10">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                <FileText className="size-5 text-primary" /> {previewDoc?.name}
              </DialogTitle>
              <DialogDescription className="sr-only">
                មើលឯកសារដែលបានជ្រើសរើស
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 pr-8">
              <a 
                href={`${process.env.NEXT_PUBLIC_API_URL}${previewDoc?.path}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="rounded-xl gap-2 h-9 border-zinc-200 hover:bg-zinc-50">
                  <ExternalLink className="size-4" /> បើកក្នុងផ្ទាំងថ្មី
                </Button>
              </a>
              <a 
                href={`${process.env.NEXT_PUBLIC_API_URL}${previewDoc?.path}`} 
                download
              >
                <Button size="sm" className="rounded-xl gap-2 h-9 shadow-lg shadow-primary/20">
                  <Download className="size-4" /> ទាញយក
                </Button>
              </a>
            </div>
          </DialogHeader>
          <div className="relative w-full aspect-[4/3] md:aspect-[16/10] bg-zinc-50/50 flex items-center justify-center overflow-auto p-8">
            {previewDoc?.path.toLowerCase().endsWith(".pdf") ? (
              <iframe 
                src={`${process.env.NEXT_PUBLIC_API_URL}${previewDoc?.path}`}
                className="w-full h-full rounded-xl border border-zinc-200 bg-white shadow-sm"
                title={previewDoc?.name}
              />
            ) : (
              <div className="relative group">
                <div className="absolute -inset-4 bg-primary/5 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100 transition duration-500" />
                <img 
                  src={`${process.env.NEXT_PUBLIC_API_URL}${previewDoc?.path}`}
                  alt={previewDoc?.name}
                  className="relative max-w-full max-h-full object-contain shadow-2xl rounded-xl border-4 border-white"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocCard({
  id,
  name,
  path,
  onPreview,
  onDelete,
  isDeleting,
}: {
  id: number;
  name: string;
  path: string;
  onPreview: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="p-4 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-between hover:bg-white/40 transition-all group">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-white/60 flex items-center justify-center text-primary shadow-sm">
          <FileText className="size-6" />
        </div>
        <div>
          <p className="font-bold text-sm text-foreground/80 group-hover:text-primary transition-colors">
            {name}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPreview}
          className="rounded-xl hover:bg-primary/10 hover:text-primary"
        >
          <Eye className="size-4" />
        </Button>
        <a 
          href={`${process.env.NEXT_PUBLIC_API_URL}${path}`} 
          target="_blank" 
          rel="noopener noreferrer"
        >
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl hover:bg-primary/10 hover:text-primary"
          >
            <Download className="size-4" />
          </Button>
        </a>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={isDeleting}
          className="rounded-xl hover:bg-rose-100 hover:text-rose-600"
        >
          {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

function ContactItem({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/30 transition-colors">
      <div className="rounded-xl bg-primary/10 p-2 shrink-0">
        <Icon className="size-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
          {label}
        </p>
        <p className="text-sm font-medium text-foreground/80 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-1 rounded-2xl bg-white/40 p-2.5 border border-white/60 shadow-sm shrink-0">
        <Icon className="size-5 text-primary/80" />
      </div>
      <div className="space-y-0.5">
        <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
          {label}
        </p>
        <p className="font-bold text-lg text-foreground/80">
          {value}
        </p>
      </div>
    </div>
  );
}

function ParentBadge({
  label,
  name,
  age,
  status,
}: {
  label: string;
  name: string | null;
  age: number | null;
  status: string | null;
}) {
  const t = useTranslations("employeeProfile");
  return (
    <div className="p-4 rounded-2xl bg-white/30 border border-white/40 space-y-1">
      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
        {label}
      </p>
      <div className="flex items-center justify-between">
        <span className="font-bold text-foreground/80">{name || t("none")}</span>
        <Badge
          variant="outline"
          className={`rounded-full text-[10px] ${status === "alive" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"}`}
        >
          {status === "alive"
            ? t("alive")
            : status === "deceased"
              ? t("deceased")
              : t("none")}
        </Badge>
      </div>
      {age && <p className="text-xs text-muted-foreground">{t("age")}: {age}</p>}
    </div>
  );
}
