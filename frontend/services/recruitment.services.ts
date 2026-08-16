import { api } from "@/lib/api";

const API_URL = "/api/recruitment";

export interface JobPosting {
  id: number;
  company_id: number;
  department_id: number;
  position_id: number;
  title: string;
  description?: string | null;
  requirements?: string | null;
  employment_type: string;
  salary_min?: number | null;
  salary_max?: number | null;
  openings_count: number;
  status: "DRAFT" | "OPEN" | "CLOSED";
  posted_date?: string | null;
  closing_date?: string | null;
  created_at?: string | null;
  department?: { id: number; name: string };
  position?: { id: number; name: string };
  _count?: { candidate: number };
}

export interface Candidate {
  id: number;
  company_id: number;
  job_posting_id?: number | null;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  resume_url?: string | null;
  cover_letter?: string | null;
  status: "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "HIRED" | "REJECTED";
  rating?: number;
  notes?: string | null;
  interview_date?: string | null;
  offered_salary?: number | null;
  hired_employee_id?: number | null;
  created_at?: string | null;
  jobposting?: {
    id: number;
    title: string;
    department?: { id: number; name: string };
    position?: { id: number; name: string };
  } | null;
  hired_employee?: {
    id: number;
    first_name: string;
    last_name: string;
    email?: string | null;
  } | null;
}

export interface RecruitmentDashboardStats {
  totalJobs: number;
  openJobs: number;
  totalCandidates: number;
  hiredCandidates: number;
  stageMap: {
    APPLIED: number;
    SCREENING: number;
    INTERVIEW: number;
    OFFER: number;
    HIRED: number;
    REJECTED: number;
  };
}

// ==========================================
// API CALLS
// ==========================================
export const getRecruitmentDashboard = async (): Promise<{ result: boolean; data: RecruitmentDashboardStats }> => {
  const res = await api.get(`${API_URL}/dashboard`);
  return res.data;
};

export const getJobPostings = async (params?: any): Promise<{ result: boolean; data: JobPosting[] }> => {
  const res = await api.get(`${API_URL}/jobs`, { params });
  return res.data;
};

export const getJobPostingById = async (id: number): Promise<{ result: boolean; data: JobPosting }> => {
  const res = await api.get(`${API_URL}/jobs/${id}`);
  return res.data;
};

export const createJobPosting = async (data: Partial<JobPosting>) => {
  const res = await api.post(`${API_URL}/jobs`, data);
  return res.data;
};

export const updateJobPosting = async (id: number, data: Partial<JobPosting>) => {
  const res = await api.put(`${API_URL}/jobs/${id}`, data);
  return res.data;
};

export const deleteJobPosting = async (id: number) => {
  const res = await api.delete(`${API_URL}/jobs/${id}`);
  return res.data;
};

export const getCandidates = async (params?: any): Promise<{ result: boolean; data: Candidate[] }> => {
  const res = await api.get(`${API_URL}/candidates`, { params });
  return res.data;
};

export const getCandidateById = async (id: number): Promise<{ result: boolean; data: Candidate }> => {
  const res = await api.get(`${API_URL}/candidates/${id}`);
  return res.data;
};

export const createCandidate = async (formData: FormData | Record<string, any>) => {
  const headers = formData instanceof FormData ? { "Content-Type": "multipart/form-data" } : {};
  const res = await api.post(`${API_URL}/candidates`, formData, { headers });
  return res.data;
};

export const updateCandidate = async (id: number, formData: FormData | Record<string, any>) => {
  const headers = formData instanceof FormData ? { "Content-Type": "multipart/form-data" } : {};
  const res = await api.put(`${API_URL}/candidates/${id}`, formData, { headers });
  return res.data;
};

export const updateCandidateStage = async (id: number, stage: string) => {
  const res = await api.patch(`${API_URL}/candidates/${id}/stage`, { stage });
  return res.data;
};

export const deleteCandidate = async (id: number) => {
  const res = await api.delete(`${API_URL}/candidates/${id}`);
  return res.data;
};

export const convertCandidateToEmployee = async (id: number, data: any) => {
  const res = await api.post(`${API_URL}/candidates/${id}/convert-to-employee`, data);
  return res.data;
};

// ==========================================
// PUBLIC CAREERS API
// ==========================================
export const getPublicJob = async (id: string | number): Promise<{ result: boolean; data: any }> => {
  const res = await api.get(`${API_URL}/public/jobs/${id}`);
  return res.data;
};

export const submitPublicApplication = async (formData: FormData) => {
  const res = await api.post(`${API_URL}/public/apply`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

