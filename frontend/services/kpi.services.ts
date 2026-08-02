import { api } from "@/lib/api";

const API_URL = "/api/kpi";

export const getCycles = async () => {
  const res = await api.get(`${API_URL}/cycles`);
  return res.data;
};

export const createCycle = async (data: any) => {
  const res = await api.post(`${API_URL}/cycles`, data);
  return res.data;
};

export const getTemplates = async () => {
  const res = await api.get(`${API_URL}/templates`);
  return res.data;
};

export const createTemplate = async (data: any) => {
  const res = await api.post(`${API_URL}/templates`, data);
  return res.data;
};

export const addTemplateGoal = async (templateId: number, data: any) => {
  const res = await api.post(`${API_URL}/templates/${templateId}/goals`, data);
  return res.data;
};

export const assignTemplate = async (data: { template_id: number; department_id: number | string; cycle_id: number }) => {
  const res = await api.post(`${API_URL}/assign`, data);
  return res.data;
};

// Manager
export const getTeamDashboard = async (cycle_id: number) => {
  const res = await api.get(`${API_URL}/team-dashboard`, { 
    params: { cycle_id }
  });
  return res.data;
};

export const submitQuarterlyReview = async (data: any) => {
  const res = await api.post(`${API_URL}/reviews`, data);
  return res.data;
};

export const getEvaluations = async (cycle_id: number) => {
  const res = await api.get(`${API_URL}/evaluations`, { 
    params: { cycle_id }
  });
  return res.data;
};

export const submitHrScore = async (data: any) => {
  const res = await api.post(`${API_URL}/hr-score`, data);
  return res.data;
};

// Employee
export const getMyDashboard = async (cycle_id: number) => {
  const res = await api.get(`${API_URL}/my-dashboard`, { 
    params: { cycle_id }
  });
  return res.data;
};
