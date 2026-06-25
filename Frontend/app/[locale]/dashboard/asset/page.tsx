"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Laptop, ListTree, PackageSearch } from "lucide-react";
import { Link } from "@/src/i18n/routing";

export default function AssetDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Asset Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage company assets, categories, and assignments.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/dashboard/asset/inventory">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Inventory</CardTitle>
              <PackageSearch className="size-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>View all assets, their status, and manage direct assignments or returns.</CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/asset/categories">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Categories</CardTitle>
              <ListTree className="size-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>Manage asset types like Laptops, Phones, or Vehicles.</CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
