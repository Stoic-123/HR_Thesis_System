"use client";

import { useEffect } from "react";
import { useRouter } from "@/src/i18n/routing";

const TimeModeRedirectPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/time-attendance/setup");
  }, [router]);

  return null;
};

export default TimeModeRedirectPage;
