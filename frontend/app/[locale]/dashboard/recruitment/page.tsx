"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import {
  Briefcase,
  Users,
  UserPlus,
  Plus,
  Search,
  FileText,
  Calendar,
  DollarSign,
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  MoreVertical,
  Edit2,
  Trash2,
  Download,
  ArrowRight,
  Sparkles,
  Phone,
  Mail,
  Kanban,
  List,
  Building2,
  ExternalLink,
  Link2,
  GripVertical,
  Inbox,
  UploadCloud,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/ui/loading-state";
import { toast } from "sonner";
import {
  getRecruitmentDashboard,
  getJobPostings,
  createJobPosting,
  updateJobPosting,
  deleteJobPosting,
  getCandidates,
  createCandidate,
  updateCandidate,
  updateCandidateStage,
  deleteCandidate,
  convertCandidateToEmployee,
  type JobPosting,
  type Candidate,
} from "@/services/recruitment.services";
import { getDepartments } from "@/services/department.services";
import { getPositions } from "@/services/position.services";
import { getRoles } from "@/services/role.services";

const PIPELINE_STAGES = [
  {
    key: "APPLIED",
    labelKey: "stageApplied",
    headerBg: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    dotColor: "bg-blue-500",
    icon: Clock,
  },
  {
    key: "SCREENING",
    labelKey: "stageScreening",
    headerBg: "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    dotColor: "bg-purple-500",
    icon: FileText,
  },
  {
    key: "INTERVIEW",
    labelKey: "stageInterview",
    headerBg: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    dotColor: "bg-amber-500",
    icon: Calendar,
  },
  {
    key: "OFFER",
    labelKey: "stageOffer",
    headerBg: "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    dotColor: "bg-indigo-500",
    icon: DollarSign,
  },
  {
    key: "HIRED",
    labelKey: "stageHired",
    headerBg: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    dotColor: "bg-emerald-500",
    icon: CheckCircle2,
  },
  {
    key: "REJECTED",
    labelKey: "stageRejected",
    headerBg: "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    dotColor: "bg-rose-500",
    icon: XCircle,
  },
] as const;

