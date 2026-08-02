"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EmployeeCard, EmployeeCardData } from "@/components/EmployeeCard";
import { Download, Users, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface AllEmployeeCardsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: EmployeeCardData[];
}

async function fetchImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function convertImagesToDataUrls(element: HTMLElement) {
  const images = element.querySelectorAll("img");
  for (const img of Array.from(images)) {
    const src = img.src;
    if (src && !src.startsWith("data:")) {
      const dataUrl = await fetchImageDataUrl(src);
      if (dataUrl) {
        img.src = dataUrl;
      }
    }
  }
}

export const AllEmployeeCardsModal: React.FC<AllEmployeeCardsModalProps> = ({
  open,
  onOpenChange,
  employees = [],
}) => {
  const t = useTranslations("employeeCard");
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDownloadAllPDF = async () => {
    if (!employees || employees.length === 0) return;
    setIsExporting(true);
    setProgress(0);

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [54, 85.6], // Standard CR80 ID Card dimensions
      });

      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        const frontElement = document.getElementById(`employee-card-front-${emp.id}`);
        const backElement = document.getElementById(`employee-card-back-${emp.id}`);

        if (i > 0) {
          pdf.addPage([54, 85.6], "portrait");
        }

        if (frontElement) {
          await convertImagesToDataUrls(frontElement);
          const canvasFront = await html2canvas(frontElement, {
            scale: 2.5,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#FFFFFF",
            logging: false,
            imageTimeout: 15000,
          });
          const imgFront = canvasFront.toDataURL("image/png");
          pdf.addImage(imgFront, "PNG", 0, 0, 54, 85.6);
        }

        if (backElement) {
          await convertImagesToDataUrls(backElement);
          pdf.addPage([54, 85.6], "portrait");
          const canvasBack = await html2canvas(backElement, {
            scale: 2.5,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#FFFFFF",
            logging: false,
            imageTimeout: 15000,
          });
          const imgBack = canvasBack.toDataURL("image/png");
          pdf.addImage(imgBack, "PNG", 0, 0, 54, 85.6);
        }

        setProgress(Math.round(((i + 1) / employees.length) * 100));
      }

      pdf.save("All_Employee_Cards.pdf");
      toast.success(t("bulkDownloadSuccess", { count: employees.length }));
    } catch (err) {
      console.error("Bulk PDF Export error:", err);
      toast.error(t("bulkDownloadError"));
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-w-6xl w-full max-h-[90vh] bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-6 rounded-3xl border border-white/40 shadow-2xl flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-4 border-gray-200 dark:border-gray-800 shrink-0">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <Users className="size-6 text-[#F58220]" />
            <span>{t("generateAllTitle", { count: employees.length })}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable list of employee cards */}
        <div className="flex-1 overflow-y-auto py-6 px-2 space-y-12">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center"
            >
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 self-start border-b pb-2 w-full">
                {emp.full_name || `${emp.first_name} ${emp.last_name}`} -{" "}
                <span className="text-sm font-normal text-gray-500">
                  {emp.position_name || emp.department_name || t("companyStaff")}
                </span>
              </h3>
              <EmployeeCard employee={emp} side="both" />
            </div>
          ))}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between border-t pt-4 border-gray-200 dark:border-gray-800 gap-4 shrink-0">
          <div className="flex items-center gap-3">
            {isExporting && (
              <div className="text-xs text-[#2575FC] font-semibold animate-pulse">
                {t("exportingPdf", { progress })}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl px-5"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleDownloadAllPDF}
              disabled={isExporting || employees.length === 0}
              className="rounded-xl px-6 bg-[#F58220] hover:bg-[#E07210] text-white shadow-lg shadow-orange-500/20 gap-2 font-bold"
            >
              {isExporting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("exportingPdf", { progress })}
                </>
              ) : (
                <>
                  <Download className="size-4" />
                  {t("downloadAllPdf", { count: employees.length })}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
