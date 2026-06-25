"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUsers } from "@/services/user.services";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function UserPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("user");
  const tc = useTranslations("common");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const data = await getUsers();
        if (data.result) {
          setUsers(data.data || []);
        } else {
          setError(data.message || "Failed to load users.");
        }
      } catch (err: any) {
        setError(err.message || "An error occurred while fetching users.");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

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
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
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
                        <Badge className="rounded-full bg-primary/10 text-primary">
                          {u.name || "Employee"}
                        </Badge>
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
