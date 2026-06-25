"use client";

import React, { useEffect } from "react";

interface ThemeSetterProps {
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

export function ThemeSetter({ primaryColor, secondaryColor }: ThemeSetterProps) {
  useEffect(() => {
    console.log("ThemeSetter initialized with colors:", { primaryColor, secondaryColor });
    const root = document.documentElement;

    if (primaryColor) {
      root.style.setProperty("--primary", primaryColor);
      root.style.setProperty("--sidebar-primary", primaryColor);
      root.style.setProperty("--sidebar-ring", primaryColor);
    }
    
    if (secondaryColor) {
      root.style.setProperty("--secondary", secondaryColor);
    }
  }, [primaryColor, secondaryColor]);

  // Provide a fallback static injection for SSR/hydration matching if possible,
  // but useEffect is generally safer for global document modifications in Next.js
  return null;
}
