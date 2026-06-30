import { api } from "@/lib/api";

export const getUsers = async (page = 1, limit = 50) => {
  const res = await api.get(`/api/user/get-user?page=${page}&limit=${limit}`);
  return res.data;
};

export const updateUser = async (
  userId: number,
  data: { telegram_username?: string; email?: string; role_id?: number }
) => {
  const res = await api.put(`/api/user/update-user/${userId}`, data);
  return res.data;
};

