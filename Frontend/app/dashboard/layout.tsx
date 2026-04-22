import React from "react";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Search } from "lucide-react";
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 transition-opacity duration-300">
        <header className="h-20 flex items-center px-8 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex justify-between w-full items-center">
            <div className="w-1/2">
              <Field orientation="horizontal">
                <Input
                  className="py-5 bg-blue-50 border-0"
                  type="search"
                  placeholder="Search..."
                />
                <Button className="py-5 px-6">
                  <Search />
                  Search
                </Button>
              </Field>
            </div>
            <div>
              <Avatar className="h-11 w-11 cursor-pointer">
                <AvatarImage
                  src="https://github.com/shadcn.png"
                  alt="@shadcn"
                />
                <AvatarFallback>CN</AvatarFallback>
                <AvatarBadge className="bg-green-600 dark:bg-green-800" />
              </Avatar>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/50 dark:bg-zinc-950/20">
          {children}
        </div>
      </main>
    </div>
  );
}
