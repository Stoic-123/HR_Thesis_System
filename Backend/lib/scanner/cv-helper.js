// Backend/lib/scanner/cv-helper.js
import { createRequire } from "module";

const require = createRequire(import.meta.url);
let _cvInstance = null;
let _initPromise = null;

export async function getCV() {
  if (_cvInstance && _cvInstance.Mat) {
    return _cvInstance;
  }

  if (!_initPromise) {
    _initPromise = new Promise((resolve) => {
      try {
        const cvModule = require("@techstark/opencv-js");
        if (cvModule && cvModule.Mat) {
          try { delete cvModule.then; } catch (_) {}
          _cvInstance = cvModule;
          return resolve(_cvInstance);
        }
        if (cvModule && typeof cvModule.then === "function") {
          cvModule.then((cv) => {
            const instance = cv || cvModule;
            try { delete instance.then; } catch (_) {}
            _cvInstance = instance;
            resolve(_cvInstance);
          });
          return;
        }
        _cvInstance = cvModule;
        resolve(_cvInstance);
      } catch (err) {
        console.error("[getCV] Failed to load opencv-js:", err);
        resolve(null);
      }
    });
  }

  return _initPromise;
}

export const sortPoints = (points) => {
  if (!points || points.length !== 4) return points;
  const sorted = [...points];
  sorted.sort((a, b) => a.y - b.y);

  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);

  return [top[0], top[1], bottom[1], bottom[0]]; // tl, tr, br, bl
};
