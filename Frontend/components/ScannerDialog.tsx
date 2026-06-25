// frontend/components/ScannerDialog.tsx

"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Upload,
  RefreshCcw,
  Check,
  X,
  Loader2,
  Scan,
  Maximize2,
} from "lucide-react";
import { scanDocument } from "@/services/scanner.services";
import { toast } from "sonner";

interface ScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCaptured: (file: File) => void;
}

export function ScannerDialog({ open, onOpenChange, onCaptured }: ScannerDialogProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [mode, setMode] = useState<"camera" | "preview" | "result">("camera");

  const processImage = async (imageSrc: string) => {
    setIsProcessing(true);
    try {
      // Convert base64/dataURL to File
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const file = new File([blob], "input.jpg", { type: "image/jpeg" });

      // Call Backend API
      const processedBlob = await scanDocument(file);
      
      const finalImage = URL.createObjectURL(processedBlob);
      setCroppedImage(finalImage);
      setMode("result");
    } catch (error: any) {
      console.error("[Scanner] Processing failed:", error);
      const message = error?.response?.data?.message || "AI processing failed. Please try a manual upload.";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      processImage(imageSrc);
    }
  }, [webcamRef]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setCapturedImage(result);
        processImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirm = () => {
    if (croppedImage) {
      // Convert data URL to File
      fetch(croppedImage)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], `scanned-doc-${Date.now()}.jpg`, { type: "image/jpeg" });
          onCaptured(file);
          onOpenChange(false);
          reset();
        });
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setCroppedImage(null);
    setMode("camera");
    setIsProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-black border-none">
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {mode === "camera" && (
            <>
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "environment", width: 1280, height: 720 }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-[2px] border-white/20 pointer-events-none flex items-center justify-center">
                <div className="w-[80%] h-[70%] border-2 border-dashed border-primary/50 rounded-lg flex items-center justify-center">
                  <Scan className="size-12 text-primary/30" />
                </div>
              </div>
            </>
          )}

          {(mode === "result" || isProcessing) && capturedImage && (
            <div className="relative w-full h-full flex items-center justify-center bg-zinc-900">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-4 text-white">
                  <Loader2 className="size-12 animate-spin text-primary" />
                  <p className="text-sm font-medium animate-pulse">AI Detecting & Cropping...</p>
                </div>
              ) : (
                <img src={croppedImage || capturedImage} className="max-h-full max-w-full object-contain shadow-2xl" alt="Scanned" />
              )}
            </div>
          )}
        </div>

        <div className="bg-white p-6">
          <div className="flex items-center justify-between">
            <DialogHeader className="text-left">
              <DialogTitle className="text-lg font-bold">AI Document Scanner</DialogTitle>
              <DialogDescription>
                {mode === "camera" ? "Align document within the frame" : "Review the scanned document"}
              </DialogDescription>
            </DialogHeader>
            {mode === "camera" && (
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" className="rounded-xl gap-2" asChild>
                  <span>
                    <Upload className="size-4" />
                    Upload Image
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                  </span>
                </Button>
              </label>
            )}
          </div>

          <div className="mt-8 flex justify-center gap-4">
            {mode === "camera" ? (
              <Button
                onClick={capture}
                disabled={isProcessing}
                size="lg"
                className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 p-0"
              >
                <div className="h-12 w-12 rounded-full border-4 border-white/30 flex items-center justify-center">
                  <div className="h-8 w-8 rounded-full bg-white" />
                </div>
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={reset}
                  disabled={isProcessing}
                  className="rounded-2xl gap-2 h-12 px-6"
                >
                  <RefreshCcw className="size-4" />
                  Retake
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={isProcessing || !croppedImage}
                  className="rounded-2xl gap-2 h-12 px-8 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                >
                  <Check className="size-4" />
                  Use This Scan
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
