// frontend/lib/scanner/perspective-transform.ts

import { getCV } from "./cv-helper";
import { Point } from "./types";

export function perspectiveTransform(
  mat: any,
  points: Point[],
  targetWidth: number,
  targetHeight: number
): any {
  const cv = getCV();
  if (!cv) return mat;
  // 1. Source points (the corners detected)
  const srcCoords = new Float32Array(8);
  points.forEach((p, i) => {
    srcCoords[i * 2] = p.x;
    srcCoords[i * 2 + 1] = p.y;
  });
  const srcMat = cv.matFromArray(4, 1, cv.CV_32FC2, Array.from(srcCoords));

  // 2. Destination points (the rectangle we want)
  const dstCoords = new Float32Array([
    0, 0,
    targetWidth, 0,
    targetWidth, targetHeight,
    0, targetHeight,
  ]);
  const dstMat = cv.matFromArray(4, 1, cv.CV_32FC2, Array.from(dstCoords));

  // 3. Get the transformation matrix
  const M = cv.getPerspectiveTransform(srcMat, dstMat);

  // 4. Apply the transformation
  const result = new cv.Mat();
  cv.warpPerspective(
    mat,
    result,
    M,
    new cv.Size(targetWidth, targetHeight),
    cv.INTER_LINEAR,
    cv.BORDER_CONSTANT,
    new cv.Scalar()
  );

  // Cleanup
  srcMat.delete();
  dstMat.delete();
  M.delete();

  return result;
}

export function getCardDimensions(points: Point[]) {
  // Simple calculation of width/height based on points
  const w1 = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
  const w2 = Math.hypot(points[2].x - points[3].x, points[2].y - points[3].y);
  const h1 = Math.hypot(points[3].x - points[0].x, points[3].y - points[0].y);
  const h2 = Math.hypot(points[2].x - points[1].x, points[2].y - points[1].y);

  const maxWidth = Math.max(w1, w2);
  const maxHeight = Math.max(h1, h2);

  // For ID cards, usually 85.6mm x 53.98mm (ratio ~1.58)
  // We can enforce a standard aspect ratio if it looks like a card
  const ratio = maxWidth / maxHeight;
  if (ratio > 1.2 && ratio < 2.0) {
    // Standard credit card / ID card ratio
    return { width: 856, height: 540 };
  }

  return { width: Math.round(maxWidth), height: Math.round(maxHeight) };
}
