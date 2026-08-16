"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Briefcase,
  Building2,
  MapPin,
  Clock,
  DollarSign,
  Send,
  UploadCloud,
  CheckCircle2,
  FileText,
  Sparkles,
  ArrowLeft,
  Users,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { toast } from "sonner";
import { getPublicJob, submitPublicApplication } from "@/services/recruitment.services";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function PublicJobCareersPage() {
  const params = useParams();
  const jobId = params?.id as string;
  const t = useTranslations("careers");
  const tc = useTranslations("common");

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    offered_salary: "",
    cover_letter: "",
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const fetchJob = async () => {
      try {
        setLoading(true);
        const res = await getPublicJob(jobId);
        if (res.result) {
          setJob(res.data);
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Job opening not found or has expired.");
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [jobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.email) {
      return toast.error("Please fill in your full name and email.");
    }
    if (!resumeFile) {
      return toast.error("Please upload your CV / Resume.");
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append("job_posting_id", jobId);
      data.append("first_name", formData.first_name);
      data.append("last_name", formData.last_name);
      data.append("email", formData.email);
      if (formData.phone) data.append("phone", formData.phone);
      if (formData.offered_salary) data.append("offered_salary", formData.offered_salary);
      if (formData.cover_letter) data.append("cover_letter", formData.cover_letter);
      data.append("resume", resumeFile);

      const res = await submitPublicApplication(data);
      if (res.result) {
        setSubmitted(true);
        toast.success(res.message || "Application submitted successfully!");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/20">
        <LoadingState variant="card" count={1} />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-muted/20 text-center">
        <div className="size-16 rounded-3xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
          <Briefcase className="size-8" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t("notFoundTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">{t("notFoundDesc")}</p>
      </div>
    );
  }

  // Submitted Success Screen
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-muted/30 via-background to-muted/20">
        <Card className="max-w-md w-full rounded-3xl border shadow-xl p-6 sm:p-8 text-center space-y-5 bg-card/90 backdrop-blur-md">
          <div className="size-20 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10 animate-bounce">
            <CheckCircle2 className="size-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">{t("successTitle")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("successDesc", { company: job.company?.name || "our company" })}
            </p>
          </div>

          <div className="p-4 bg-muted/40 rounded-2xl text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">{job.title}</p>
            <p>{job.department?.name} • {job.company?.name}</p>
          </div>

          <p className="text-xs text-muted-foreground/70">
            {t("successContactNote")}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 via-background to-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* ── Top Bar with Company Branding & Language Switcher ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {job.company?.logo_path ? (
              <img
                src={
                  job.company.logo_path.startsWith("http")
                    ? job.company.logo_path
                    : `${process.env.NEXT_PUBLIC_API_URL || ""}${job.company.logo_path}`
                }
                alt={job.company.name}
                className="size-10 rounded-2xl object-cover border shadow-xs"
              />
            ) : (
              <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base shadow-xs">
                {job.company?.name?.[0] || "C"}
              </div>
            )}
            <div>
              <span className="font-bold text-sm text-foreground">{job.company?.name || "Careers"}</span>
              <p className="text-[11px] text-muted-foreground">{t("careersPortal")}</p>
            </div>
          </div>

          <LanguageSwitcher />
        </div>

        {/* ── Main Job Header Banner ── */}
        <Card className="rounded-3xl border shadow-lg bg-card/80 backdrop-blur-md overflow-hidden">
          <div className="h-3 bg-primary w-full" />
          <CardHeader className="p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="px-3 py-1 text-xs font-bold rounded-xl bg-primary/10 text-primary">
                {job.employment_type || "Full-Time"}
              </Badge>
              <Badge variant="outline" className="px-3 py-1 text-xs font-semibold rounded-xl">
                {job.department?.name}
              </Badge>
              {job.openings_count > 1 && (
                <Badge variant="outline" className="px-3 py-1 text-xs font-semibold rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
                  {job.openings_count} {t("openings")}
                </Badge>
              )}
            </div>

            <div>
              <CardTitle className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {job.title}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                <Building2 className="size-4" />
                {job.company?.name} • {job.department?.name}
              </CardDescription>
            </div>

            {(job.salary_min || job.salary_max) && (
              <div className="flex items-center gap-2 text-base font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-2xl w-fit border border-emerald-500/20">
                <DollarSign className="size-5" />
                <span>
                  ${job.salary_min || 0} - ${job.salary_max || 0} / month
                </span>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* ── Two Column Layout: Description on Left, Application Form on Right ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Job Details */}
          <div className="lg:col-span-7 space-y-6">
            {job.description && (
              <Card className="rounded-3xl border shadow-sm p-6 space-y-3 bg-card/70 backdrop-blur-md">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Briefcase className="size-4 text-primary" />
                  {t("aboutRole")}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {job.description}
                </p>
              </Card>
            )}

            {job.requirements && (
              <Card className="rounded-3xl border shadow-sm p-6 space-y-3 bg-card/70 backdrop-blur-md">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  {t("qualifications")}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {job.requirements}
                </p>
              </Card>
            )}

            <div className="p-4 bg-muted/40 rounded-2xl text-xs text-muted-foreground space-y-1 border border-border/40">
              <p>🔒 <strong>{t("privacyNoteTitle")}</strong>: {t("privacyNoteDesc")}</p>
            </div>
          </div>

          {/* Right Column: Application Form */}
          <div className="lg:col-span-5">
            <Card className="rounded-3xl border shadow-xl bg-card p-6 sm:p-7 space-y-5 sticky top-8">
              <div className="space-y-1">
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  {t("applyNow")}
                </h3>
                <p className="text-xs text-muted-foreground">{t("applySubtitle")}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">{t("firstName")} *</Label>
                    <Input
                      placeholder="e.g. Sokha"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="rounded-xl h-10 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">{t("lastName")} *</Label>
                    <Input
                      placeholder="e.g. Chan"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="rounded-xl h-10 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{tc("email")} *</Label>
                  <Input
                    type="email"
                    placeholder="sokha.chan@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="rounded-xl h-10 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">{tc("phone")}</Label>
                    <Input
                      placeholder="012 345 678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="rounded-xl h-10 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">{t("expectedSalary")} ($)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 850"
                      value={formData.offered_salary}
                      onChange={(e) => setFormData({ ...formData, offered_salary: e.target.value })}
                      className="rounded-xl h-10 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("resumeUpload")} *</Label>
                  <div className="border-2 border-dashed border-border/80 hover:border-primary/50 transition-all rounded-2xl p-4 text-center space-y-2 bg-muted/20">
                    <UploadCloud className="size-7 mx-auto text-primary/70" />
                    <div>
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setResumeFile(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                        id="resume-file-input"
                        required
                      />
                      <label
                        htmlFor="resume-file-input"
                        className="cursor-pointer text-xs font-bold text-primary hover:underline"
                      >
                        {resumeFile ? resumeFile.name : t("chooseFile")}
                      </label>
                      <p className="text-[10px] text-muted-foreground mt-1">{t("resumeFormat")}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("coverLetter")}</Label>
                  <textarea
                    className="w-full min-h-[70px] p-2.5 rounded-xl border bg-background text-xs resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder={t("coverLetterPlaceholder")}
                    value={formData.cover_letter}
                    onChange={(e) => setFormData({ ...formData, cover_letter: e.target.value })}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 rounded-2xl font-bold text-sm shadow-md bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                >
                  <Send className="size-4" />
                  {submitting ? t("submittingApplication") : t("submitApplication")}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
