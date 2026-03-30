import React from "react";
import { LayoutDashboard } from "lucide-react";

const DashboardPage = () => {
  return (
    <div className="flex flex-col items-center justify-center flex-1 h-full w-full min-h-[50vh] animate-in fade-in duration-700">
      <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-primary/10 text-primary">
        <LayoutDashboard className="w-10 h-10 opacity-80" />
      </div>
      <h2 className="text-3xl font-extrabold tracking-tight text-foreground/80 mb-2">
        Dashboard
      </h2>
      <p className="text-muted-foreground max-w-sm text-center">
        Welcome to your HR System workspace. Select an option from the sidebar to quick-start managing your team.
      </p>
    </div>
  );
};

export default DashboardPage;
