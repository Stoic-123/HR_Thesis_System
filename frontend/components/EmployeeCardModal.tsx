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
import { Download, CreditCard, RotateCw, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface EmployeeCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeCardData | null;
}

async function fetchImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
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
      try {
        const dataUrl = await fetchImageDataUrl(src);
        if (dataUrl) {
          img.src = dataUrl;
          continue;
        }
      } catch {}

      // Fallback: draw loaded image on in-memory canvas if fetch was blocked
      try {
        if (img.complete && img.naturalWidth > 0) {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dUrl = canvas.toDataURL("image/png");
            if (dUrl && dUrl.startsWith("data:image")) {
              img.src = dUrl;
            }
          }
        }
      } catch {}
    }
  }
}

export const EmployeeCardModal: React.FC<EmployeeCardModalProps> = ({
  open,
  onOpenChange,
  employee,
}) => {
  const t = useTranslations("employeeCard");
  const [activeSide, setActiveSide] = useState<"front" | "back" | "both">("both");
  const [isExporting, setIsExporting] = useState(false);

  if (!employee) return null;

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: [54, 85.6], // Standard CR80 ID Card dimensions (54mm x 85.6mm)
      });

      const frontElement = document.getElementById(`employee-card-front-${employee.id}`);
      const backElement = document.getElementById(`employee-card-back-${employee.id}`);

      let hasFront = false;

      if (frontElement) {
        await convertImagesToDataUrls(frontElement);
        const canvasFront = await html2canvas(frontElement, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#FFFFFF",
          logging: false,
          imageTimeout: 15000,
        });
        const imgFront = canvasFront.toDataURL("image/png");
        pdf.addImage(imgFront, "PNG", 0, 0, 54, 85.6);
        hasFront = true;
      }

      if (backElement) {
        await convertImagesToDataUrls(backElement);
        if (hasFront) pdf.addPage([54, 85.6], "p");
        const canvasBack = await html2canvas(backElement, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#FFFFFF",
          logging: false,
          imageTimeout: 15000,
        });
        const imgBack = canvasBack.toDataURL("image/png");
        pdf.addImage(imgBack, "PNG", 0, 0, 54, 85.6);
      }

      const fileName = `${employee.first_name || "Employee"}_${employee.last_name || "Card"}_ID.pdf`.replace(/\s+/g, "_");
      pdf.save(fileName);
      toast.success(t("downloadSuccess"));
    } catch (err: any) {
      console.error("PDF Export error:", err);
      toast.error(err?.message || t("downloadError"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-w-4xl w-full max-h-[90vh] sm:max-h-[90vh] flex flex-col overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-6 rounded-3xl border border-white/40 shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-4 border-gray-200 dark:border-gray-800 shrink-0">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <CreditCard className="size-6 text-[#2575FC]" />
            <span>{t("title")}</span>
          </DialogTitle>
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <Button
              variant={activeSide === "both" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveSide("both")}
              className="rounded-lg text-xs font-semibold"
            >
              {t("bothSides")}
            </Button>
            <Button
              variant={activeSide === "front" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveSide("front")}
              className="rounded-lg text-xs font-semibold"
            >
              {t("front")}
            </Button>
            <Button
              variant={activeSide === "back" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveSide("back")}
              className="rounded-lg text-xs font-semibold"
            >
              {t("back")}
            </Button>
          </div>
        </DialogHeader>

        {/* Card Display Container */}
        <div className="flex-1 p-6 flex justify-center items-start overflow-y-auto overflow-x-auto min-h-0">
          <div className="m-auto transition-transform">
            <EmployeeCard employee={employee} side={activeSide} />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between border-t pt-4 border-gray-200 dark:border-gray-800 gap-4 shrink-0">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <RotateCw className="size-3.5 text-gray-500" />
            {t("cardLayoutHint")}
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl px-5"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="rounded-xl px-6 bg-[#2575FC] hover:bg-[#1E65FF] text-white shadow-lg shadow-blue-500/20 gap-2 font-semibold"
            >
              {isExporting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("generatingPdf")}
                </>
              ) : (
                <>
                  <Download className="size-4" />
                  {t("downloadPdf")}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
