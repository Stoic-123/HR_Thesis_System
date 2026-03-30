import React from "react";
import { Sidebar } from "@/components/Sidebar";

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
           <h1 className="text-2xl font-bold tracking-tight text-foreground/90">
             Dashboard Workspace
           </h1>
        </header>
        <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/50 dark:bg-zinc-950/20">
          <div className="w-full max-w-6xl mx-auto min-h-[calc(100vh-10rem)] rounded-3xl border border-border/50 bg-card p-10 shadow-sm flex flex-col">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
