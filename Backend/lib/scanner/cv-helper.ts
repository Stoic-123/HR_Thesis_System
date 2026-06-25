// frontend/lib/scanner/cv-helper.ts

/**
 * Helper to access OpenCV from the global window object.
 * This avoids bundling issues with Next.js/Turbopack where
 * importing @techstark/opencv-js tries to use 'fs' (Node.js only).
 */
export function getCV(): any {
  if (typeof window !== "undefined" && (window as any).cv) {
    return (window as any).cv;
  }
  return null;
}

export const sortPoints = (points: { x: number; y: number }[]) => {
  const sorted = [...points];
  // Sort by y to get top and bottom
  sorted.sort((a, b) => a.y - b.y);

  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);

  return [top[0], top[1], bottom[1], bottom[0]]; // tl, tr, br, bl
};
