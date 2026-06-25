// Backend/lib/scanner/opencv-refinement.js

import { getCV, sortPoints } from "./cv-helper.js";

export function refineDetection(
  fullMat,
  detection,
  originalWidth,
  originalHeight
) {
  const cv = getCV();
  if (!cv) return null;

  // --- 1. AI NATIVE SEGMENTATION MASK (IF AVAILABLE) ---
  if (detection.maskData && detection.maskWidth && detection.maskHeight) {
    try {
      const maskMat = cv.matFromArray(detection.maskHeight, detection.maskWidth, cv.CV_8UC1, Array.from(detection.maskData));
      const fullMask = new cv.Mat();
      cv.resize(maskMat, fullMask, new cv.Size(originalWidth, originalHeight), 0, 0, cv.INTER_LINEAR);
      cv.threshold(fullMask, fullMask, 127, 255, cv.THRESH_BINARY);
      
      const bboxX = Math.max(0, Math.floor(detection.x * originalWidth));
      const bboxY = Math.max(0, Math.floor(detection.y * originalHeight));
      const bboxW = Math.min(originalWidth - bboxX, Math.floor(detection.width * originalWidth));
      const bboxH = Math.min(originalHeight - bboxY, Math.floor(detection.height * originalHeight));
      
      const bbox = new cv.Rect(bboxX, bboxY, bboxW, bboxH);
      const cleanMask = cv.Mat.zeros(originalHeight, originalWidth, cv.CV_8UC1);
      const roi = fullMask.roi(bbox);
      roi.copyTo(cleanMask.roi(bbox));
      roi.delete();

      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(cleanMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      let bestCnt = null;
      let maxArea = 0;
      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const area = cv.contourArea(cnt);
        if (area > maxArea) {
          maxArea = area;
          bestCnt = cnt;
        }
      }

      let bestPoints = null;
      if (bestCnt && maxArea > (bboxW * bboxH) * 0.1) {
        const perimeter = cv.arcLength(bestCnt, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(bestCnt, approx, 0.015 * perimeter, true);

        if (approx.rows === 4) {
          bestPoints = [];
          for (let j = 0; j < 4; j++) {
            bestPoints.push({ x: approx.data32S[j * 2], y: approx.data32S[j * 2 + 1] });
          }
        } else {
          const rect = cv.minAreaRect(bestCnt);
          const vertices = cv.RotatedRect.points(rect);
          bestPoints = vertices.map(v => ({ x: v.x, y: v.y }));
        }
        approx.delete();
      }

      fullMask.delete();
      maskMat.delete();
      cleanMask.delete();
      contours.delete();
      hierarchy.delete();

      if (bestPoints) {
        return {
          points: sortPoints(bestPoints),
          area: maxArea,
          center: {
            x: (detection.x + detection.width / 2) * originalWidth,
            y: (detection.y + detection.height / 2) * originalHeight,
          },
          score: detection.confidence,
          className: detection.class,
          confidence: detection.confidence,
          originalBox: detection,
        };
      }
    } catch (e) {
      console.error("[Refinement] Native mask processing failed", e);
    }
  }

  // --- 2. OPENCV HYBRID FALLBACK ---
  const padding = 0.15;
  const roiX = Math.max(0, (detection.x - padding * detection.width) * originalWidth);
  const roiY = Math.max(0, (detection.y - padding * detection.height) * originalHeight);
  const roiW = Math.min(originalWidth - roiX, (detection.width * (1 + 2 * padding)) * originalWidth);
  const roiH = Math.min(originalHeight - roiY, (detection.height * (1 + 2 * padding)) * originalHeight);

  if (roiW < 10 || roiH < 10) return null;

  const rect = new cv.Rect(roiX, roiY, roiW, roiH);
  const roiMat = fullMat.roi(rect);

  try {
    const gray = new cv.Mat();
    cv.cvtColor(roiMat, gray, cv.COLOR_RGBA2GRAY);
    const blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(11, 11), 0);
    const edges = new cv.Mat();
    cv.Canny(blurred, edges, 25, 75);
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(7, 7));
    cv.dilate(edges, edges, kernel);
    cv.rectangle(edges, new cv.Point(0, 0), new cv.Point(roiW - 1, roiH - 1), new cv.Scalar(0, 0, 0, 0), 2);

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let bestPoints = null;
    let maxArea = 0;
    let bestCnt = null;
    const roiArea = roiW * roiH;

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);
      if (area > maxArea && area > roiArea * 0.15) {
        maxArea = area;
        bestCnt = cnt;
      }
    }

    if (bestCnt) {
      const perimeter = cv.arcLength(bestCnt, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(bestCnt, approx, 0.02 * perimeter, true);

      if (approx.rows === 4) {
        bestPoints = [];
        for (let j = 0; j < 4; j++) {
          bestPoints.push({
            x: approx.data32S[j * 2] + roiX,
            y: approx.data32S[j * 2 + 1] + roiY,
          });
        }
      } else {
        const rect = cv.minAreaRect(bestCnt);
        const vertices = cv.RotatedRect.points(rect);
        bestPoints = vertices.map(v => ({ x: v.x + roiX, y: v.y + roiY }));
      }
      approx.delete();
    }

    if (!bestPoints) {
      const insetX = detection.x * originalWidth;
      const insetY = detection.y * originalHeight;
      const insetW = detection.width * originalWidth;
      const insetH = detection.height * originalHeight;
      bestPoints = [
        { x: insetX, y: insetY },
        { x: insetX + insetW, y: insetY },
        { x: insetX + insetW, y: insetY + insetH },
        { x: insetX, y: insetY + insetH },
      ];
    }

    gray.delete(); blurred.delete(); edges.delete(); kernel.delete(); contours.delete(); hierarchy.delete(); roiMat.delete();

    return {
      points: sortPoints(bestPoints),
      area: maxArea || (detection.width * detection.height * originalWidth * originalHeight),
      center: {
        x: (detection.x + detection.width / 2) * originalWidth,
        y: (detection.y + detection.height / 2) * originalHeight,
      },
      score: detection.confidence,
      className: detection.class,
      confidence: detection.confidence,
      originalBox: detection,
    };
  } catch (error) {
    console.error("[Refinement] OpenCV failed:", error);
    if (!roiMat.isDeleted()) roiMat.delete();
    return null;
  }
}
