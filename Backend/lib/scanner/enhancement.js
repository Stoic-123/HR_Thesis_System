// Backend/lib/scanner/enhancement.js

import { getCV } from "./cv-helper.js";

export function enhanceDocument(mat) {
  const cv = getCV();
  if (!cv) return mat;

  // 1. Convert RGBA → RGB for processing
  const rgb = new cv.Mat();
  cv.cvtColor(mat, rgb, cv.COLOR_RGBA2RGB);

  // 2. Very mild bilateral denoise — removes sensor noise without smearing edges
  //    d=5, sigmaColor=20, sigmaSpace=20  (was 40/40 — halved to preserve detail)
  const denoised = new cv.Mat();
  cv.bilateralFilter(rgb, denoised, 5, 20, 20);
  rgb.delete();

  // 3. Gentle unsharp mask — sharpens text edges without halos
  //    weight 1.25 / -0.25  (was 1.5 / -0.5 — too aggressive)
  //    sigma=1.5  (was 3 — tighter kernel = crisper fine detail)
  const blurred = new cv.Mat();
  cv.GaussianBlur(denoised, blurred, new cv.Size(0, 0), 1.5);
  const sharpened = new cv.Mat();
  cv.addWeighted(denoised, 1.25, blurred, -0.25, 0, sharpened);
  denoised.delete();
  blurred.delete();

  // 4. Convert RGB → RGBA for output
  const result = new cv.Mat();
  cv.cvtColor(sharpened, result, cv.COLOR_RGB2RGBA);
  sharpened.delete();

  return result;
}
