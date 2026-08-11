// Backend/controller/Scanner.js

import { createCanvas, loadImage } from "canvas";
import { detectObjects } from "../lib/scanner/yolo.js";
import { refineDetection } from "../lib/scanner/opencv-refinement.js";
import { perspectiveTransform, getCardDimensions } from "../lib/scanner/perspective-transform.js";
import { enhanceDocument } from "../lib/scanner/enhancement.js";
import { getCV } from "../lib/scanner/cv-helper.js";
import prisma from "../lib/prisma.js";
import { validateFile } from "../utils/fileValidation.js";

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
        gray.delete(); blurred.delete(); edges.delete(); contours.delete(); hierarchy.delete();

        if (bestPoints) {
          mat.delete();
          return res.status(200).json({
            success: true,
            detected: true,
            confidence: 0.85,
            points: bestPoints,
          });
        }
      } catch (e) {
        console.warn("[Scanner] Pure OpenCV fallback error:", e.message);
      }
    }

    mat.delete();

    if (cardResult) {
      const normPoints = cardResult.points.map((p) => ({
        x: p.x / DETECT_SIZE,
        y: p.y / DETECT_SIZE,
      }));
      return res.status(200).json({
        success: true,
        detected: true,
        confidence: cardResult.confidence || 0.8,
        points: normPoints,
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

    // 1. AI Detection
    const detections = await detectObjects(canvas);
    console.log("[Scanner] Detections count:", detections.length, "Detections:", JSON.stringify(detections, null, 2));

    if (detections.length === 0) {
      return res.status(404).json({ success: false, message: "No document detected" });
    }

    // 2. OpenCV Refinement
    const cv = await getCV();
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const mat = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC4);
    mat.data.set(imgData.data);

    const detection = detections[0];
    const cardResult = await refineDetection(mat, detection, img.width, img.height);

    if (!cardResult) {
      mat.delete();
      return res.status(404).json({ success: false, message: "Could not refine borders" });
    }

    // 3. Perspective Transform (Crop)
    const dims = getCardDimensions(cardResult.points);
    const croppedMat = await perspectiveTransform(mat, cardResult.points, dims.width, dims.height);

    // 4. Enhancement
    const enhancedMat = await enhanceDocument(croppedMat);

    // 5. Output to Canvas
    const outputCanvas = createCanvas(dims.width, dims.height);
    const outputCtx = outputCanvas.getContext("2d");
    const outputImgData = outputCtx.createImageData(enhancedMat.cols, enhancedMat.rows);
    outputImgData.data.set(enhancedMat.data);
    outputCtx.putImageData(outputImgData, 0, 0);

    // AI/YOLO Verification for Images based on selected document type
    const { document_type_id } = req.body;
    if (document_type_id) {
      const docType = await prisma.documenttype.findUnique({
        where: { id: parseInt(document_type_id) }
      });
      if (docType) {
        const typeName = docType.name.toLowerCase();
        const isPassportSelected = typeName.includes("passport");
        const isIdCardSelected = typeName.includes("card") || typeName.includes("id") || typeName.includes("identity") || typeName.includes("license");

        if (isPassportSelected || isIdCardSelected) {
          // Detect objects on the cropped canvas to verify its type
          const croppedDetections = await detectObjects(outputCanvas);
          console.log("[Scanner] Cropped Detections count:", croppedDetections.length, "Cropped Detections:", JSON.stringify(croppedDetections, null, 2));

          let detectedClass = null;
          if (croppedDetections.length > 0) {
            detectedClass = croppedDetections[0].class;
          } else {
            // Fallback to original detection class if no detection inside the cropped canvas
            detectedClass = detection.class;
          }

          const isCardDetected = detectedClass === "id_card" || detectedClass === "khmer_id";
          const isDocDetected = detectedClass === "document" || detectedClass === "passport";

          if (isPassportSelected && isCardDetected) {
            mat.delete();
            croppedMat.delete();
            enhancedMat.delete();
            return res.status(400).json({
              success: false,
              message: "លិខិតឆ្លងដែនមិនត្រឹមត្រូវ៖ ឯកសារនេះមើលទៅដូចជាកាតសម្គាល់ខ្លួន (ID Card) ទៅវិញទេ។ (Invalid Passport: This document looks like an ID card.)"
            });
          }

          if (isIdCardSelected && isDocDetected) {
            mat.delete();
            croppedMat.delete();
            enhancedMat.delete();
            return res.status(400).json({
              success: false,
              message: "កាតសម្គាល់ខ្លួនមិនត្រឹមត្រូវ៖ ឯកសារនេះមើលទៅដូចជាក្រដាស/លិខិតឆ្លងដែន (Passport/Document) ទៅវិញទេ។ (Invalid ID Card: This document looks like a paper/passport.)"
            });
          }
        }
      }
    }

    const buffer = outputCanvas.toBuffer("image/jpeg", { quality: 0.95 });

    // Cleanup
    mat.delete();
    croppedMat.delete();
    enhancedMat.delete();

    res.set("Content-Type", "image/jpeg");
    res.send(buffer);

  } catch (error) {
    console.error("[Scanner Controller] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
