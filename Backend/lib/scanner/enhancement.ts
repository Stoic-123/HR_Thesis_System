// src/lib/scanner/enhancement.ts

import { getCV } from "./cv-helper";

export function enhanceDocument(mat: any, isDocument: boolean = true): any {
  const cv = getCV();
  if (!cv) return mat;
  // 1. Convert to RGB (OpenCV.js reads as RGBA)
  const rgb = new cv.Mat();
  cv.cvtColor(mat, rgb, cv.COLOR_RGBA2RGB);

  // 2. Denoise (Bilateral filter to preserve edges)
  const denoised = new cv.Mat();
  cv.bilateralFilter(rgb, denoised, 5, 40, 40);
  rgb.delete();

  // 3. Contrast Enhancement (CLAHE on Lab space)
  const lab = new cv.Mat();
  cv.cvtColor(denoised, lab, cv.COLOR_RGB2Lab);
  denoised.delete();

  const labChannels = new cv.MatVector();
  cv.split(lab, labChannels);
  
  const clahe = new (cv as any).CLAHE(2.0, new cv.Size(8, 8));
  const lChannel = labChannels.get(0);
  clahe.apply(lChannel, lChannel);
  
  const enhancedLab = new cv.Mat();
  cv.merge(labChannels, enhancedLab);
  
  const enhancedRgb = new cv.Mat();
  cv.cvtColor(enhancedLab, enhancedRgb, cv.COLOR_Lab2RGB);

  // 4. Sharpening (Unsharp Mask)
  const blurred = new cv.Mat();
  cv.GaussianBlur(enhancedRgb, blurred, new cv.Size(0, 0), 3);
  const sharpened = new cv.Mat();
  cv.addWeighted(enhancedRgb, 1.5, blurred, -0.5, 0, sharpened);

  // 5. Final Brightness/Gamma Correction
  const final = new cv.Mat();
  if (isDocument) {
    // Lift whites for documents
    cv.convertScaleAbs(sharpened, final, 1.1, 10);
  } else {
    sharpened.copyTo(final);
  }

  // Cleanup
  lab.delete();
  labChannels.delete();
  lChannel.delete();
  clahe.delete();
  enhancedLab.delete();
  enhancedRgb.delete();
  blurred.delete();
  sharpened.delete();

  // Convert back to RGBA for output
  const result = new cv.Mat();
  cv.cvtColor(final, result, cv.COLOR_RGB2RGBA);
  final.delete();

  return result;
}
