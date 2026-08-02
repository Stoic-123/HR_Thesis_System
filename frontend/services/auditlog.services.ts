import { api } from "@/lib/api";

export const getAuditLogs = async (company_id: number, page = 1, limit = 10) => {
  const res = await api.get(`/api/auditlog/get-all?company_id=${company_id}&page=${page}&limit=${limit}`);
  return res.data;
};
