import { api } from "@/lib/api";

export const getUsers = async (page = 1, limit = 50) => {
  const res = await api.get(`/api/user/get-user?page=${page}&limit=${limit}`);
  return res.data;
};
