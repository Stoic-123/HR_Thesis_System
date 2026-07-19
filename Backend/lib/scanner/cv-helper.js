// Backend/lib/scanner/cv-helper.js
// opencv-js is lazy-loaded to avoid crashing the process at startup.
// The WASM runtime needs ~128 MB of heap and must not be required at module
// load time inside memory-constrained containers.

let _cv = null;

export async function getCV() {
  if (!_cv) {
    const mod = await import("@techstark/opencv-js");
    _cv = mod.default ?? mod;
    // Wait for WASM to be ready if it hasn't finished initialising
    if (_cv.onRuntimeInitialized && !_cv.Mat) {
      await new Promise((resolve) => {
        _cv.onRuntimeInitialized = resolve;
      });
    }
  }
  return _cv;
}

export const sortPoints = (points) => {
  const sorted = [...points];
  // Sort by y to get top and bottom
  sorted.sort((a, b) => a.y - b.y);

  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);

  return [top[0], top[1], bottom[1], bottom[0]]; // tl, tr, br, bl
};
