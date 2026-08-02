"use client";

import React, { useState } from "react";
import { useCompany } from "@/hooks/useCompany";
import { useTranslations } from "next-intl";

export interface EmployeeCardData {
  id: string | number;
  code?: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  position_name?: string;
  department_name?: string;
  profile_path?: string;
  joined_at?: string;
  phone_number1?: string;
  email?: string;
}

export interface CompanyData {
  name?: string;
  email?: string;
  phone?: string;
  primary_color?: string;
  secondary_color?: string;
  logo_path?: string;
  address?: string;
}

interface EmployeeCardProps {
  employee: EmployeeCardData;
  company?: CompanyData;
  side?: "front" | "back" | "both";
  issueDate?: string;
  expireDate?: string;
}

function getFullImageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path;
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  company: propCompany,
  side = "both",
  issueDate,
  expireDate,
}) => {
  const t = useTranslations("employeeCard");
  const { data: fetchedCompanyData } = useCompany();
  const companyData: CompanyData = propCompany || fetchedCompanyData?.data || fetchedCompanyData || {};

  const [profileImgError, setProfileImgError] = useState(false);
  const [logoImgError, setLogoImgError] = useState(false);

  React.useEffect(() => {
    setProfileImgError(false);
  }, [employee.profile_path, employee.id]);

  React.useEffect(() => {
    setLogoImgError(false);
  }, [companyData.logo_path]);

  const primaryColor = companyData.primary_color || "#F58220";
  const secondaryColor = companyData.secondary_color || "#2575FC";
  const companyName = companyData.name || "COMPANY NAME";
  const companyEmail = companyData.email || "info@company.com";
  const companyPhone = companyData.phone || "086 588 777 / 078 588 777";
  const companyLogoUrl = getFullImageUrl(companyData.logo_path);

  // Format Name: Split into first word (secondary color) and remaining words (primary color)
  const fullName = (employee.full_name || `${employee.first_name || ""} ${employee.last_name || ""}`).trim();
  const nameParts = fullName.split(" ");
  const firstNameStr = nameParts[0] || employee.first_name || "FIRSTNAME";
  const lastNameStr = nameParts.slice(1).join(" ") || employee.last_name || "LASTNAME";

  const formattedId = employee.code
    ? employee.code
    : `NSM ${String(employee.id).padStart(3, "0")}`;

  const formattedIssueDate = issueDate || formatDate(employee.joined_at) || "27 Jul 2026";
  const formattedExpireDate = expireDate || calculateExpireDate(employee.joined_at) || "27 Jul 2028";

  const profileImageUrl = getFullImageUrl(employee.profile_path);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-8 p-2 font-sans select-none">
      {/* FRONT SIDE CARD */}
      {(side === "front" || side === "both") && (
        <div
          id={`employee-card-front-${employee.id}`}
          className="relative w-[340px] h-[540px] bg-[#FFFFFF] shadow-2xl overflow-hidden flex flex-col border border-[#E5E7EB]"
          style={{ width: "340px", height: "540px", minWidth: "340px", minHeight: "540px" }}
        >
          {/* Top Primary & Secondary Color Wave Header SVG */}
          <div className="relative w-full h-[220px] shrink-0">
            <svg
              className="absolute top-0 left-0 w-full h-[220px]"
              viewBox="0 0 340 220"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Secondary Color Wave (Background Layer - Blue) */}
              <path
                d="M 0 0 H 340 V 115 C 220 115 120 175 0 175 Z"
                fill={secondaryColor}
              />
              
              {/* Primary Color Wave (Foreground Layer - Red) */}
              <path 
                d="M 0 0 H 340 V 90 C 220 90 120 150 0 150 Z" 
                fill={primaryColor} 
              />
            </svg>

            {/* Profile Avatar Frame */}
            <div className="absolute top-[35px] left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
              <div
                className="relative w-[160px] h-[160px] rounded-full bg-[#FFFFFF] p-[5px] shadow-md flex items-center justify-center border-[4px]"
                style={{ borderColor: primaryColor }}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-[#F3F4F6] flex items-center justify-center">
                  {profileImageUrl && !profileImgError ? (
                    <img
                      src={profileImageUrl}
                      alt={`${firstNameStr} ${lastNameStr}`}
                      className="w-full h-full object-cover"
                      onError={() => setProfileImgError(true)}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-[#FFFFFF] font-extrabold text-3xl"
                      style={{ background: `linear-gradient(to top right, ${secondaryColor}, ${primaryColor})` }}
                    >
                      {firstNameStr[0]}
                      {lastNameStr[0]}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Employee Details Content */}
          <div className="flex-1 flex flex-col items-center text-center px-4 pt-3 pb-6 space-y-2 z-10 bg-[#FFFFFF]">
            {/* Two-tone Employee Name using Company Primary & Secondary Colors */}
            <div className="mt-1">
              <h2 className="text-2xl font-extrabold tracking-tight uppercase leading-tight flex items-center justify-center gap-2 flex-wrap">
                <span style={{ color: secondaryColor }}>{firstNameStr}</span>
                <span style={{ color: primaryColor }}>{lastNameStr}</span>
              </h2>
            </div>

            {/* Job Position */}
            <p className="text-base font-semibold text-[#4B5563] mt-1">
              {employee.position_name || t("companyStaff")}
            </p>

            {/* Fields: ID No, Issue Date, Expire Date */}
            <div className="space-y-1.5 pt-3 text-[#4B5563] text-base font-medium">
              <div className="flex items-center justify-center gap-1.5">
                <span>{t("idNo")}</span>
                <span className="font-semibold text-[#1F2937]">{formattedId}</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <span>{t("issueDate")}</span>
                <span className="font-semibold text-[#1F2937]">{formattedIssueDate}</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <span>{t("expireDate")}</span>
                <span className="font-semibold text-[#1F2937]">{formattedExpireDate}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BACK SIDE CARD */}
      {(side === "back" || side === "both") && (
        <div
          id={`employee-card-back-${employee.id}`}
          className="relative w-[340px] h-[540px] bg-[#FFFFFF] shadow-2xl overflow-hidden flex flex-col justify-between p-6 pb-8 border border-[#E5E7EB]"
          style={{ width: "340px", height: "540px", minWidth: "340px", minHeight: "540px" }}
        >
          {/* Top-Left Primary Color Corner Curve Accent */}
          <svg
            className="absolute top-0 left-0 w-[160px] h-[160px] pointer-events-none z-0"
            viewBox="0 0 160 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M0 0H160C80 0 0 60 0 160V0Z" fill={primaryColor} />
          </svg>

          {/* Bottom-Right Secondary Color Corner Wave Accent */}
          <svg
            className="absolute bottom-0 right-0 w-[200px] h-[300px] pointer-events-none z-0"
            viewBox="0 0 200 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M200 300V60C200 170 90 240 0 300H200Z"
              fill={secondaryColor}
            />
          </svg>

          {/* Unified Center Content: Logo + Info with tight, clean spacing */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center space-y-5 pt-4 px-2">
            {/* Company Logo / Brand Header */}
            <div className="flex flex-col items-center justify-center">
              {companyLogoUrl && !logoImgError ? (
                <div className="max-w-[240px] max-h-[110px] flex items-center justify-center p-1">
                  <img
                    src={companyLogoUrl}
                    alt={companyName}
                    className="max-w-full max-h-[110px] object-contain drop-shadow-sm"
                    onError={() => setLogoImgError(true)}
                  />
                </div>
              ) : (
                <div className="w-[220px] h-[75px] relative flex flex-col items-center justify-center">
                  <svg viewBox="0 0 220 80" className="w-full h-full">
                    <ellipse
                      cx="110"
                      cy="40"
                      rx="95"
                      ry="32"
                      fill="none"
                      stroke={primaryColor}
                      strokeWidth="4"
                      strokeDasharray="180 180"
                      transform="rotate(-8 110 40)"
                    />
                    <ellipse
                      cx="110"
                      cy="40"
                      rx="95"
                      ry="32"
                      fill="none"
                      stroke={secondaryColor}
                      strokeWidth="4"
                      strokeDasharray="0 180 180"
                      transform="rotate(-8 110 40)"
                    />
                    <text
                      x="110"
                      y="43"
                      textAnchor="middle"
                      fill={primaryColor}
                      fontSize="24"
                      fontWeight="900"
                      fontFamily="sans-serif"
                      letterSpacing="1"
                    >
                      {companyName.length > 15 ? companyName.substring(0, 15) : companyName}
                    </text>
                  </svg>
                </div>
              )}
            </div>

            {/* Show Company Name text only if fallback logo is used */}
            {(!companyLogoUrl || logoImgError) && (
              <h3 className="font-extrabold text-xl tracking-tight uppercase text-center" style={{ color: primaryColor }}>
                {companyName}
              </h3>
            )}

            {/* Divider Line */}
            <div className="w-20 h-0.5 rounded-full" style={{ backgroundColor: secondaryColor }} />

            {/* Company Info */}
            <div className="space-y-4 text-center text-[#374151] w-full">
              {/* Email */}
              <div className="space-y-1">
                <p className="text-xs text-[#6B7280] uppercase tracking-wider font-semibold">Email</p>
                <p className="font-bold text-[#111827] text-base">{companyEmail}</p>
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <p className="text-xs text-[#6B7280] uppercase tracking-wider font-semibold">Phone</p>
                <p className="font-bold text-[#111827] text-base">{companyPhone}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to format date cleanly as "27 Jul 2026"
function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const day = d.getDate();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return "";
  }
}

function calculateExpireDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    d.setFullYear(d.getFullYear() + 2);
    const day = d.getDate();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return "";
  }
}
