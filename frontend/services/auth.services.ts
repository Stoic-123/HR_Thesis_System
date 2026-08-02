import { api } from "@/lib/api";

export const getMe = async () => {
  const res = await api.get("/api/auth/getMe");

  return res.data;
};

export const changePassword = async (data: {
  current_password: string;
  new_password: string;
  confirm_password: string;
}) => {
  const res = await api.post("/api/auth/change-password", data);
  return res.data;
};

export const updateProfile = async (formData: FormData) => {
  const res = await api.put("/api/auth/update-profile", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};
