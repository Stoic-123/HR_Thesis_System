// frontend/lib/scanner/yolo.ts

import * as ort from "onnxruntime-web";
import { DetectionResult } from "./types";

let session: ort.InferenceSession | null = null;

const MODEL_PATH = "/models/scanner/document-scanner.onnx";
const INPUT_SIZE = 640;

// Mapping for standard YOLOv8n (COCO) fallback
const COCO_MAP: Record<number, string> = {
  73: "document",
  67: "card",
  63: "laptop",
  66: "keyboard",
  28: "document",
};

// Set WASM paths for onnxruntime-web
// You might need to copy these files to public/wasm/ if they aren't served automatically
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

export async function initYolo() {
  if (session) return session;

  try {
    session = await ort.InferenceSession.create(MODEL_PATH, {
      executionProviders: ["webgl", "wasm"],
      graphOptimizationLevel: "all",
    });
    console.log("[YOLO] Session initialized successfully.");
    return session;
  } catch (error) {
    console.error("[YOLO] Failed to initialize session:", error);
    return null;
  }
}

export async function detectObjects(
  canvas: HTMLCanvasElement,
): Promise<DetectionResult[]> {
  const sess = await initYolo();
  if (!sess) return [];

  try {
    // 1. Prepare input tensor from canvas
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    // Resize image to 640x640 for YOLO
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = INPUT_SIZE;
    offscreenCanvas.height = INPUT_SIZE;
    const offCtx = offscreenCanvas.getContext("2d");
    if (!offCtx) return [];

    offCtx.drawImage(canvas, 0, 0, INPUT_SIZE, INPUT_SIZE);
    const imageData = offCtx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
    const { data } = imageData;

    const float32Data = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
    for (let i = 0; i < INPUT_SIZE * INPUT_SIZE; i++) {
      float32Data[i] = data[i * 4] / 255.0; // R
      float32Data[i + INPUT_SIZE * INPUT_SIZE] = data[i * 4 + 1] / 255.0; // G
      float32Data[i + 2 * INPUT_SIZE * INPUT_SIZE] = data[i * 4 + 2] / 255.0; // B
    }

    const inputTensor = new ort.Tensor("float32", float32Data, [
      1,
      3,
      INPUT_SIZE,
      INPUT_SIZE,
    ]);

    // 2. Run inference
    const outputs = await sess.run({ images: inputTensor });
    const outputNames = Object.keys(outputs);
    let boxesOutput: ort.Tensor | null = null;
    let protoOutput: ort.Tensor | null = null;

    for (const name of outputNames) {
      if (outputs[name].dims.length === 3) {
        boxesOutput = outputs[name];
      } else if (outputs[name].dims.length === 4) {
        protoOutput = outputs[name];
      }
    }

    if (!boxesOutput) return [];

    return processYoloOutput(
      boxesOutput.data as Float32Array,
      boxesOutput.dims,
      !!protoOutput,
      protoOutput?.data as Float32Array,
      protoOutput?.dims
    );
  } catch (error) {
    console.error("[YOLO] Inference failed:", error);
    return [];
  }
}

function processYoloOutput(
  data: Float32Array,
  dims: readonly number[],
  hasSegmentation: boolean = false,
  protoData?: Float32Array,
  protoDims?: readonly number[]
): DetectionResult[] {
  const numClasses = hasSegmentation ? dims[1] - 4 - 32 : dims[1] - 4;
  const numPredictions = dims[2];

  const detections: DetectionResult[] = [];
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
        className = "document";
      }

      let maskCoeffs: number[] | undefined;
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
        x: (cx - w / 2) / INPUT_SIZE,
        y: (cy - h / 2) / INPUT_SIZE,
        width: w / INPUT_SIZE,
        height: h / INPUT_SIZE,
        confidence: maxConf,
        class: className,
        // @ts-ignore
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
      const coeffs = (det as any)._maskCoeffs as number[];
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

function nonMaxSuppression(boxes: DetectionResult[], iouThreshold: number): DetectionResult[] {
  boxes.sort((a, b) => b.confidence - a.confidence);
  const selected: DetectionResult[] = [];
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

function calculateIoU(box1: DetectionResult, box2: DetectionResult): number {
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = box1.width * box1.height + box2.width * box2.height - intersection;

  return intersection / union;
}
