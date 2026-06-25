import { api } from "@/lib/api";

export const getRoles = async () => {
  const res = await api.get("/api/role/get-role");
  return res.data;
};

export const addRole = async (name: string) => {
  const res = await api.post("/api/role/add-role", { name });
  return res.data;
};

export const updateRole = async (roleId: number, name: string) => {
  const res = await api.put(`/api/role/update-role/${roleId}`, { name });
  return res.data;
};

export const updateRolePermissions = async (
  roleId: number,
  permissions: { path: string; path_name: string }[]
) => {
  const res = await api.put(`/api/role/update-permissions/${roleId}`, {
    permissions,
  });
  return res.data;
};

