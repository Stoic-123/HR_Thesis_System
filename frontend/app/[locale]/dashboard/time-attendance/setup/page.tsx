"use client";

import React from "react";
import { Clock, Calendar, Users, MapPin } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";

// Import the 4 pages
import { TimeSheetPage } from "../../timesheet/page";
import { DayOfWeekPage } from "../../dayofweek/page";
import { EmployeeWorkingProfilePage } from "../../employeeworkingprofile/page";
import { LocationPage } from "../../location/page";

const TimeAttendanceSetupPage = () => {
  const [activeTab, setActiveTab] = React.useState("timesheet");
  const t = useTranslations("timeAttendanceSetup");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4 max-w-3xl">
          <TabsTrigger value="timesheet" className="gap-2">
            <Clock className="size-4" />
            {t("tabTimesheet")}
          </TabsTrigger>
          <TabsTrigger value="dayofweek" className="gap-2">
            <Calendar className="size-4" />
            {t("tabDayOfWeek")}
          </TabsTrigger>
          <TabsTrigger value="employeeworkingprofile" className="gap-2">
            <Users className="size-4" />
            {t("tabEmployee")}
          </TabsTrigger>
          <TabsTrigger value="location" className="gap-2">
            <MapPin className="size-4" />
            {t("tabLocation")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="timesheet">
          <TimeSheetPage />
        </TabsContent>
        <TabsContent value="dayofweek">
          <DayOfWeekPage />
        </TabsContent>
        <TabsContent value="employeeworkingprofile">
          <EmployeeWorkingProfilePage />
        </TabsContent>
        <TabsContent value="location">
          <LocationPage />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TimeAttendanceSetupPage;
