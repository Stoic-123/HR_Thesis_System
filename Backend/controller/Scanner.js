// Backend/controller/Scanner.js

import { createCanvas, loadImage } from "canvas";
import { detectObjects } from "../lib/scanner/yolo.js";
import { refineDetection } from "../lib/scanner/opencv-refinement.js";
import { perspectiveTransform, getCardDimensions } from "../lib/scanner/perspective-transform.js";
import { enhanceDocument } from "../lib/scanner/enhancement.js";
import { getCV, sortPoints } from "../lib/scanner/cv-helper.js";
import prisma from "../lib/prisma.js";
import { validateFile } from "../utils/fileValidation.js";
import { validateDocTypeMatch } from "../lib/scanner/document-validator.js";

/**
 * POST /api/scanner/detect
 * Lightweight — runs YOLO + OpenCV refinement only, returns normalised corner
 * points (0-1) so the mobile can draw the overlay in real time.
 * No crop, no enhancement, no JPEG encoding → much faster.
 */
export const detectDocumentController = async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    const fileCheck = validateFile(req.files.image, "image");
    if (!fileCheck.isValid) {
      return res.status(400).json({ success: false, message: fileCheck.message });
    }

    const imageFile = req.files.image;
    const img = await loadImage(imageFile.data);

    // Use 320×320 for detect-only — fast processing
    const DETECT_SIZE = 320;
    const canvas = createCanvas(DETECT_SIZE, DETECT_SIZE);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, DETECT_SIZE, DETECT_SIZE);

    // 1. AI detection
    let detections = [];
    try {
      detections = await detectObjects(canvas);
    } catch (e) {
      console.warn("[Scanner] YOLO detection error:", e.message);
    }

    const cv = await getCV();
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const mat = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC4);
    mat.data.set(imgData.data);

    let cardResult = null;
    if (detections.length > 0) {
      cardResult = await refineDetection(mat, detections[0], DETECT_SIZE, DETECT_SIZE);
    }

    // 2. Pure OpenCV Fallback if YOLO returned 0 detections or refinement failed
    if (!cardResult && cv) {
      try {
        const gray = new cv.Mat();
        cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
        const blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(7, 7), 0);
        const edges = new cv.Mat();
        cv.Canny(blurred, edges, 30, 100);
        const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
        cv.dilate(edges, edges, kernel);

        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let maxArea = 0;
        let bestPoints = null;
        const minArea = DETECT_SIZE * DETECT_SIZE * 0.08;

        for (let i = 0; i < contours.size(); i++) {
          const cnt = contours.get(i);
          const area = cv.contourArea(cnt);
          if (area > maxArea && area > minArea) {
            const perimeter = cv.arcLength(cnt, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(cnt, approx, 0.02 * perimeter, true);
            if (approx.rows === 4) {
              bestPoints = [];
              for (let j = 0; j < 4; j++) {
                bestPoints.push({
                  x: approx.data32S[j * 2] / DETECT_SIZE,
                  y: approx.data32S[j * 2 + 1] / DETECT_SIZE,
                });
              }
              maxArea = area;
            } else {
              const rect = cv.minAreaRect(cnt);
              const vertices = cv.RotatedRect.points(rect);
              bestPoints = vertices.map(v => ({
                x: v.x / DETECT_SIZE,
                y: v.y / DETECT_SIZE,
              }));
              maxArea = area;
            }
            approx.delete();
          }
        }
        gray.delete(); blurred.delete(); edges.delete(); kernel.delete(); contours.delete(); hierarchy.delete();

        if (bestPoints && bestPoints.length === 4) {
          mat.delete();
          return res.status(200).json({
            success: true,
            detected: true,
            confidence: 0.85,
            points: sortPoints(bestPoints),
          });
        }
      } catch (e) {
        console.warn("[Scanner] Pure OpenCV fallback error:", e.message);
      }
    }

    mat.delete();

    if (cardResult && cardResult.points) {
      const normPoints = cardResult.points.map((p) => ({
        x: p.x / DETECT_SIZE,
        y: p.y / DETECT_SIZE,
      }));
      return res.status(200).json({
        success: true,
        detected: true,
        confidence: cardResult.confidence || 0.8,
        points: sortPoints(normPoints),
      });
    }

    // Default Fallback document box so user can scan any paper smoothly
    return res.status(200).json({
      success: true,
      detected: true,
      confidence: 0.75,
      points: [
        { x: 0.1, y: 0.15 },
        { x: 0.9, y: 0.15 },
        { x: 0.9, y: 0.85 },
        { x: 0.1, y: 0.85 },
      ],
    });
  } catch (error) {
    console.error("[Scanner/detect] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const scanDocumentController = async (req, res) => {
  let mat = null;
  let croppedMat = null;
  let enhancedMat = null;

  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    const fileCheck = validateFile(req.files.image, "image");
    if (!fileCheck.isValid) {
      return res.status(400).json({ success: false, message: fileCheck.message });
    }

    const imageFile = req.files.image;
    const img = await loadImage(imageFile.data);

    // Create a canvas for OpenCV to read
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const cv = await getCV();
    if (!cv) {
      throw new Error("OpenCV engine is not ready");
    }

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    mat = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC4);
    mat.data.set(imgData.data);

    let cardPoints = null;
    let detection = null;

    // 1. AI Detection (YOLO)
    try {
      const detections = await detectObjects(canvas);
      console.log("[Scanner] Detections count:", detections ? detections.length : 0);
      if (detections && detections.length > 0) {
        detection = detections[0];

        // Check document type mismatch if document_type_id was provided
        if (req.body.document_type_id) {
          const typeIdNum = parseInt(req.body.document_type_id);
          if (!isNaN(typeIdNum)) {
            const docType = await prisma.documenttype.findUnique({
              where: { id: typeIdNum }
            });
            if (docType) {
              const validation = validateDocTypeMatch(docType.name, detection.class, detection.confidence);
              if (!validation.isValid) {
                if (mat) try { mat.delete(); } catch (_) {}
                return res.status(400).json({
                  success: false,
                  result: false,
                  message: validation.message
                });
              }
            }
          }
        }

        const cardResult = await refineDetection(mat, detection, img.width, img.height);
        if (cardResult && cardResult.points) {
          cardPoints = cardResult.points;
        }
      }
    } catch (e) {
      console.warn("[Scanner] YOLO detection / refinement error:", e.message);
    }

    // 2. Pure OpenCV Fallback if YOLO returned 0 detections or refinement was null
    if (!cardPoints && cv) {
      try {
        const gray = new cv.Mat();
        cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
        const blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(7, 7), 0);
        const edges = new cv.Mat();
        cv.Canny(blurred, edges, 30, 100);
        const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
        cv.dilate(edges, edges, kernel);

        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let maxArea = 0;
        const minArea = img.width * img.height * 0.08;

        for (let i = 0; i < contours.size(); i++) {
          const cnt = contours.get(i);
          const area = cv.contourArea(cnt);
          if (area > maxArea && area > minArea) {
            const perimeter = cv.arcLength(cnt, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(cnt, approx, 0.02 * perimeter, true);
            if (approx.rows === 4) {
              cardPoints = [];
              for (let j = 0; j < 4; j++) {
                cardPoints.push({
                  x: approx.data32S[j * 2],
                  y: approx.data32S[j * 2 + 1],
                });
              }
              maxArea = area;
            } else {
              const rect = cv.minAreaRect(cnt);
              const vertices = cv.RotatedRect.points(rect);
              cardPoints = vertices.map(v => ({ x: v.x, y: v.y }));
              maxArea = area;
            }
            approx.delete();
          }
        }
        gray.delete(); blurred.delete(); edges.delete(); kernel.delete(); contours.delete(); hierarchy.delete();
      } catch (e) {
        console.warn("[Scanner] OpenCV contour fallback error:", e.message);
      }
    }

    // 3. Ultimate Fallback: Full frame document boundary
    if (!cardPoints || cardPoints.length !== 4) {
      cardPoints = [
        { x: 0, y: 0 },
        { x: img.width, y: 0 },
        { x: img.width, y: img.height },
        { x: 0, y: img.height },
      ];
    } else {
      cardPoints = sortPoints(cardPoints);
    }

    // 4. Perspective Transform (Crop)
    const dims = getCardDimensions(cardPoints);
    croppedMat = await perspectiveTransform(mat, cardPoints, dims.width, dims.height);

    // 5. Enhancement (Sharpness, Contrast, Denoise)
    enhancedMat = await enhanceDocument(croppedMat);

    // 6. Output to Canvas
    const outputCanvas = createCanvas(dims.width, dims.height);
    const outputCtx = outputCanvas.getContext("2d");
    const outputImgData = outputCtx.createImageData(enhancedMat.cols, enhancedMat.rows);
    outputImgData.data.set(enhancedMat.data);
    outputCtx.putImageData(outputImgData, 0, 0);

    const buffer = outputCanvas.toBuffer("image/jpeg", { quality: 0.95 });

    // Cleanup OpenCV mats
    if (mat) mat.delete();
    if (croppedMat) croppedMat.delete();
    if (enhancedMat) enhancedMat.delete();

    res.set("Content-Type", "image/jpeg");
    return res.send(buffer);

  } catch (error) {
    if (mat) try { mat.delete(); } catch (_) {}
    if (croppedMat) try { croppedMat.delete(); } catch (_) {}
    if (enhancedMat) try { enhancedMat.delete(); } catch (_) {}
    console.error("[Scanner Controller] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
