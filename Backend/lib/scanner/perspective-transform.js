// Backend/lib/scanner/perspective-transform.js

import { getCV } from "./cv-helper.js";

export function perspectiveTransform(mat, points, targetWidth, targetHeight) {
  const cv = getCV();
  if (!cv) return mat;

  const srcCoords = new Float32Array(8);
  points.forEach((p, i) => {
    srcCoords[i * 2] = p.x;
    srcCoords[i * 2 + 1] = p.y;
  });
  const srcMat = cv.matFromArray(4, 1, cv.CV_32FC2, Array.from(srcCoords));

  const dstCoords = new Float32Array([
    0, 0,
    targetWidth, 0,
    targetWidth, targetHeight,
    0, targetHeight,
  ]);
  const dstMat = cv.matFromArray(4, 1, cv.CV_32FC2, Array.from(dstCoords));

  const M = cv.getPerspectiveTransform(srcMat, dstMat);
  const result = new cv.Mat();
  cv.warpPerspective(mat, result, M, new cv.Size(targetWidth, targetHeight), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

  srcMat.delete(); dstMat.delete(); M.delete();
  return result;
}

export function getCardDimensions(points) {
  const w1 = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
  const w2 = Math.hypot(points[2].x - points[3].x, points[2].y - points[3].y);
  const h1 = Math.hypot(points[3].x - points[0].x, points[3].y - points[0].y);
  const h2 = Math.hypot(points[2].x - points[1].x, points[2].y - points[1].y);

  const rawWidth  = Math.round(Math.max(w1, w2));
  const rawHeight = Math.round(Math.max(h1, h2));

  // Cap at 2400px on the long side to keep file size reasonable,
  // but preserve the actual detected pixel dimensions — no forced downscale.
  const MAX_LONG_SIDE = 2400;
  const longSide = Math.max(rawWidth, rawHeight);
  if (longSide > MAX_LONG_SIDE) {
    const scale = MAX_LONG_SIDE / longSide;
    return {
      width:  Math.round(rawWidth  * scale),
      height: Math.round(rawHeight * scale),
    };
  }

  return { width: rawWidth, height: rawHeight };
}
