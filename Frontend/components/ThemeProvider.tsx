"use client";

import React, { useEffect } from "react";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    localStorage.removeItem("theme");
    document.documentElement.classList.remove("dark");
  }, []);

  return <>{children}</>;
};

export const useTheme = () => ({
  theme: "light" as const,
  toggleTheme: () => {},
});
