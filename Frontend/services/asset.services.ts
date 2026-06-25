import { api } from "@/lib/api";

const API_URL = "/api/asset";

export type AssetCategory = {
  id: number;
  name: string;
  description: string;
};

export type Asset = {
  id: number;
  category_id: number;
  name: string;
  serial_number: string;
  condition: string;
  status: string;
  assigned_to: number | null;
  assigned_date: string | null;
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
    profile_path?: string;
  };
  category?: AssetCategory;
};

export type AssetRequest = {
  id: number;
  requested_by: number;
  category_id?: number | null;
  asset_id?: number | null;
  type: string;
  reason?: string;
  status: string;
  manager_comment?: string;
  hr_comment?: string;
  created_at: string;
  employee?: {
    first_name: string;
    last_name: string;
    profile_path?: string;
  };
  manager?: {
    first_name: string;
    last_name: string;
  };
  category?: AssetCategory;
  asset?: Asset;
};

export const getAssetCategories = async () => {
  const res = await api.get(`${API_URL}/categories`);
  return res.data;
};

export const createAssetCategory = async (data: { name: string; description?: string }) => {
  const res = await api.post(`${API_URL}/categories`, data);
  return res.data;
};

export const getAssets = async () => {
  const res = await api.get(`${API_URL}`);
  return res.data;
};

export const createAsset = async (data: any) => {
  const res = await api.post(`${API_URL}`, data);
  return res.data;
};

export const directAssignAsset = async (id: number, data: { employee_id: number; condition_out?: string }) => {
  const res = await api.post(`${API_URL}/${id}/direct-assign`, data);
  return res.data;
};

export const confirmReturnAsset = async (id: number, data: { condition_in?: string; return_status?: string }) => {
  const res = await api.post(`${API_URL}/${id}/confirm-return`, data);
  return res.data;
};

export const getAssetRequests = async () => {
  const res = await api.get(`${API_URL}/requests`);
  return res.data;
};

export const getAssetRequestsMobile = async () => {
  const res = await api.get(`${API_URL}/requests/mobile`);
  return res.data;
};

export const createAssetRequest = async (data: any) => {
  const res = await api.post(`${API_URL}/requests`, data);
  return res.data;
};

export const approveManagerAssetRequest = async (id: number, data: { action: 'approve' | 'reject'; manager_comment?: string }) => {
  const res = await api.post(`${API_URL}/requests/${id}/approve-manager`, data);
  return res.data;
};

export const approveHRAssetRequest = async (id: number, data: { asset_id?: number; hr_comment?: string; condition_out?: string }) => {
  const res = await api.post(`${API_URL}/requests/${id}/approve-hr`, data);
  return res.data;
};
