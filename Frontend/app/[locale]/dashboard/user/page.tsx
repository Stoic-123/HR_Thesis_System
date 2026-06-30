"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUsers, updateUser } from "@/services/user.services";
import { getRoles } from "@/services/role.services";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function UserPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("user");
  const tc = useTranslations("common");

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersResponse, rolesResponse] = await Promise.all([
        getUsers(),
        getRoles(),
      ]);

      if (usersResponse.result) {
        setUsers(usersResponse.data || []);
      } else {
        setError(usersResponse.message || "Failed to load users.");
      }

      if (rolesResponse.result) {
        setRoles(rolesResponse.data || []);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleChange = async (userId: number, roleId: number) => {
    try {
      setUpdatingId(userId);
      const response = await updateUser(userId, { role_id: roleId });
      if (response.result) {
        // Refresh users list
        const updatedUsers = await getUsers();
        if (updatedUsers.result) {
          setUsers(updatedUsers.data || []);
        }
      } else {
        alert(response.message || "Failed to update role.");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred while updating the role.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t("userList")}</CardTitle>
          {(loading || updatingId !== null) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-red-500 text-sm py-4">{error}</div>
          ) : loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-muted-foreground text-sm py-4 text-center">
              {t("noUsers")}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/35 text-left text-muted-foreground">
                    <th className="px-4 py-3 text-xs font-semibold">{tc("name")}</th>
                    <th className="px-4 py-3 text-xs font-semibold">{tc("email")}</th>
                    <th className="px-4 py-3 text-xs font-semibold">{tc("role")}</th>
                    <th className="px-4 py-3 text-xs font-semibold">{tc("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-white/30 last:border-0 hover:bg-white/5">
                      <td className="px-4 py-3 font-semibold">{u.username}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email || "N/A"}</td>
                      <td className="px-4 py-3">
                        <Select
                          value={String(u.role_id || "")}
                          onValueChange={(val) => handleRoleChange(u.id, Number(val))}
                          disabled={updatingId === u.id}
                        >
                          <SelectTrigger className="h-8 w-[180px] rounded-lg">
                            <SelectValue placeholder={t("selectRole") || "Select Role"} />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((r) => (
                              <SelectItem key={r.id} value={String(r.id)}>
                                {r.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        {u.is_active === 'active' ? (
                          <Badge className="rounded-full bg-emerald-50 text-emerald-700">
                            {tc("active")}
                          </Badge>
                        ) : (
                          <Badge className="rounded-full bg-rose-50 text-rose-700">
                            {tc("inactive")}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
