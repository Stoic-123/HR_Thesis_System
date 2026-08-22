import { api } from "@/lib/api";

export type KPIRatingTier = "good" | "average" | "needs_improvement";
export type KPIGrade = "GOOD" | "AVERAGE" | "NEEDS_IMPROVEMENT" | "NONE";
export type KPIStatus = "draft" | "submitted" | "approved" | "acknowledged";

export interface KPIEvaluation {
  id: number;
  company_id: number;
  template_id?: number | null;
  employee_id: number;
  evaluator_id: number;
  month: number;
  year: number;
  discipline_rating: KPIRatingTier;
  output_rating: KPIRatingTier;
  attitude_rating: KPIRatingTier;
  total_score: number | string;
  overall_grade: KPIGrade;
  manager_comment?: string | null;
  employee_feedback?: string | null;
  status: KPIStatus;
  acknowledged_at?: string | null;
  created_at?: string;
  updated_at?: string;
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
    profile_path?: string | null;
  };
  evaluator?: {
    id: number;
    first_name: string;
    last_name: string;
    profile_path?: string | null;
  };
}

export interface EmployeeKPISummary {
  totalEvaluatedMonths: number;
  yearlyAverageScore: number;
  yearlyGrade: KPIGrade;
}

export interface MyKPIResponse {
  evaluations: KPIEvaluation[];
  summary: EmployeeKPISummary;
}

export interface TeamMemberEvaluation {
  employee: {
    id: number;
    first_name: string;
    last_name: string;
    profile_path?: string | null;
    department_id?: number | null;
    position_id?: number | null;
    department_employee_department_idTodepartment?: {
      id: number;
      name: string;
    } | null;
    positions?: {
      id: number;
      name: string;
    } | null;
  };
  evaluation: KPIEvaluation | null;
  isEvaluated: boolean;
}

export interface TeamKPIResponse {
  month: number;
  year: number;
  totalSubordinates: number;
  completedCount: number;
  pendingCount: number;
  team: TeamMemberEvaluation[];
}

export interface CompanyKPIStats {
  totalEmployees: number;
  evaluatedCount: number;
  pendingCount: number;
  completionRate: number;
  averageScore: number;
  goodCount: number;
  avgCount: number;
  needsImpCount: number;
}

export interface CompanyKPIOverviewResponse {
  month: number;
  year: number;
  stats: CompanyKPIStats;
  records: {
    employee: {
      id: number;
      first_name: string;
      last_name: string;
      profile_path?: string | null;
      base_salary?: string | null;
      department_id?: number | null;
      position_id?: number | null;
      department_employee_department_idTodepartment?: {
        id: number;
        name: string;
      } | null;
      positions?: {
        id: number;
        name: string;
      } | null;
    };
    evaluation: KPIEvaluation | null;
    isEvaluated: boolean;
  }[];
}

export interface YearlyKPIEmployeeItem {
  employee: {
    id: number;
    first_name: string;
    last_name: string;
    profile_path?: string | null;
    department_employee_department_idTodepartment?: {
      id: number;
      name: string;
    } | null;
    positions?: {
      id: number;
      name: string;
    } | null;
  };
  months: ({
    month: number;
    discipline: KPIRatingTier;
    output: KPIRatingTier;
    attitude: KPIRatingTier;
    score: number;
    grade: KPIGrade;
  } | null)[];
  evaluatedMonths: number;
  yearlyAverageScore: number;
  yearlyGrade: KPIGrade;
}

export interface YearlyKPISummaryResponse {
  year: number;
  totalEmployees: number;
  employees: YearlyKPIEmployeeItem[];
}

export interface SubmitKPIPayload {
  employeeId: number;
  month: number;
  year: number;
  disciplineRating: KPIRatingTier;
  outputRating: KPIRatingTier;
  attitudeRating: KPIRatingTier;
  managerComment?: string;
  templateId?: number;
}

/**
 * Get personal KPI history
 */
export const getMyKPI = async (year?: number): Promise<MyKPIResponse> => {
  const res = await api.get(`/api/kpi/my-evaluations`, {
    params: { year },
  });
  return res.data?.data;
};

/**
 * Get team members for manager to evaluate
 */
export const getTeamKPI = async (
  month?: number,
  year?: number
): Promise<TeamKPIResponse> => {
  const res = await api.get(`/api/kpi/team`, {
    params: { month, year },
  });
  return res.data?.data;
};

/**
 * Submit or update a subordinate KPI
 */
export const submitKPI = async (
  payload: SubmitKPIPayload
): Promise<KPIEvaluation> => {
  const res = await api.post(`/api/kpi/evaluate`, payload);
  return res.data?.data;
};

/**
 * Get HR/Company monthly KPI overview
 */
export const getCompanyKPIOverview = async (params: {
  month?: number;
  year?: number;
  departmentId?: string | number;
}): Promise<CompanyKPIOverviewResponse> => {
  const res = await api.get(`/api/kpi/overview`, { params });
  return res.data?.data;
};

/**
 * Get 12-month yearly matrix
 */
export const getYearlyKPISummary = async (params: {
  year?: number;
  departmentId?: string | number;
}): Promise<YearlyKPISummaryResponse> => {
  const res = await api.get(`/api/kpi/yearly-summary`, { params });
  return res.data?.data;
};

/**
 * Approve KPI evaluations in bulk
 */
export const approveKPIEvaluations = async (
  evaluationIds: number[]
): Promise<{ count: number }> => {
  const res = await api.post(`/api/kpi/approve`, { evaluationIds });
  return res.data?.data;
};

/**
 * Trigger manager reminders
 */
export const sendKPIReminders = async (payload: {
  month?: number;
  year?: number;
}): Promise<{ success: boolean; remindedManagers: number }> => {
  const res = await api.post(`/api/kpi/remind`, payload);
  return res.data?.data;
};
