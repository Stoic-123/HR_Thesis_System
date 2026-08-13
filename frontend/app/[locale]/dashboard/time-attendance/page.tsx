"use client";

import { useEffect } from "react";
import { useRouter } from "@/src/i18n/routing";

export default function TimeAttendancePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/time-attendance/report");
  }, [router]);

  return null;
}