export default function RecruitmentPage() {
  const t = useTranslations("recruitment");
  const tc = useTranslations("common");
  const locale = useLocale();
  const queryClient = useQueryClient();

  // Selected View Tab
  const [viewMode, setViewMode] = useState<string>("pipeline");

  // Filters
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Drag & Drop State
  const [draggedCandidateId, setDraggedCandidateId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Modals
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [jobForm, setJobForm] = useState({
    title: "",
    department_id: "",
    position_id: "",
    employment_type: "FULL_TIME",
    salary_min: "",
    salary_max: "",
    openings_count: "1",
    status: "OPEN",
    closing_date: "",
    description: "",
    requirements: "",
  });

  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [candidateForm, setCandidateForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    job_posting_id: "",
    status: "APPLIED",
    rating: "3",
    offered_salary: "",
    interview_date: "",
    notes: "",
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Convert to Employee Modal
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [candidateToConvert, setCandidateToConvert] = useState<Candidate | null>(null);
  const [convertForm, setConvertForm] = useState({
    role_id: "",
    gender: "other",
    joined_at: new Date().toISOString().split("T")[0],
    base_salary: "600",
  });

  // Queries
  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ["recruitment-dashboard"],
    queryFn: getRecruitmentDashboard,
  });

  const { data: jobsData, isLoading: loadingJobs } = useQuery({
    queryKey: ["recruitment-jobs"],
    queryFn: () => getJobPostings(),
  });

  const { data: candidatesData, isLoading: loadingCandidates } = useQuery({
    queryKey: ["recruitment-candidates"],
    queryFn: () => getCandidates(),
  });

  const { data: deptsData } = useQuery({
    queryKey: ["departments-list"],
    queryFn: () => getDepartments(1, 1, 100),
  });

  const { data: positionsData } = useQuery({
    queryKey: ["positions-list"],
    queryFn: () => getPositions(1, 100),
  });

  const { data: rolesData } = useQuery({
    queryKey: ["roles-list"],
    queryFn: getRoles,
  });

  const departments = deptsData?.data || [];
  const positions = positionsData?.data || [];
  const roles = rolesData?.data || [];
  const jobs = jobsData?.data || [];
  const candidates = candidatesData?.data || [];
  const stats = statsData?.data;

  // Filtered positions based on selected department in Job form
  const availablePositions = useMemo(() => {
    if (!jobForm.department_id) return positions;
    return positions.filter((p: any) => p.department_id === parseInt(jobForm.department_id));
  }, [positions, jobForm.department_id]);

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchJob =
        selectedJobFilter === "ALL" || (c.job_posting_id && c.job_posting_id.toString() === selectedJobFilter);
      const matchSearch =
        !searchQuery ||
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery));
      return matchJob && matchSearch;
    });
  }, [candidates, selectedJobFilter, searchQuery]);

  // Copy Public Job Link Handler
  const handleCopyJobLink = (jobId: number) => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/${locale}/careers/${jobId}`;
    navigator.clipboard.writeText(url);
    toast.success(t("linkCopied") || "Public application link copied to clipboard!");
  };

  // Mutations
  const jobMutation = useMutation({
    mutationFn: (payload: any) =>
      editingJob ? updateJobPosting(editingJob.id, payload) : createJobPosting(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-dashboard"] });

      const createdId = res?.data?.id || editingJob?.id;
      if (createdId && typeof window !== "undefined") {
        const url = `${window.location.origin}/${locale}/careers/${createdId}`;
        navigator.clipboard.writeText(url);
        toast.success(editingJob ? t("jobUpdated") : `${t("jobCreated")} 🔗 ${t("linkCopied")}`);
      } else {
        toast.success(editingJob ? t("jobUpdated") : t("jobCreated"));
      }

      setIsJobModalOpen(false);
      resetJobForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || tc("error"));
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: deleteJobPosting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-dashboard"] });
      toast.success(t("jobDeleted"));
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || tc("error"));
    },
  });

  const candidateMutation = useMutation({
    mutationFn: (formData: FormData | { id: number; data: any }) => {
      if ("id" in formData) {
        return updateCandidate(formData.id, formData.data);
      }
      return editingCandidate ? updateCandidate(editingCandidate.id, formData) : createCandidate(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-dashboard"] });
      toast.success(editingCandidate ? t("candidateUpdated") : t("candidateAdded"));
      setIsCandidateModalOpen(false);
      resetCandidateForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || tc("error"));
    },
  });

  // Fast Rating Click on Kanban Card
  const handleQuickRate = (candidateId: number, rating: number) => {
    candidateMutation.mutate({ id: candidateId, data: { rating } });
  };

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: string }) => updateCandidateStage(id, stage),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-dashboard"] });
      const stageObj = PIPELINE_STAGES.find((s) => s.key === variables.stage);
      toast.success(stageObj ? `${t("stageUpdated")} ➔ ${t(stageObj.labelKey)}` : t("stageUpdated"));
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || tc("error"));
    },
  });

  const deleteCandidateMutation = useMutation({
    mutationFn: deleteCandidate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-dashboard"] });
      toast.success(t("candidateDeleted"));
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || tc("error"));
    },
  });

  const convertMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => convertCandidateToEmployee(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-dashboard"] });
      toast.success(res.message || t("convertedSuccess"));
      setIsConvertModalOpen(false);
      setCandidateToConvert(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || tc("error"));
    },
  });

  // ==========================================
  // DRAG & DROP HANDLERS
  // ==========================================
  const handleDragStart = (e: React.DragEvent, candidateId: number) => {
    e.dataTransfer.setData("text/plain", candidateId.toString());
    e.dataTransfer.effectAllowed = "move";
    setDraggedCandidateId(candidateId);
  };

  const handleDragOver = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStage !== stageKey) {
      setDragOverStage(stageKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverStage(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStageKey: string) => {
    e.preventDefault();
    setDragOverStage(null);
    setDraggedCandidateId(null);

    const candidateIdStr = e.dataTransfer.getData("text/plain");
    if (!candidateIdStr) return;

    const candidateId = parseInt(candidateIdStr);
    const candidate = candidates.find((c) => c.id === candidateId);

    if (candidate && candidate.status !== targetStageKey) {
      stageMutation.mutate({ id: candidateId, stage: targetStageKey });
    }
  };

  const handleDragEnd = () => {
    setDraggedCandidateId(null);
    setDragOverStage(null);
  };

  // Helpers
  const resetJobForm = () => {
    setEditingJob(null);
    setJobForm({
      title: "",
      department_id: "",
      position_id: "",
      employment_type: "FULL_TIME",
      salary_min: "",
      salary_max: "",
      openings_count: "1",
      status: "OPEN",
      closing_date: "",
      description: "",
      requirements: "",
    });
  };

  const handleOpenEditJob = (job: JobPosting) => {
    setEditingJob(job);
    setJobForm({
      title: job.title,
      department_id: job.department_id.toString(),
      position_id: job.position_id.toString(),
      employment_type: job.employment_type || "FULL_TIME",
      salary_min: job.salary_min ? job.salary_min.toString() : "",
      salary_max: job.salary_max ? job.salary_max.toString() : "",
      openings_count: job.openings_count.toString(),
      status: job.status,
      closing_date: job.closing_date ? job.closing_date.split("T")[0] : "",
      description: job.description || "",
      requirements: job.requirements || "",
    });
    setIsJobModalOpen(true);
  };

  const resetCandidateForm = () => {
    setEditingCandidate(null);
    setCandidateForm({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      job_posting_id: "",
      status: "APPLIED",
      rating: "3",
      offered_salary: "",
      interview_date: "",
      notes: "",
    });
    setResumeFile(null);
  };

  const handleOpenEditCandidate = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setCandidateForm({
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: candidate.email,
      phone: candidate.phone || "",
      job_posting_id: candidate.job_posting_id ? candidate.job_posting_id.toString() : "",
      status: candidate.status,
      rating: (candidate.rating || 3).toString(),
      offered_salary: candidate.offered_salary ? candidate.offered_salary.toString() : "",
      interview_date: candidate.interview_date ? candidate.interview_date.split("T")[0] : "",
      notes: candidate.notes || "",
    });
    setResumeFile(null);
    setIsCandidateModalOpen(true);
  };

  const handleOpenConvertModal = (candidate: Candidate) => {
    setCandidateToConvert(candidate);
    const defaultRoleId = roles.length > 0 ? roles[0].id.toString() : "";
    setConvertForm({
      role_id: defaultRoleId,
      gender: "other",
      joined_at: new Date().toISOString().split("T")[0],
      base_salary: candidate.offered_salary ? candidate.offered_salary.toString() : "600",
    });
    setIsConvertModalOpen(true);
  };

  const handleJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobForm.title || !jobForm.department_id || !jobForm.position_id) {
      return toast.error(tc("error"));
    }
    jobMutation.mutate(jobForm);
  };

  const handleCandidateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateForm.first_name || !candidateForm.last_name || !candidateForm.email) {
      return toast.error(tc("error"));
    }
    const formData = new FormData();
    Object.entries(candidateForm).forEach(([key, val]) => {
      if (val !== undefined && val !== null) formData.append(key, val);
    });
    if (resumeFile) {
      formData.append("resume", resumeFile);
    }
    candidateMutation.mutate(formData);
  };

  const handleConvertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateToConvert) return;
    convertMutation.mutate({
      id: candidateToConvert.id,
      data: {
        role_id: convertForm.role_id ? parseInt(convertForm.role_id) : undefined,
        gender: convertForm.gender,
        joined_at: convertForm.joined_at,
        base_salary: convertForm.base_salary,
      },
    });
  };

  const getInitials = (fn: string, ln: string) => {
    return `${fn?.[0] || ""}${ln?.[0] || ""}`.toUpperCase() || "C";
  };

  if (loadingJobs && loadingCandidates) {
    return <LoadingState variant="dashboard" />;
  }

  const statCards = [
    {
      label: t("openPositions"),
      value: stats?.openJobs || 0,
      subtext: `${stats?.totalJobs || 0} ${t("totalPostings")}`,
      icon: Briefcase,
      iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400",
    },
    {
      label: t("totalApplicants"),
      value: stats?.totalCandidates || 0,
      subtext: `${stats?.stageMap?.APPLIED || 0} ${t("newApplications")}`,
      icon: Users,
      iconBg: "bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400",
    },
    {
      label: t("inInterview"),
      value: stats?.stageMap?.INTERVIEW || 0,
      subtext: `${stats?.stageMap?.OFFER || 0} ${t("inOfferStage")}`,
      icon: Calendar,
      iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
    },
    {
      label: t("hiredCandidates"),
      value: stats?.hiredCandidates || 0,
      subtext: t("readyForOnboarding"),
      icon: Sparkles,
      iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
    },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* ── TOP HEADER (Standard Sarana HR System Layout) ────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("description")}</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="rounded-xl gap-2 h-10 px-4 font-medium shadow-xs"
            onClick={() => {
              resetJobForm();
              setIsJobModalOpen(true);
            }}
          >
            <Plus className="size-4" />
            {t("postJob")}
          </Button>

          <Button
            className="rounded-xl gap-2 h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
            onClick={() => {
              resetCandidateForm();
              setIsCandidateModalOpen(true);
            }}
          >
            <UserPlus className="size-4" />
            {t("addCandidate")}
          </Button>
        </div>
      </div>

      {/* ── STAT METRICS (Standard Sarana HR System Card Grid) ───────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <Card key={i} className="rounded-2xl border bg-card shadow-xs hover:shadow-sm transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                <div className="text-2xl font-bold text-foreground">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.subtext}</p>
              </div>
              <div className={`p-3 rounded-2xl ${card.iconBg}`}>
                <card.icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── TABS & CONTROLS (Standard Sarana UI Toolbar) ─────────────────────── */}
      <Tabs defaultValue="pipeline" value={viewMode} onValueChange={setViewMode} className="w-full space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-2 rounded-2xl border shadow-xs">
          <TabsList className="bg-muted/60 p-1 rounded-xl h-auto">
            <TabsTrigger value="pipeline" className="rounded-lg gap-2 py-2 px-3.5 text-xs font-semibold">
              <Kanban className="size-3.5" />
              {t("tabPipeline")}
              <span
                className={`ml-1.5 text-[11px] font-bold px-2 py-0.5 min-w-[20px] rounded-full inline-flex items-center justify-center transition-colors ${
                  viewMode === "pipeline"
                    ? "bg-white text-primary shadow-xs"
                    : "bg-muted-foreground/15 text-muted-foreground"
                }`}
              >
                {candidates.length}
              </span>
            </TabsTrigger>

            <TabsTrigger value="list" className="rounded-lg gap-2 py-2 px-3.5 text-xs font-semibold">
              <List className="size-3.5" />
              {t("tabList")}
            </TabsTrigger>

            <TabsTrigger value="jobs" className="rounded-lg gap-2 py-2 px-3.5 text-xs font-semibold">
              <Briefcase className="size-3.5" />
              {t("tabJobs")}
              <span
                className={`ml-1.5 text-[11px] font-bold px-2 py-0.5 min-w-[20px] rounded-full inline-flex items-center justify-center transition-colors ${
                  viewMode === "jobs"
                    ? "bg-white text-primary shadow-xs"
                    : "bg-muted-foreground/15 text-muted-foreground"
                }`}
              >
                {jobs.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto px-1">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder={t("searchCandidates")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 rounded-xl text-xs bg-background"
              />
            </div>

            <Select value={selectedJobFilter} onValueChange={setSelectedJobFilter}>
              <SelectTrigger className="w-full sm:w-52 h-9 rounded-xl text-xs bg-background">
                <SelectValue placeholder={t("allJobs")} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">{t("allJobs")}</SelectItem>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id.toString()}>
                    {j.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── TAB 1: KANBAN PIPELINE BOARD WITH DRAG & DROP ───────────────────── */}
        <TabsContent value="pipeline" className="space-y-4 outline-none">
          <div className="overflow-x-auto custom-scrollbar pb-4 pt-1">
            <div className="flex gap-4 items-start min-w-max">
              {PIPELINE_STAGES.map((stage) => {
                const stageCandidates = filteredCandidates.filter((c) => c.status === stage.key);
                const StageIcon = stage.icon;
                const isOver = dragOverStage === stage.key;

                return (
                  <div
                    key={stage.key}
                    onDragOver={(e) => handleDragOver(e, stage.key)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, stage.key)}
                    className={`w-[320px] shrink-0 border rounded-2xl p-3 flex flex-col min-h-[580px] max-h-[78vh] transition-all duration-200 ${
                      isOver
                        ? "ring-2 ring-primary ring-offset-2 bg-primary/10 border-primary shadow-md"
                        : "bg-slate-100/80 dark:bg-slate-900/50 border-slate-200/90 dark:border-slate-800"
                    }`}
                  >
                    {/* Column Header */}
                    <div className={`p-3 rounded-xl border mb-3 flex items-center justify-between shadow-2xs ${stage.headerBg}`}>
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <span className={`size-2 rounded-full ${stage.dotColor}`} />
                        <StageIcon className="size-4" />
                        <span>{t(stage.labelKey)}</span>
                      </div>
                      <Badge variant="secondary" className="px-2 py-0.5 text-xs font-bold rounded-full bg-background/80 shadow-2xs">
                        {stageCandidates.length}
                      </Badge>
                    </div>

                    {/* Column Candidate Cards */}
                    <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1.5">
                      {stageCandidates.length === 0 ? (
                        <div
                          className={`text-center py-16 px-4 text-xs border border-dashed rounded-xl transition-all flex flex-col items-center justify-center gap-2 ${
                            isOver
                              ? "border-primary text-primary font-semibold bg-primary/10 scale-102"
                              : "border-slate-300/80 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 bg-white/40 dark:bg-slate-800/30"
                          }`}
                        >
                          <Inbox className="size-6 text-slate-400 dark:text-slate-500" />
                          <span>{isOver ? "Drop candidate here" : t("noCandidatesInStage")}</span>
                        </div>
                      ) : (
                        stageCandidates.map((candidate) => {
                          const isDragging = draggedCandidateId === candidate.id;

                          return (
                            <div
                              key={candidate.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, candidate.id)}
                              onDragEnd={handleDragEnd}
                              className={`rounded-2xl border p-4 space-y-3 transition-all cursor-grab active:cursor-grabbing group overflow-hidden ${
                                isDragging
                                  ? "opacity-40 scale-95 border-dashed border-primary bg-primary/5"
                                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600"
                              }`}
                            >
                              {/* Top row: Drag Grip + Avatar + Name + Dropdown */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <GripVertical className="size-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 shrink-0 transition-colors cursor-grab" />
                                  <Avatar className="size-9 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200 shrink-0">
                                    <AvatarFallback>
                                      {getInitials(candidate.first_name, candidate.last_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                                      {candidate.first_name} {candidate.last_name}
                                    </h4>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                                      {candidate.email}
                                    </p>
                                  </div>
                                </div>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="size-7 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg">
                                      <MoreVertical className="size-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44 text-xs rounded-xl">
                                    <DropdownMenuItem onClick={() => handleOpenEditCandidate(candidate)}>
                                      <Edit2 className="size-3.5 mr-2" />
                                      {tc("edit")}
                                    </DropdownMenuItem>
                                    {candidate.resume_url && (
                                      <DropdownMenuItem asChild>
                                        <a
                                          href={candidate.resume_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center"
                                        >
                                          <Download className="size-3.5 mr-2" />
                                          {t("downloadResume")}
                                        </a>
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => deleteCandidateMutation.mutate(candidate.id)}
                                      className="text-rose-600 dark:text-rose-400"
                                    >
                                      <Trash2 className="size-3.5 mr-2" />
                                      {tc("delete")}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              {/* Job Title Badge */}
                              {candidate.jobposting && (
                                <div className="w-full flex items-center text-[11px] font-semibold py-1.5 px-3 rounded-xl gap-2 text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 truncate">
                                  <Briefcase className="size-3.5 text-slate-500 shrink-0" />
                                  <span className="truncate">{candidate.jobposting.title}</span>
                                </div>
                              )}

                              {/* Interactive Clickable Stars + Phone */}
                              <div className="flex items-center justify-between text-xs pt-0.5">
                                <div className="flex items-center gap-0.5" title="Click stars to rate">
                                  {[1, 2, 3, 4, 5].map((starVal) => (
                                    <button
                                      key={starVal}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuickRate(candidate.id, starVal);
                                      }}
                                      className="p-0.5 hover:scale-125 transition-transform text-amber-500 focus:outline-none"
                                      title={`Rate ${starVal}/5`}
                                    >
                                      <Star
                                        className={`size-3.5 ${
                                          starVal <= (candidate.rating || 0)
                                            ? "fill-amber-400 text-amber-500"
                                            : "text-slate-300 dark:text-slate-600 hover:text-amber-400"
                                        }`}
                                      />
                                    </button>
                                  ))}
                                </div>

                                {candidate.phone && (
                                  <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                    <Phone className="size-2.5 text-slate-400" />
                                    {candidate.phone}
                                  </span>
                                )}
                              </div>

                              {/* Interview Badge */}
                              {candidate.interview_date && candidate.status === "INTERVIEW" && (
                                <div className="text-[11px] bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 rounded-xl px-2.5 py-1.5 flex items-center gap-2 font-medium">
                                  <Calendar className="size-3.5 shrink-0 text-amber-600" />
                                  <span>{new Date(candidate.interview_date).toLocaleDateString()}</span>
                                </div>
                              )}

                              {/* Convert to Employee Action (If Hired) */}
                              {candidate.status === "HIRED" && (
                                <div className="pt-1">
                                  {candidate.hired_employee_id ? (
                                    <div className="w-full py-1.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5">
                                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                                      {t("alreadyConverted")}
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenConvertModal(candidate);
                                      }}
                                      className="w-full h-9 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                                    >
                                      <Sparkles className="size-4" />
                                      {t("convertToEmployee")}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 2: CANDIDATE LIST TABLE ─────────────────────────────────────── */}
        <TabsContent value="list" className="space-y-4 outline-none">
          <Card className="rounded-2xl border shadow-xs overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="font-bold">{tc("name")}</TableHead>
                  <TableHead className="font-bold">{tc("position")}</TableHead>
                  <TableHead className="font-bold">{t("stage")}</TableHead>
                  <TableHead className="font-bold">{t("ratingStars")}</TableHead>
                  <TableHead className="font-bold">{tc("phone")}</TableHead>
                  <TableHead className="text-right font-bold">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      {tc("noData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCandidates.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/20">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8 rounded-xl font-bold text-xs bg-primary/10 text-primary">
                            <AvatarFallback>{getInitials(c.first_name, c.last_name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-sm">
                              {c.first_name} {c.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground">{c.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.jobposting ? (
                          <div>
                            <div className="font-medium text-xs text-foreground">{c.jobposting.title}</div>
                            <div className="text-[11px] text-muted-foreground">{c.jobposting.department?.name}</div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-semibold text-xs rounded-lg px-2 py-0.5">
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((starVal) => (
                            <button
                              key={starVal}
                              type="button"
                              onClick={() => handleQuickRate(c.id, starVal)}
                              className="p-0.5 hover:scale-125 transition-transform text-amber-500 focus:outline-none"
                              title={`Rate ${starVal}/5`}
                            >
                              <Star
                                className={`size-3.5 ${
                                  starVal <= (c.rating || 0)
                                    ? "fill-amber-400 text-amber-500"
                                    : "text-slate-300 dark:text-slate-600 hover:text-amber-400"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{c.phone || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {c.status === "HIRED" && !c.hired_employee_id && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenConvertModal(c)}
                              className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1.5"
                            >
                              <Sparkles className="size-3.5" />
                              {t("convertToEmployee")}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg"
                            onClick={() => handleOpenEditCandidate(c)}
                          >
                            <Edit2 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg text-rose-600"
                            onClick={() => deleteCandidateMutation.mutate(c.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── TAB 3: JOB OPENINGS GRID ────────────────────────────────────────── */}
        <TabsContent value="jobs" className="space-y-4 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.length === 0 ? (
              <div className="col-span-full text-center py-16 border rounded-2xl bg-muted/20">
                <Briefcase className="size-12 mx-auto text-muted-foreground/40 mb-3" />
                <h3 className="text-base font-bold">{t("noJobsTitle")}</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">{t("noJobsDesc")}</p>
                <Button onClick={() => setIsJobModalOpen(true)} className="gap-2 rounded-xl">
                  <Plus className="size-4" />
                  {t("postJob")}
                </Button>
              </div>
            ) : (
              jobs.map((job) => (
                <Card
                  key={job.id}
                  className="rounded-2xl border bg-card hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={job.status === "OPEN" ? "default" : "secondary"}
                            className={`text-xs font-semibold rounded-lg px-2.5 py-0.5 ${
                              job.status === "OPEN"
                                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {job.status}
                          </Badge>
                          <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            #{job.id}
                          </span>
                        </div>
                        <CardTitle className="text-base font-bold text-foreground leading-snug">
                          {job.title}
                        </CardTitle>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 rounded-lg text-muted-foreground">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs rounded-xl">
                          <DropdownMenuItem onClick={() => handleCopyJobLink(job.id)}>
                            <Link2 className="size-3.5 mr-2 text-primary" />
                            {t("copyLink")}
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a
                              href={`/${locale}/careers/${job.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center"
                            >
                              <ExternalLink className="size-3.5 mr-2" />
                              {t("viewPublicPage")}
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleOpenEditJob(job)}>
                            <Edit2 className="size-3.5 mr-2" />
                            {tc("edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              jobMutation.mutate({
                                ...job,
                                status: job.status === "OPEN" ? "CLOSED" : "OPEN",
                              })
                            }
                          >
                            <CheckCircle2 className="size-3.5 mr-2" />
                            {job.status === "OPEN" ? t("closeJob") : t("openJob")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => deleteJobMutation.mutate(job.id)}
                            className="text-rose-600 dark:text-rose-400"
                          >
                            <Trash2 className="size-3.5 mr-2" />
                            {tc("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 flex-1 text-xs">
                    <div className="grid grid-cols-2 gap-2 bg-muted/40 p-3 rounded-xl">
                      <div>
                        <span className="font-medium text-[11px] text-muted-foreground block">{tc("department")}</span>
                        <span className="font-semibold text-foreground text-xs">{job.department?.name || "-"}</span>
                      </div>
                      <div>
                        <span className="font-medium text-[11px] text-muted-foreground block">{tc("position")}</span>
                        <span className="font-semibold text-foreground text-xs">{job.position?.name || "-"}</span>
                      </div>
                      <div>
                        <span className="font-medium text-[11px] text-muted-foreground block">{t("openings")}</span>
                        <span className="font-semibold text-foreground text-xs">{job.openings_count}</span>
                      </div>
                      <div>
                        <span className="font-medium text-[11px] text-muted-foreground block">{t("applicants")}</span>
                        <span className="font-semibold text-primary text-xs">{job._count?.candidate || 0}</span>
                      </div>
                    </div>

                    {(job.salary_min || job.salary_max) && (
                      <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                        <DollarSign className="size-4" />
                        <span>
                          ${job.salary_min || 0} - ${job.salary_max || 0} / month
                        </span>
                      </div>
                    )}

                    {job.description && (
                      <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                        {job.description}
                      </p>
                    )}
                  </CardContent>

                  <CardFooter className="px-4 py-3 border-t bg-muted/20 flex items-center gap-2 mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyJobLink(job.id)}
                      className="text-xs font-medium gap-1.5 rounded-xl h-9 px-3 hover:bg-primary/10 hover:text-primary transition-all shrink-0"
                      title={t("copyLink")}
                    >
                      <Link2 className="size-3.5 text-primary" />
                      {t("copyLink")}
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedJobFilter(job.id.toString());
                        setViewMode("pipeline");
                      }}
                      className="text-xs font-medium gap-1.5 rounded-xl flex-1 h-9 hover:bg-primary hover:text-primary-foreground transition-all"
                    >
                      {t("viewApplicants")} ({job._count?.candidate || 0})
                      <ArrowRight className="size-3.5 ml-auto" />
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── MODAL 1: CREATE / EDIT JOB OPENING ───────────────────────────────── */}
      <Dialog open={isJobModalOpen} onOpenChange={setIsJobModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-card">
          <DialogHeader className="p-6 pb-4 border-b bg-card shrink-0">
            <DialogTitle className="text-xl font-bold text-foreground">
              {editingJob ? t("editJob") : t("createJob")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t("jobModalDesc")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleJobSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
              <div className="space-y-1.5">
                <Label className="font-semibold text-xs text-foreground">{t("jobTitle")} *</Label>
                <Input
                  placeholder="e.g. Senior Frontend Developer"
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                  className="rounded-xl h-10 text-xs bg-background border-slate-200 dark:border-slate-700"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-xs text-foreground">{tc("department")} *</Label>
                  <Select
                    value={jobForm.department_id}
                    onValueChange={(val) => setJobForm({ ...jobForm, department_id: val, position_id: "" })}
                  >
                    <SelectTrigger className="rounded-xl h-10 text-xs bg-background border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder={t("selectDepartment")} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {departments.map((dept: any) => (
                        <SelectItem key={dept.id} value={dept.id.toString()} className="text-xs">
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-xs text-foreground">{tc("position")} *</Label>
                  <Select
                    value={jobForm.position_id}
                    onValueChange={(val) => setJobForm({ ...jobForm, position_id: val })}
                    disabled={!jobForm.department_id}
                  >
                    <SelectTrigger className="rounded-xl h-10 text-xs bg-background border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder={t("selectPosition")} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {availablePositions.map((pos: any) => (
                        <SelectItem key={pos.id} value={pos.id.toString()} className="text-xs">
                          {pos.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-xs text-foreground">{t("minSalary")}</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="500"
                      value={jobForm.salary_min}
                      onChange={(e) => setJobForm({ ...jobForm, salary_min: e.target.value })}
                      className="rounded-xl h-10 text-xs pl-9 bg-background border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-xs text-foreground">{t("maxSalary")}</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="1500"
                      value={jobForm.salary_max}
                      onChange={(e) => setJobForm({ ...jobForm, salary_max: e.target.value })}
                      className="rounded-xl h-10 text-xs pl-9 bg-background border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-xs text-foreground">{t("openingsCount")}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={jobForm.openings_count}
                    onChange={(e) => setJobForm({ ...jobForm, openings_count: e.target.value })}
                    className="rounded-xl h-10 text-xs bg-background border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-xs text-foreground">{tc("status")}</Label>
                  <Select
                    value={jobForm.status}
                    onValueChange={(val) => setJobForm({ ...jobForm, status: val })}
                  >
                    <SelectTrigger className="rounded-xl h-10 text-xs bg-background border-slate-200 dark:border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="OPEN" className="text-xs">OPEN</SelectItem>
                      <SelectItem value="CLOSED" className="text-xs">CLOSED</SelectItem>
                      <SelectItem value="DRAFT" className="text-xs">DRAFT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-xs text-foreground">{t("closingDate")}</Label>
                  <Input
                    type="date"
                    value={jobForm.closing_date}
                    onChange={(e) => setJobForm({ ...jobForm, closing_date: e.target.value })}
                    className="rounded-xl h-10 text-xs bg-background border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-xs text-foreground">{t("jobDescription")}</Label>
                <textarea
                  className="w-full min-h-[90px] p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-background text-xs resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder={t("jobDescPlaceholder")}
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="p-5 px-7 pb-6 border-t bg-muted/20 shrink-0 gap-3">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsJobModalOpen(false)}
                className="rounded-xl h-10 text-xs font-semibold px-5"
              >
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={jobMutation.isPending}
                className="rounded-xl h-10 text-xs font-bold px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                {jobMutation.isPending ? tc("saving") : tc("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: ADD / EDIT CANDIDATE ────────────────────────────────────── */}
      <Dialog open={isCandidateModalOpen} onOpenChange={setIsCandidateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-card">
          <DialogHeader className="p-6 pb-4 border-b bg-card shrink-0">
            <DialogTitle className="text-xl font-bold text-foreground">
              {editingCandidate ? t("editCandidate") : t("addCandidate")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t("candidateModalDesc")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCandidateSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              {/* 1. PERSONAL INFORMATION */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="size-3.5 text-primary" />
                  {t("personalInfo")}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs text-foreground">{t("firstName")} *</Label>
                    <Input
                      placeholder="e.g. Sokha"
                      value={candidateForm.first_name}
                      onChange={(e) => setCandidateForm({ ...candidateForm, first_name: e.target.value })}
                      className="rounded-xl h-10 text-xs bg-background border-slate-200 dark:border-slate-700"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs text-foreground">{t("lastName")} *</Label>
                    <Input
                      placeholder="e.g. Chan"
                      value={candidateForm.last_name}
                      onChange={(e) => setCandidateForm({ ...candidateForm, last_name: e.target.value })}
                      className="rounded-xl h-10 text-xs bg-background border-slate-200 dark:border-slate-700"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs text-foreground">{tc("email")} *</Label>
                    <Input
                      type="email"
                      placeholder="sokha.chan@example.com"
                      value={candidateForm.email}
                      onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                      className="rounded-xl h-10 text-xs bg-background border-slate-200 dark:border-slate-700"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs text-foreground">{tc("phone")}</Label>
                    <Input
                      placeholder="012 345 678"
                      value={candidateForm.phone}
                      onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                      className="rounded-xl h-10 text-xs bg-background border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* 2. JOB & APPLICATION STAGE */}
              <div className="space-y-3 pt-2 border-t">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Briefcase className="size-3.5 text-primary" />
                  {t("jobAndStage")}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs text-foreground">{t("applyingForJob")}</Label>
                    <Select
                      value={candidateForm.job_posting_id}
                      onValueChange={(val) => setCandidateForm({ ...candidateForm, job_posting_id: val })}
                    >
                      <SelectTrigger className="rounded-xl h-10 text-xs bg-background border-slate-200 dark:border-slate-700">
                        <SelectValue placeholder={t("selectJob")} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {jobs.map((j) => (
                          <SelectItem key={j.id} value={j.id.toString()} className="text-xs">
                            {j.title} ({j.department?.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs text-foreground">{t("pipelineStage")}</Label>
                    <Select
                      value={candidateForm.status}
                      onValueChange={(val) => setCandidateForm({ ...candidateForm, status: val })}
                    >
                      <SelectTrigger className="rounded-xl h-10 text-xs bg-background border-slate-200 dark:border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {PIPELINE_STAGES.map((s) => (
                          <SelectItem key={s.key} value={s.key} className="text-xs">
                            {t(s.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 3. EVALUATION & COMPENSATION */}
              <div className="space-y-3.5 pt-2 border-t">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Star className="size-3.5 text-amber-500" />
                  {t("evaluationAndOffer")}
                </h4>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold text-xs text-foreground">{t("ratingStars")}</Label>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                      {candidateForm.rating} / 5 Stars
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                    {[1, 2, 3, 4, 5].map((starVal) => (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => setCandidateForm({ ...candidateForm, rating: starVal.toString() })}
                        className="hover:scale-125 transition-transform text-amber-500 focus:outline-none p-1"
                        title={`Rate ${starVal}/5`}
                      >
                        <Star
                          className={`size-6 ${
                            starVal <= parseInt(candidateForm.rating || "3")
                              ? "fill-amber-400 text-amber-500"
                              : "text-slate-300 dark:text-slate-600 hover:text-amber-400"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs text-foreground">{t("offeredSalary")}</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="e.g. 800"
                        value={candidateForm.offered_salary}
                        onChange={(e) => setCandidateForm({ ...candidateForm, offered_salary: e.target.value })}
                        className="rounded-xl h-10 text-xs pl-9 bg-background border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs text-foreground">{t("interviewDate")}</Label>
                    <Input
                      type="date"
                      value={candidateForm.interview_date}
                      onChange={(e) => setCandidateForm({ ...candidateForm, interview_date: e.target.value })}
                      className="rounded-xl h-10 text-xs bg-background border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* 4. RESUME / CV DOCUMENT */}
              <div className="space-y-3 pt-2 border-t">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="size-3.5 text-primary" />
                  {t("resumeUpload")}
                </h4>

                {editingCandidate?.resume_url ? (
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
                        <FileText className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {editingCandidate.first_name}_{editingCandidate.last_name}_Resume.pdf
                        </p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="size-3 shrink-0" />
                          {t("resumeAttached")}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-8 text-xs font-bold rounded-xl gap-1.5 bg-white dark:bg-slate-700 hover:bg-primary hover:text-white shadow-2xs shrink-0"
                    >
                      <a
                        href={
                          editingCandidate.resume_url.startsWith("http")
                            ? editingCandidate.resume_url
                            : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}${
                                editingCandidate.resume_url.startsWith("/") ? "" : "/"
                              }${editingCandidate.resume_url}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="size-3.5" />
                        {t("viewResume")}
                      </a>
                    </Button>
                  </div>
                ) : null}

                {/* Custom Styled File Upload Dropzone */}
                <div className="space-y-1.5">
                  <Label className="font-semibold text-xs text-foreground">
                    {editingCandidate?.resume_url ? t("replaceResume") : t("resumeUpload")}
                  </Label>

                  <input
                    type="file"
                    id="modal-resume-file-input"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setResumeFile(e.target.files[0]);
                      }
                    }}
                  />

                  <label
                    htmlFor="modal-resume-file-input"
                    className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary/60 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-primary/5 transition-all rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer group text-center"
                  >
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                      <UploadCloud className="size-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground">
                        {resumeFile ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 justify-center">
                            <CheckCircle2 className="size-4" />
                            {resumeFile.name}
                          </span>
                        ) : (
                          <span>
                            <span className="text-primary underline mr-1">ចុចទីនេះដើម្បីជ្រើសរើស</span> ឬទាញទម្លាក់ឯកសារ CV
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{t("resumeHelp")}</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 5. INTERVIEWER NOTES */}
              <div className="space-y-1.5 pt-2 border-t">
                <Label className="font-semibold text-xs text-foreground">{t("interviewerNotes")}</Label>
                <textarea
                  className="w-full min-h-[90px] p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-background text-xs resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder={t("notesPlaceholder")}
                  value={candidateForm.notes}
                  onChange={(e) => setCandidateForm({ ...candidateForm, notes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="p-5 px-7 pb-6 border-t bg-muted/20 shrink-0 gap-3">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsCandidateModalOpen(false)}
                className="rounded-xl h-10 text-xs font-semibold px-5"
              >
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={candidateMutation.isPending}
                className="rounded-xl h-10 text-xs font-bold px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                {candidateMutation.isPending ? tc("saving") : tc("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: 1-CLICK CONVERT CANDIDATE TO EMPLOYEE ───────────────────── */}
      <Dialog open={isConvertModalOpen} onOpenChange={setIsConvertModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-card">
          <DialogHeader className="p-6 pb-4 border-b bg-card shrink-0">
            <div className="flex items-center gap-2.5 text-primary mb-1">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Sparkles className="size-5 text-primary" />
              </div>
              <DialogTitle className="text-xl font-bold text-foreground">{t("convertTitle")}</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">{t("convertDesc")}</DialogDescription>
          </DialogHeader>

          {candidateToConvert && (
            <form onSubmit={handleConvertSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                {/* Candidate Info Summary Banner */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-1.5 text-xs">
                  <div className="font-bold text-base text-slate-900 dark:text-slate-100">
                    {candidateToConvert.first_name} {candidateToConvert.last_name}
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2">
                    <Mail className="size-3.5" />
                    {candidateToConvert.email}
                  </div>
                  {candidateToConvert.jobposting && (
                    <div className="font-semibold text-primary pt-1 flex items-center gap-2">
                      <Briefcase className="size-3.5" />
                      {candidateToConvert.jobposting.title} — {candidateToConvert.jobposting.department?.name}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs text-foreground">{tc("role")} *</Label>
                    <Select
                      value={convertForm.role_id}
                      onValueChange={(val) => setConvertForm({ ...convertForm, role_id: val })}
                      required
                    >
                      <SelectTrigger className="rounded-xl h-10 text-xs bg-background border-slate-200 dark:border-slate-700">
                        <SelectValue placeholder={t("selectRole")} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {roles.map((role: any) => (
                          <SelectItem key={role.id} value={role.id.toString()} className="text-xs">
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs text-foreground">{tc("gender")}</Label>
                    <Select
                      value={convertForm.gender}
                      onValueChange={(val) => setConvertForm({ ...convertForm, gender: val })}
                    >
                      <SelectTrigger className="rounded-xl h-10 text-xs bg-background border-slate-200 dark:border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="male" className="text-xs">{tc("male")}</SelectItem>
                        <SelectItem value="female" className="text-xs">{tc("female")}</SelectItem>
                        <SelectItem value="other" className="text-xs">{tc("other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs text-foreground">{t("joinedDate")}</Label>
                    <Input
                      type="date"
                      value={convertForm.joined_at}
                      onChange={(e) => setConvertForm({ ...convertForm, joined_at: e.target.value })}
                      className="rounded-xl h-10 text-xs bg-background border-slate-200 dark:border-slate-700"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs text-foreground">{t("monthlyBaseSalary")} ($)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={convertForm.base_salary}
                        onChange={(e) => setConvertForm({ ...convertForm, base_salary: e.target.value })}
                        className="rounded-xl h-10 text-xs pl-9 bg-background border-slate-200 dark:border-slate-700"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Provisioning Info Box */}
                <div className="p-3.5 bg-muted/40 rounded-2xl text-[12px] text-muted-foreground space-y-1.5 border border-border/40">
                  <p className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                    <span><strong className="text-foreground">{t("autoProvisionTitle")}</strong>: {t("autoProvisionDesc")}</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                    <span><strong className="text-foreground">{t("systemIntegrationTitle")}</strong>: {t("systemIntegrationDesc")}</span>
                  </p>
                </div>
              </div>

              <DialogFooter className="p-5 px-7 pb-6 border-t bg-muted/20 shrink-0 gap-3">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsConvertModalOpen(false)}
                  className="rounded-xl h-10 text-xs font-semibold px-5"
                >
                  {tc("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={convertMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-xl px-6 h-10 text-xs font-bold shadow-sm"
                >
                  <Sparkles className="size-4" />
                  {convertMutation.isPending ? t("converting") : t("confirmConvert")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
