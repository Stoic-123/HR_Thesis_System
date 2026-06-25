import { api } from "@/lib/api";

export const getDocumentTypes = async (page = 1, limit = 100) => {
  const res = await api.get(`/api/document/get-document-type?page=${page}&limit=${limit}`);
  return res.data;
};

export const addDocumentType = async (name: string) => {
  const res = await api.post("/api/document/add-document-type", { name });
  return res.data;
};

export const updateDocumentType = async (id: string, name: string) => {
  const res = await api.put(`/api/document/update-document-type/${id}`, { name });
  return res.data;
};

export const deleteDocumentType = async (id: string) => {
  const res = await api.delete(`/api/document/delete-document-type/${id}`);
  return res.data;
};

