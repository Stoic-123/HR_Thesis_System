// src/lib/scanner/opencv-refinement.ts

import { getCV, sortPoints } from "./cv-helper";
import { Point, DetectionResult, CardResult } from "./types";

export function refineDetection(
  fullMat: any,
  detection: DetectionResult,
  originalWidth: number,
  originalHeight: number
): CardResult | null {
  const cv = getCV();
  if (!cv) return null;

  // --- 1. AI NATIVE SEGMENTATION MASK (IF AVAILABLE) ---
  if (detection.maskData && detection.maskWidth && detection.maskHeight) {
    try {
      // Create Mat from raw mask data
      const maskMat = cv.matFromArray(detection.maskHeight, detection.maskWidth, cv.CV_8UC1, Array.from(detection.maskData));
      
      // Resize to original image dimensions
      const fullMask = new cv.Mat();
      cv.resize(maskMat, fullMask, new cv.Size(originalWidth, originalHeight), 0, 0, cv.INTER_LINEAR);
      
      // Threshold back to binary
      cv.threshold(fullMask, fullMask, 127, 255, cv.THRESH_BINARY);
      
      // Crop mask to bounding box to eliminate noise outside the detection
      const bboxX = Math.max(0, Math.floor(detection.x * originalWidth));
      const bboxY = Math.max(0, Math.floor(detection.y * originalHeight));
      const bboxW = Math.min(originalWidth - bboxX, Math.floor(detection.width * originalWidth));
      const bboxH = Math.min(originalHeight - bboxY, Math.floor(detection.height * originalHeight));
      
      const bbox = new cv.Rect(bboxX, bboxY, bboxW, bboxH);
      
      const cleanMask = cv.Mat.zeros(originalHeight, originalWidth, cv.CV_8UC1);
      const roi = fullMask.roi(bbox);
      roi.copyTo(cleanMask.roi(bbox));
      roi.delete();

      // Find contours on the cleaned mask
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

      let bestPoints: Point[] | null = null;
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
        console.log("[Refinement] Using native YOLO Segmentation Mask successfully!");
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
      console.error("[Refinement] Native mask processing failed, falling back to OpenCV hybrid", e);
    }
  }

  // --- 2. OPENCV HYBRID FALLBACK ---
  // Calculate ROI with 15% padding to ensure the whole card is inside
  const padding = 0.15;
  const roiX = Math.max(0, (detection.x - padding * detection.width) * originalWidth);
  const roiY = Math.max(0, (detection.y - padding * detection.height) * originalHeight);
  const roiW = Math.min(originalWidth - roiX, (detection.width * (1 + 2 * padding)) * originalWidth);
  const roiH = Math.min(originalHeight - roiY, (detection.height * (1 + 2 * padding)) * originalHeight);

  if (roiW < 10 || roiH < 10) return null;

  const rect = new cv.Rect(roiX, roiY, roiW, roiH);
  const roiMat = fullMat.roi(rect);

  try {
    // 2. Multi-stage edge detection
    const gray = new cv.Mat();
    cv.cvtColor(roiMat, gray, cv.COLOR_RGBA2GRAY);

    // Use a large Gaussian blur to completely kill carpet textures and text
    const blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(11, 11), 0);

    // Canny Edge Detection
    const edges = new cv.Mat();
    cv.Canny(blurred, edges, 25, 75);

    // Dilate aggressively to connect broken edges (like reflections or faded borders)
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(7, 7));
    cv.dilate(edges, edges, kernel);

    // CRITICAL: Draw a black border around the ROI so that edges touching the ROI boundary 
    // do not form a contour around the entire ROI box itself.
    cv.rectangle(edges, new cv.Point(0, 0), new cv.Point(roiW - 1, roiH - 1), new cv.Scalar(0, 0, 0, 0), 2);

    // 3. Find Contours (RETR_EXTERNAL because we only care about the outermost card boundary)
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let bestPoints: Point[] | null = null;
    let maxArea = 0;
    let bestCnt = null;

    const roiArea = roiW * roiH;

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);
      
      // The card should occupy at least 15% of the ROI.
      // We don't need the >95% check anymore because we drew a black border!
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
        // Fallback: MinAreaRect is extremely reliable for rotated cards when approxPolyDP fails
        const rect = cv.minAreaRect(bestCnt);
        const vertices = cv.RotatedRect.points(rect);
        bestPoints = vertices.map(v => ({
          x: v.x + roiX,
          y: v.y + roiY
        }));
      }
      approx.delete();
    }

    // Fallback 2: If no contour found, use the YOLO box corners (inset slightly)
    if (!bestPoints) {
      // Inset by padding so we don't return the extra background we added
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

    // Cleanup
    gray.delete();
    blurred.delete();
    edges.delete();
    kernel.delete();
    contours.delete();
    hierarchy.delete();
    roiMat.delete();

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

/**
 * Finds the 4 points in a contour that are closest to the corners of the ROI.
 * This is extremely robust when the contour isn't a perfect quadrilateral.
 */
function findExtremePoints(cnt: any, offsetX: number, offsetY: number, w: number, h: number): Point[] {
  let tl = { x: 0, y: 0 }, tr = { x: w, y: 0 }, br = { x: w, y: h }, bl = { x: 0, y: h };
  let minTl = Infinity, minTr = Infinity, minBr = Infinity, minBl = Infinity;
  let resTl = { x: 0, y: 0 }, resTr = { x: w, y: 0 }, resBr = { x: w, y: h }, resBl = { x: 0, y: h };

  for (let i = 0; i < cnt.data32S.length / 2; i++) {
    const x = cnt.data32S[i * 2];
    const y = cnt.data32S[i * 2 + 1];

    const dTl = Math.hypot(x - tl.x, y - tl.y);
    const dTr = Math.hypot(x - tr.x, y - tr.y);
    const dBr = Math.hypot(x - br.x, y - br.y);
    const dBl = Math.hypot(x - bl.x, y - bl.y);

    if (dTl < minTl) { minTl = dTl; resTl = { x, y }; }
    if (dTr < minTr) { minTr = dTr; resTr = { x, y }; }
    if (dBr < minBr) { minBr = dBr; resBr = { x, y }; }
    if (dBl < minBl) { minBl = dBl; resBl = { x, y }; }
  }

  return [
    { x: resTl.x + offsetX, y: resTl.y + offsetY },
    { x: resTr.x + offsetX, y: resTr.y + offsetY },
    { x: resBr.x + offsetX, y: resBr.y + offsetY },
    { x: resBl.x + offsetX, y: resBl.y + offsetY },
  ];
}
