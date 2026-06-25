// Backend/lib/scanner/cv-helper.js

import cv from "@techstark/opencv-js";

export function getCV() {
  return cv;
}

export const sortPoints = (points) => {
  const sorted = [...points];
  // Sort by y to get top and bottom
  sorted.sort((a, b) => a.y - b.y);

  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);

  return [top[0], top[1], bottom[1], bottom[0]]; // tl, tr, br, bl
};
