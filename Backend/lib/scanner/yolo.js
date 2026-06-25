// Backend/lib/scanner/yolo.js

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createCanvas } from "canvas";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let session = null;
let ort = null;
let isCpuCompatible = null;

function checkCpuCompatibility() {
  if (isCpuCompatible !== null) return isCpuCompatible;

  if (process.platform === "linux") {
    try {
      const cpuinfo = fs.readFileSync("/proc/cpuinfo", "utf8");
      const flagsLine = cpuinfo.split("\n").find(line => line.startsWith("flags"));
      if (flagsLine) {
        const flags = flagsLine.toLowerCase().split(/\s+/);
        const hasAvx = flags.includes("avx") || flags.includes("avx2");
        const hasSse4 = flags.includes("sse4_1") || flags.includes("sse4_2") || flags.includes("sse4a") || flags.includes("sse4");
        
        if (!hasAvx && !hasSse4) {
          console.warn("[YOLO] CPU lacks AVX/SSE4 support. Skipping onnxruntime-node to prevent SIGILL crash. CPU Flags:", flagsLine);
          isCpuCompatible = false;
          return false;
        }
      }
    } catch (e) {
      console.warn("[YOLO] Failed to read /proc/cpuinfo:", e.message);
    }
  }

  isCpuCompatible = true;
  return true;
}

const MODEL_PATH = path.join(__dirname, "../../public/models/scanner/document-scanner.onnx");
const INPUT_SIZE = 640;

// Mapping for standard YOLOv8n (COCO) fallback
const COCO_MAP = {
  73: "document",
  67: "card",
  63: "laptop",
  66: "keyboard",
  28: "document",
};

export async function initYolo() {
  if (session) return session;

  if (!checkCpuCompatibility()) {
    console.warn("[YOLO] ONNX Runtime is disabled due to CPU incompatibility.");
    return null;
  }

  try {
    if (!ort) {
      console.log("[YOLO] Dynamically importing onnxruntime-node...");
      ort = await import("onnxruntime-node");
      console.log("[YOLO] onnxruntime-node imported successfully.");
    }
    session = await ort.InferenceSession.create(MODEL_PATH, {
      executionProviders: ["cpu"], // Node.js usually uses CPU unless GPU is configured
      graphOptimizationLevel: "all",
    });
    console.log("[YOLO] Session initialized successfully.");
    return session;
  } catch (error) {
    console.error("[YOLO] Failed to initialize session:", error);
    return null;
  }
}

export async function detectObjects(canvas, inputSize = 640) {
  const sess = await initYolo();
  if (!sess) return [];

  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    // Resize image to inputSize for YOLO
    const offscreenCanvas = createCanvas(inputSize, inputSize);
    const offCtx = offscreenCanvas.getContext("2d");
    if (!offCtx) return [];

    offCtx.drawImage(canvas, 0, 0, inputSize, inputSize);
    const imageData = offCtx.getImageData(0, 0, inputSize, inputSize);
    const { data } = imageData;

    const pixelCount = inputSize * inputSize;
    const float32Data = new Float32Array(3 * pixelCount);
    for (let i = 0; i < pixelCount; i++) {
      const src = i * 4;
      float32Data[i]                  = data[src]     * 0.00392156862;
      float32Data[i + pixelCount]     = data[src + 1] * 0.00392156862;
      float32Data[i + pixelCount * 2] = data[src + 2] * 0.00392156862;
    }

    const inputTensor = new ort.Tensor("float32", float32Data, [1, 3, inputSize, inputSize]);

    const outputs = await sess.run({ images: inputTensor });
    const boxesOutput = Object.values(outputs).find(o => o.dims.length === 3);
    const protoOutput = Object.values(outputs).find(o => o.dims.length === 4);

    if (!boxesOutput) return [];

    return processYoloOutput(
      boxesOutput.data,
      boxesOutput.dims,
      !!protoOutput,
      protoOutput?.data,
      protoOutput?.dims,
      inputSize
    );
  } catch (error) {
    console.error("[YOLO] Inference failed:", error);
    return [];
  }
}

function processYoloOutput(data, dims, hasSegmentation = false, protoData, protoDims, inputSize = 640) {
  const numClasses = hasSegmentation ? dims[1] - 4 - 32 : dims[1] - 4;
  const numPredictions = dims[2];

  const detections = [];
  const confidenceThreshold = 0.25;

  for (let i = 0; i < numPredictions; i++) {
    let maxConf = 0;
    let classIdx = -1;

    for (let j = 0; j < numClasses; j++) {
      const conf = data[(4 + j) * numPredictions + i];
      if (conf > maxConf) {
        maxConf = conf;
        classIdx = j;
      }
    }

    if (maxConf > confidenceThreshold) {
      let className = "document";
      if (numClasses > 10) {
        if (!COCO_MAP[classIdx]) continue;
        className = COCO_MAP[classIdx];
      } else {
        const customClasses = {
          0: "document",
          1: "id_card",
          2: "khmer_id",
          3: "passport"
        };
        className = customClasses[classIdx] || "document";
      }

      let maskCoeffs;
      if (hasSegmentation) {
        maskCoeffs = [];
        for (let k = 0; k < 32; k++) {
          maskCoeffs.push(data[(4 + numClasses + k) * numPredictions + i]);
        }
      }

      const cx = data[0 * numPredictions + i];
      const cy = data[1 * numPredictions + i];
      const w = data[2 * numPredictions + i];
      const h = data[3 * numPredictions + i];

      detections.push({
        x: (cx - w / 2) / inputSize,
        y: (cy - h / 2) / inputSize,
        width: w / inputSize,
        height: h / inputSize,
        confidence: maxConf,
        class: className,
        _maskCoeffs: maskCoeffs,
      });
    }
  }

  const selected = nonMaxSuppression(detections, 0.45);

  if (hasSegmentation && protoData && protoDims) {
    const protoChannels = protoDims[1]; // 32
    const protoH = protoDims[2]; // 160
    const protoW = protoDims[3]; // 160
    const protoSize = protoH * protoW;

    for (const det of selected) {
      const coeffs = det._maskCoeffs;
      if (!coeffs) continue;
      
      const mask = new Uint8Array(protoSize);
      for (let r = 0; r < protoH; r++) {
        for (let c = 0; c < protoW; c++) {
          let val = 0;
          const pixelIdx = r * protoW + c;
          for (let k = 0; k < protoChannels; k++) {
            val += coeffs[k] * protoData[k * protoSize + pixelIdx];
          }
          const sigmoid = 1 / (1 + Math.exp(-val));
          mask[pixelIdx] = sigmoid > 0.5 ? 255 : 0;
        }
      }
      det.maskData = mask;
      det.maskWidth = protoW;
      det.maskHeight = protoH;
    }
  }

  return selected;
}

function nonMaxSuppression(boxes, iouThreshold) {
  boxes.sort((a, b) => b.confidence - a.confidence);
  const selected = [];
  const active = new Array(boxes.length).fill(true);

  for (let i = 0; i < boxes.length; i++) {
    if (active[i]) {
      selected.push(boxes[i]);
      for (let j = i + 1; j < boxes.length; j++) {
        if (active[j] && calculateIoU(boxes[i], boxes[j]) > iouThreshold) {
          active[j] = false;
        }
      }
    }
  }
  return selected;
}

function calculateIoU(box1, box2) {
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = box1.width * box1.height + box2.width * box2.height - intersection;

  return intersection / union;
}
