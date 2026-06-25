"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useCompany } from "@/hooks/useCompany";
import { useLocations } from "@/hooks/useLocation";
import { updateCompany } from "@/services/company.services";
import { 
  addLocation, 
  updateLocation, 
  deleteLocation, 
  LocationData 
} from "@/services/location.services";
import { toast } from "sonner";
import { LoadingState } from "@/components/ui/loading-state";
import { 
  Building2, 
  Mail, 
  Phone, 
  Palette, 
  Send, 
  Edit3, 
  Upload, 
  X, 
  Check, 
  Loader2, 
  Globe, 
  MessageSquare,
  Lock,
  ArrowLeft,
  MapPin,
  Trash2,
  Edit2,
  ExternalLink,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

export default function CompanyPage() {
  const queryClient = useQueryClient();
  const t = useTranslations("company");
  const tc = useTranslations("common");
  const { data: companyRes, isLoading: isCompanyLoading, isError: isCompanyError } = useCompany();
  const { data: locationsRes, isLoading: isLocationsLoading, isError: isLocationsError } = useLocations();

  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Locations states
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [locationForm, setLocationForm] = useState({
    name: "",
    latitude: "",
    longitude: "",
    radius: "100",
  });

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    primary_color: "#4f46e5",
    secondary_color: "#06b6d4",
    telegram_group_id: "",
    telegram_attendance_group_id: "",
    telegram_leave_group_id: "",
    telegram_overtime_group_id: "",
    telegram_announcement_group_id: "",
    telegram_bot_token: "",
  });

  const company = companyRes?.data;
  const locations = locationsRes?.data || [];

  // Initialize company form
  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || "",
        phone: company.phone || "",
        email: company.email || "",
        primary_color: company.primary_color || "#4f46e5",
        secondary_color: company.secondary_color || "#06b6d4",
        telegram_group_id: company.telegram_group_id || "",
        telegram_attendance_group_id: company.telegram_attendance_group_id || "",
        telegram_leave_group_id: company.telegram_leave_group_id || "",
        telegram_overtime_group_id: company.telegram_overtime_group_id || "",
        telegram_announcement_group_id: company.telegram_announcement_group_id || "",
        telegram_bot_token: company.telegram_bot_token || "",
      });
      if (company.logo_path) {
        setLogoPreview(`${process.env.NEXT_PUBLIC_API_URL}${company.logo_path}`);
      } else {
        setLogoPreview(null);
      }
    }
  }, [company]);

  // Mutations
  const updateCompanyMutation = useMutation({
    mutationFn: (data: FormData) => updateCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success(t("updateSuccess"));
      setIsEditing(false);
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || tc("error"));
    },
  });

  const addLocationMutation = useMutation({
    mutationFn: (data: LocationData) => addLocation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success(t("locationAdded"));
      setIsLocationDialogOpen(false);
      resetLocationForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || tc("error"));
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: LocationData }) => updateLocation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success(t("locationUpdated"));
      setIsLocationDialogOpen(false);
      resetLocationForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || tc("error"));
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: (id: number) => deleteLocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success(t("locationDeleted"));
      setIsDeleteConfirmOpen(false);
      setSelectedLocation(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || tc("error"));
    },
  });

  // Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveLogo = () => {
    setSelectedFile(null);
    if (company?.logo_path) {
      setLogoPreview(`${process.env.NEXT_PUBLIC_API_URL}${company.logo_path}`);
    } else {
      setLogoPreview(null);
    }
  };

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.warning(t("nameRequired"));
      return;
    }

    const data = new FormData();
    data.append("name", formData.name);
    data.append("phone", formData.phone);
    data.append("email", formData.email);
    data.append("primary_color", formData.primary_color);
    data.append("secondary_color", formData.secondary_color);
    data.append("telegram_group_id", formData.telegram_group_id);
    data.append("telegram_attendance_group_id", formData.telegram_attendance_group_id);
    data.append("telegram_leave_group_id", formData.telegram_leave_group_id);
    data.append("telegram_overtime_group_id", formData.telegram_overtime_group_id);
    data.append("telegram_announcement_group_id", formData.telegram_announcement_group_id);
    data.append("telegram_bot_token", formData.telegram_bot_token);
    data.append("old_logo_path", company?.logo_path || "");

    if (selectedFile) {
      data.append("logo_path", selectedFile);
    }

    updateCompanyMutation.mutate(data);
  };

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationForm.name.trim()) {
      toast.warning(t("enterLocationName"));
      return;
    }

    const rad = parseInt(locationForm.radius);
    if (isNaN(rad) || rad <= 0) {
      toast.warning(t("radiusPositive"));
      return;
    }

    const data: LocationData = {
      name: locationForm.name,
      latitude: locationForm.latitude.trim() || null,
      longitude: locationForm.longitude.trim() || null,
      radius: rad,
    };

    if (selectedLocation && selectedLocation.id) {
      updateLocationMutation.mutate({ id: selectedLocation.id, data });
    } else {
      addLocationMutation.mutate(data);
    }
  };

  const resetLocationForm = () => {
    setSelectedLocation(null);
    setLocationForm({
      name: "",
      latitude: "",
      longitude: "",
      radius: "100",
    });
  };

  const triggerEditLocation = (loc: LocationData) => {
    setSelectedLocation(loc);
    setLocationForm({
      name: loc.name,
      latitude: loc.latitude || "",
      longitude: loc.longitude || "",
      radius: loc.radius ? String(loc.radius) : "100",
    });
    setIsLocationDialogOpen(true);
  };

  const triggerDeleteLocation = (loc: LocationData) => {
    setSelectedLocation(loc);
    setIsDeleteConfirmOpen(true);
  };

  const getMapLink = (lat?: string | null, lng?: string | null) => {
    if (!lat || !lng) return "#";
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  };

  if (isCompanyLoading || isLocationsLoading) return <LoadingState variant="table" count={4} />;
  if (isCompanyError || !companyRes?.result) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white/40 backdrop-blur-xl rounded-3xl border border-white/50 shadow-sm max-w-xl mx-auto">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-4">
          <Building2 size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t("errorLoading")}</h2>
        <p className="text-sm text-gray-500 mb-6">{t("errorLoadingDesc")}</p>
      </div>
    );
  }

  const monogram = company.name ? company.name.charAt(0).toUpperCase() : "C";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("subtitle")}
          </p>
        </div>
        {activeTab === "profile" && !isEditing && (
          <Button 
            onClick={() => setIsEditing(true)} 
            className="rounded-2xl gap-2 h-11 px-5 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-white font-medium"
          >
            <Edit3 size={18} />
            {t("editInfo")}
          </Button>
        )}
        {activeTab === "locations" && (
          <Button 
            onClick={() => {
              resetLocationForm();
              setIsLocationDialogOpen(true);
            }} 
            className="rounded-2xl gap-2 h-11 px-5 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-white font-medium"
          >
            <Plus size={18} />
            {t("addLocation")}
          </Button>
        )}
      </div>

      {/* Tabs Layout */}
      {!isEditing && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 max-w-md bg-white/40 border border-white/50 p-1 rounded-2xl h-12">
            <TabsTrigger 
              value="profile" 
              className="rounded-xl h-10 font-bold flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all text-gray-600"
            >
              <Building2 size={16} />
              {t("companyInfo")}
            </TabsTrigger>
            <TabsTrigger 
              value="locations" 
              className="rounded-xl h-10 font-bold flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all text-gray-600"
            >
              <MapPin size={16} />
              {t("attendanceLocations")} ({locations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="pt-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {/* Left Column: Profile Card & Colors */}
              <div className="md:col-span-1 space-y-6">
                <Card className="overflow-hidden border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl rounded-3xl">
                  <div className="h-24 bg-gradient-to-r from-primary/10 to-indigo-500/10 relative" />
                  <CardContent className="pt-0 px-6 pb-6 relative flex flex-col items-center">
                    <div className="w-20 h-20 rounded-3xl border-4 border-white bg-white shadow-md -mt-10 overflow-hidden flex items-center justify-center relative">
                      {company.logo_path ? (
                        <img 
                          src={`${process.env.NEXT_PUBLIC_API_URL}${company.logo_path}`} 
                          alt={company.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white text-2xl font-black">
                          {monogram}
                        </div>
                      )}
                    </div>
                    
                    <h2 className="text-lg font-bold mt-4 text-center text-gray-900">{company.name}</h2>
                    <Badge variant="outline" className="mt-2 rounded-full px-3 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                      {t("active")}
                    </Badge>

                    <div className="w-full border-t border-gray-100/70 my-5" />

                    <div className="w-full space-y-4 text-sm">
                      <div className="flex items-center gap-3 text-gray-600">
                        <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                          <Mail size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-400 font-medium">{t("emailLabel")}</p>
                          <p className="truncate font-semibold text-gray-800">{company.email || tc("notSet")}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-gray-600">
                        <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                          <Phone size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-400 font-medium">{t("phoneLabel")}</p>
                          <p className="font-semibold text-gray-800">{company.phone || tc("notSet")}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Colors */}
                <Card className="border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl rounded-3xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-md font-bold flex items-center gap-2 text-gray-800">
                      <Palette className="size-4.5 text-primary" />
                      {t("themeTitle")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                      <span className="text-sm font-medium text-gray-600">{t("primaryColor")}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-gray-500">{company.primary_color || "#4f46e5"}</span>
                        <div 
                          className="w-6 h-6 rounded-lg shadow-inner border border-white"
                          style={{ backgroundColor: company.primary_color || "#4f46e5" }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                      <span className="text-sm font-medium text-gray-600">{t("secondaryColor")}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-gray-500">{company.secondary_color || "#06b6d4"}</span>
                        <div 
                          className="w-6 h-6 rounded-lg shadow-inner border border-white"
                          style={{ backgroundColor: company.secondary_color || "#06b6d4" }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Telegram Settings */}
              <div className="md:col-span-2 space-y-6">
                <Card className="border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl rounded-3xl h-full flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-gray-800">
                      <Send className="size-5 text-sky-500" />
                      {t("telegramIntegration")}
                    </CardTitle>
                    <CardDescription>
                      {t("telegramDesc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 flex-1">
                    <div className="space-y-4">
                      <div className="p-5 rounded-2xl bg-sky-50/50 border border-sky-100/50 space-y-4">
                        <h3 className="text-sm font-bold text-sky-900 flex items-center gap-2">
                          <MessageSquare className="size-4.5" />
                          Telegram Notification Channels
                        </h3>
                        <p className="text-xs text-sky-700/80 leading-relaxed">
                          Configure specific Telegram group IDs for each feature, or use the Default Group ID as a fallback.
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-gray-400 block uppercase tracking-wider">{t("groupIdLabel")}</span>
                            <div className="bg-white/90 border border-sky-100 rounded-xl px-3.5 py-2.5 font-mono text-xs text-gray-800 select-all shadow-sm">
                              {company.telegram_group_id || <span className="text-gray-400 italic font-sans">{tc("notSet")}</span>}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-gray-400 block uppercase tracking-wider">{t("attendanceGroupIdLabel")}</span>
                            <div className="bg-white/90 border border-sky-100 rounded-xl px-3.5 py-2.5 font-mono text-xs text-gray-800 select-all shadow-sm">
                              {company.telegram_attendance_group_id || <span className="text-gray-400 italic font-sans">{tc("notSet")}</span>}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-gray-400 block uppercase tracking-wider">{t("leaveGroupIdLabel")}</span>
                            <div className="bg-white/90 border border-sky-100 rounded-xl px-3.5 py-2.5 font-mono text-xs text-gray-800 select-all shadow-sm">
                              {company.telegram_leave_group_id || <span className="text-gray-400 italic font-sans">{tc("notSet")}</span>}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-gray-400 block uppercase tracking-wider">{t("overtimeGroupIdLabel")}</span>
                            <div className="bg-white/90 border border-sky-100 rounded-xl px-3.5 py-2.5 font-mono text-xs text-gray-800 select-all shadow-sm">
                              {company.telegram_overtime_group_id || <span className="text-gray-400 italic font-sans">{tc("notSet")}</span>}
                            </div>
                          </div>

                          <div className="space-y-1 sm:col-span-2">
                            <span className="text-[11px] font-bold text-gray-400 block uppercase tracking-wider">{t("announcementGroupIdLabel")}</span>
                            <div className="bg-white/90 border border-sky-100 rounded-xl px-3.5 py-2.5 font-mono text-xs text-gray-800 select-all shadow-sm">
                              {company.telegram_announcement_group_id || <span className="text-gray-400 italic font-sans">{tc("notSet")}</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                          <Lock className="size-4.5 text-gray-400" />
                          {t("botToken")}
                        </h3>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          {t("botTokenDesc")}
                        </p>
                        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 font-mono text-sm text-gray-800 flex items-center justify-between shadow-sm">
                          <span className="truncate flex-1 max-w-[90%]">
                            {company.telegram_bot_token 
                              ? "••••••••••••••••••••••••••••••••••••••••••••••••" 
                              : <span className="text-gray-400 italic font-sans text-xs">{tc("notSet")}</span>}
                          </span>
                          {company.telegram_bot_token && (
                            <Badge variant="secondary" className="rounded-full bg-gray-100 text-gray-600 hover:bg-gray-100 text-[10px]">
                              {t("secure")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations" className="pt-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl rounded-3xl">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-800">{t("locationList")}</CardTitle>
                    <CardDescription>
                      {t("locationListDesc")}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/75 text-left text-gray-600 font-semibold">
                          <th className="px-6 py-4">{t("locationName")}</th>
                          <th className="px-6 py-4">{t("latitude")}</th>
                          <th className="px-6 py-4">{t("longitude")}</th>
                          <th className="px-6 py-4">{tc("radius")}</th>
                          <th className="px-6 py-4 text-center">{t("map")}</th>
                          <th className="px-6 py-4 text-right">{tc("actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {locations.map((loc: LocationData) => (
                          <tr key={loc.id} className="border-b border-gray-50 hover:bg-gray-50/50 last:border-0 transition-colors">
                            <td className="px-6 py-4 font-bold text-gray-900">{loc.name}</td>
                            <td className="px-6 py-4 font-mono text-gray-600 text-xs">
                              {loc.latitude || <span className="text-gray-300">-</span>}
                            </td>
                            <td className="px-6 py-4 font-mono text-gray-600 text-xs">
                              {loc.longitude || <span className="text-gray-300">-</span>}
                            </td>
                            <td className="px-6 py-4 text-gray-700">
                              {loc.radius ? (
                                <Badge className="bg-primary/10 text-primary hover:bg-primary/10 font-bold border border-primary/20 rounded-full px-2.5 py-0.5">
                                  {loc.radius} {tc("meters")}
                                </Badge>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {loc.latitude && loc.longitude ? (
                                <a 
                                  href={getMapLink(loc.latitude, loc.longitude)} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800 font-bold bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100 transition-colors"
                                >
                                  <ExternalLink size={12} />
                                  {t("viewOnMap")}
                                </a>
                              ) : (
                                <span className="text-gray-300 text-xs italic">{t("noCoords")}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right space-x-1.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => triggerEditLocation(loc)}
                                className="h-8 w-8 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                              >
                                <Edit2 size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => triggerDeleteLocation(loc)}
                                className="h-8 w-8 rounded-xl hover:bg-rose-50 text-rose-500 hover:text-rose-700"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {locations.length === 0 && (
                          <tr>
                            <td colSpan={6} className="h-32 text-center text-gray-400 italic">
                              <div className="flex flex-col items-center justify-center space-y-2 py-6">
                                <MapPin size={24} className="text-gray-300 animate-bounce" />
                                <span>{t("noLocations")}</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      )}

      {/* Company Editing Form */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <form onSubmit={handleCompanySubmit} className="space-y-6">
            <Card className="border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl rounded-3xl">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg font-bold text-gray-800">{t("editCompanyInfo")}</CardTitle>
                  <CardDescription>{t("editCompanyDesc")}</CardDescription>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedFile(null);
                  }}
                  className="rounded-xl gap-1 text-gray-500 hover:text-gray-900"
                >
                  <ArrowLeft size={16} />
                  {tc("back")}
                </Button>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-bold text-gray-700">{t("companyName")} <span className="text-rose-500">*</span></Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Sarana Group"
                        className="h-11 rounded-2xl border-white/80 bg-white/60 focus:bg-white"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-bold text-gray-700">{t("companyEmail")}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="info@saranagroup.com"
                        className="h-11 rounded-2xl border-white/80 bg-white/60 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-bold text-gray-700">{t("companyPhone")}</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="012 345 678 / 098 765 432"
                        className="h-11 rounded-2xl border-white/80 bg-white/60 focus:bg-white"
                      />
                    </div>

                    <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-4">
                      <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <Palette size={16} className="text-primary" />
                        {t("themeColors")}
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="primary_color" className="text-xs font-semibold text-gray-600">{t("primaryColor")}</Label>
                          <div className="flex gap-2">
                            <Input
                              id="primary_color"
                              type="color"
                              value={formData.primary_color}
                              onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                              className="h-11 w-14 p-1 rounded-xl cursor-pointer border-white/80"
                            />
                            <Input
                              type="text"
                              value={formData.primary_color}
                              onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                              placeholder="#4f46e5"
                              className="h-11 rounded-xl font-mono text-sm border-white/80 bg-white/60"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="secondary_color" className="text-xs font-semibold text-gray-600">{t("secondaryColor")}</Label>
                          <div className="flex gap-2">
                            <Input
                              id="secondary_color"
                              type="color"
                              value={formData.secondary_color}
                              onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                              className="h-11 w-14 p-1 rounded-xl cursor-pointer border-white/80"
                            />
                            <Input
                              type="text"
                              value={formData.secondary_color}
                              onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                              placeholder="#06b6d4"
                              className="h-11 rounded-xl font-mono text-sm border-white/80 bg-white/60"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">{t("companyLogo")}</Label>
                      <div className="border-2 border-dashed border-gray-200 hover:border-primary/50 transition-colors rounded-2xl p-6 flex flex-col items-center justify-center bg-white/40 cursor-pointer relative min-h-[195px]">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          id="logo-uploader"
                        />
                        {logoPreview ? (
                          <div className="flex flex-col items-center space-y-3 z-10">
                            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md border-2 border-white bg-white relative">
                              <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-500 truncate max-w-[200px]">
                                {selectedFile ? selectedFile.name : t("currentLogo")}
                              </p>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveLogo();
                                }}
                                className="h-6 w-6 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100"
                              >
                                <X size={12} />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center space-y-2 pointer-events-none">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
                              <Upload size={20} />
                            </div>
                            <p className="text-xs font-semibold text-gray-700">{t("uploadImage")}</p>
                            <p className="text-[10px] text-gray-400">{t("supportedFormats")}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-sky-50/30 border border-sky-100/50 space-y-4">
                      <h3 className="text-sm font-bold text-sky-900 flex items-center gap-2">
                        <Send size={16} className="text-sky-500" />
                        {t("telegramIntegration")}
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="telegram_group_id" className="text-xs font-semibold text-sky-800">{t("groupIdLabel")}</Label>
                            <Input
                              id="telegram_group_id"
                              value={formData.telegram_group_id}
                              onChange={(e) => setFormData({ ...formData, telegram_group_id: e.target.value })}
                              placeholder="e.g. -100123456789"
                              className="h-10 rounded-xl border-sky-100/80 bg-white/70 focus:bg-white text-sm font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="telegram_attendance_group_id" className="text-xs font-semibold text-sky-800">{t("attendanceGroupIdLabel")}</Label>
                            <Input
                              id="telegram_attendance_group_id"
                              value={formData.telegram_attendance_group_id}
                              onChange={(e) => setFormData({ ...formData, telegram_attendance_group_id: e.target.value })}
                              placeholder="e.g. -100123456789"
                              className="h-10 rounded-xl border-sky-100/80 bg-white/70 focus:bg-white text-sm font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="telegram_leave_group_id" className="text-xs font-semibold text-sky-800">{t("leaveGroupIdLabel")}</Label>
                            <Input
                              id="telegram_leave_group_id"
                              value={formData.telegram_leave_group_id}
                              onChange={(e) => setFormData({ ...formData, telegram_leave_group_id: e.target.value })}
                              placeholder="e.g. -100123456789"
                              className="h-10 rounded-xl border-sky-100/80 bg-white/70 focus:bg-white text-sm font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="telegram_overtime_group_id" className="text-xs font-semibold text-sky-800">{t("overtimeGroupIdLabel")}</Label>
                            <Input
                              id="telegram_overtime_group_id"
                              value={formData.telegram_overtime_group_id}
                              onChange={(e) => setFormData({ ...formData, telegram_overtime_group_id: e.target.value })}
                              placeholder="e.g. -100123456789"
                              className="h-10 rounded-xl border-sky-100/80 bg-white/70 focus:bg-white text-sm font-mono"
                            />
                          </div>
                          <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="telegram_announcement_group_id" className="text-xs font-semibold text-sky-800">{t("announcementGroupIdLabel")}</Label>
                            <Input
                              id="telegram_announcement_group_id"
                              value={formData.telegram_announcement_group_id}
                              onChange={(e) => setFormData({ ...formData, telegram_announcement_group_id: e.target.value })}
                              placeholder="e.g. -100123456789"
                              className="h-10 rounded-xl border-sky-100/80 bg-white/70 focus:bg-white text-sm font-mono"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="telegram_bot_token" className="text-xs font-semibold text-sky-800">{t("botTokenLabel")}</Label>
                          <Input
                            id="telegram_bot_token"
                            type="password"
                            value={formData.telegram_bot_token}
                            onChange={(e) => setFormData({ ...formData, telegram_bot_token: e.target.value })}
                            placeholder="e.g. 123456:ABC-DEF1234ghIkl-zyx"
                            className="h-10 rounded-xl border-sky-100/80 bg-white/70 focus:bg-white text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100/60 flex items-center justify-end gap-3 rounded-b-3xl">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedFile(null);
                  }}
                  className="rounded-2xl"
                  disabled={updateCompanyMutation.isPending}
                >
                  {tc("cancel")}
                </Button>
                <Button 
                  type="submit" 
                  className="rounded-2xl gap-2 px-6 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-white"
                  disabled={updateCompanyMutation.isPending}
                >
                  {updateCompanyMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {tc("saving")}
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      {t("saveChanges")}
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </form>
        </motion.div>
      )}

      {/* Add / Edit Location Dialog */}
      <Dialog 
        open={isLocationDialogOpen} 
        onOpenChange={(open) => {
          setIsLocationDialogOpen(open);
          if (!open) resetLocationForm();
        }}
      >
        <DialogContent className="max-w-md p-6 rounded-3xl border border-white/60 bg-white/95 backdrop-blur-xl shadow-lg">
          <form onSubmit={handleLocationSubmit}>
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold text-gray-900">
                {selectedLocation ? t("editLocation") : t("addNewLocation")}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                {t("locationFormDesc")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="loc-name" className="text-sm font-bold text-gray-700">{t("locationName")} <span className="text-rose-500">*</span></Label>
                <Input
                  id="loc-name"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                  placeholder="e.g. Head Office Branch (Norton)"
                  className="h-10 rounded-xl border-gray-200 bg-white text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="loc-lat" className="text-sm font-bold text-gray-700">{t("latitude")}</Label>
                  <Input
                    id="loc-lat"
                    value={locationForm.latitude}
                    onChange={(e) => setLocationForm({ ...locationForm, latitude: e.target.value })}
                    placeholder="e.g. 11.5833"
                    className="h-10 rounded-xl border-gray-200 bg-white text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="loc-lng" className="text-sm font-bold text-gray-700">{t("longitude")}</Label>
                  <Input
                    id="loc-lng"
                    value={locationForm.longitude}
                    onChange={(e) => setLocationForm({ ...locationForm, longitude: e.target.value })}
                    placeholder="e.g. 104.9167"
                    className="h-10 rounded-xl border-gray-200 bg-white text-sm font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="loc-radius" className="text-sm font-bold text-gray-700">{t("radiusLabel")} <span className="text-rose-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="loc-radius"
                    type="number"
                    value={locationForm.radius}
                    onChange={(e) => setLocationForm({ ...locationForm, radius: e.target.value })}
                    placeholder="100"
                    className="h-10 rounded-xl border-gray-200 bg-white text-sm pr-16"
                    required
                    min="10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                    {tc("meters")}
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 leading-normal">
                  {t("radiusHint")}
                </p>
              </div>
            </div>

            <DialogFooter className="mt-6 gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="rounded-xl h-10 text-sm">
                  {tc("cancel")}
                </Button>
              </DialogClose>
              <Button 
                type="submit" 
                className="rounded-xl h-10 px-5 text-sm bg-primary text-white font-medium"
                disabled={addLocationMutation.isPending || updateLocationMutation.isPending}
              >
                {(addLocationMutation.isPending || updateLocationMutation.isPending) ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                    {tc("saving")}
                  </>
                ) : (
                  <>
                    <Check size={16} className="mr-1.5" />
                    {tc("save")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Location Confirmation Dialog */}
      <Dialog 
        open={isDeleteConfirmOpen} 
        onOpenChange={(open) => {
          setIsDeleteConfirmOpen(open);
          if (!open) setSelectedLocation(null);
        }}
      >
        <DialogContent className="max-w-sm p-6 rounded-3xl border border-white/60 bg-white/95 backdrop-blur-xl shadow-lg">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Trash2 className="size-5 text-rose-500" />
              {t("deleteLocation")}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 leading-normal">
              {t("deleteLocationDesc", { name: selectedLocation?.name || "" })}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 flex flex-row items-center justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-xl h-10 text-sm flex-1">
                {tc("cancel")}
              </Button>
            </DialogClose>
            <Button
              onClick={() => selectedLocation?.id && deleteLocationMutation.mutate(selectedLocation.id)}
              className="rounded-xl h-10 px-5 text-sm bg-rose-500 hover:bg-rose-600 text-white font-medium flex-1"
              disabled={deleteLocationMutation.isPending}
            >
              {deleteLocationMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t("deleteLocationBtn")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
