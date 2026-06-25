import { api } from "@/lib/api";

export const getCompany = async () => {
  const res = await api.get("/api/company/get-company");
  return res.data;
};

export const updateCompany = async (formData: FormData) => {
  const res = await api.put("/api/company/update-company", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};
