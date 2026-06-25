// Backend/controller/Scanner.js

import { createCanvas, loadImage } from "canvas";
import cv from "@techstark/opencv-js";
import { detectObjects } from "../lib/scanner/yolo.js";
import { refineDetection } from "../lib/scanner/opencv-refinement.js";
import { perspectiveTransform, getCardDimensions } from "../lib/scanner/perspective-transform.js";
import { enhanceDocument } from "../lib/scanner/enhancement.js";
import prisma from "../lib/prisma.js";

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

    const imageFile = req.files.image;
    const img = await loadImage(imageFile.data);

    // Use 320×320 for detect-only — half the YOLO input, 4× fewer pixels to process
    const DETECT_SIZE = 320;
    const canvas = createCanvas(DETECT_SIZE, DETECT_SIZE);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, DETECT_SIZE, DETECT_SIZE);

    // 1. AI detection
    const detections = await detectObjects(canvas);
    if (detections.length === 0) {
      return res.status(200).json({ success: true, detected: false });
    }

    // 2. OpenCV refinement to get precise corner points
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const mat = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC4);
    mat.data.set(imgData.data);

    const detection = detections[0];
    const cardResult = refineDetection(mat, detection, DETECT_SIZE, DETECT_SIZE);
    mat.delete();

    if (!cardResult) {
      // Fall back to raw YOLO bounding box
      return res.status(200).json({
        success: true,
        detected: true,
        confidence: detection.confidence,
        points: [
          { x: detection.x,                    y: detection.y },
          { x: detection.x + detection.width,  y: detection.y },
          { x: detection.x + detection.width,  y: detection.y + detection.height },
          { x: detection.x,                    y: detection.y + detection.height },
        ],
      });
    }

    // Normalise pixel points to 0-1 using canvas size
    const normPoints = cardResult.points.map((p) => ({
      x: p.x / DETECT_SIZE,
      y: p.y / DETECT_SIZE,
    }));

    return res.status(200).json({
      success: true,
      detected: true,
      confidence: cardResult.confidence,
      points: normPoints,
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

    const imageFile = req.files.image;
    const img = await loadImage(imageFile.data);

    // Create a canvas for OpenCV to read
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    // 1. AI Detection
    const detections = await detectObjects(canvas);
    console.log("[Scanner] Detections count:", detections.length, "Detections:", JSON.stringify(detections, null, 2));

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
          if (detections.length > 0) {
            const topDetection = detections[0];
            const detectedClass = topDetection.class;
            if (isPassportSelected && detectedClass !== "passport") {
              return res.status(400).json({
                success: false,
                message: "លិខិតឆ្លងដែនមិនត្រឹមត្រូវ៖ ឯកសារនេះមើលទៅមិនដូចជាលិខិតឆ្លងដែន (Passport) ទេ។ (Invalid Passport: This document does not look like a passport.)"
              });
            }

            if (isIdCardSelected && detectedClass !== "id_card" && detectedClass !== "khmer_id") {
              return res.status(400).json({
                success: false,
                message: "កាតសម្គាល់ខ្លួនមិនត្រឹមត្រូវ៖ ឯកសារនេះមើលទៅមិនដូចជាកាតសម្គាល់ខ្លួន (ID Card) ទេ។ (Invalid ID Card: This document does not look like an ID card.)"
              });
            }
          } else {
            return res.status(400).json({
              success: false,
              message: "មិនអាចរកឃើញឯកសារសម្គាល់ខ្លួននៅក្នុងរូបភាពនេះទេ។ សូមព្យាយាមថតឱ្យច្បាស់ជាងនេះ។ (No valid document detected in the image. Please try uploading a clearer photo.)"
            });
          }
        }
      }
    }

    if (detections.length === 0) {
      return res.status(404).json({ success: false, message: "No document detected" });
    }

    // 2. OpenCV Refinement
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const mat = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC4);
    mat.data.set(imgData.data);

    const detection = detections[0];
    const cardResult = refineDetection(mat, detection, img.width, img.height);

    if (!cardResult) {
      mat.delete();
      return res.status(404).json({ success: false, message: "Could not refine borders" });
    }

    // 3. Perspective Transform (Crop)
    const dims = getCardDimensions(cardResult.points);
    const croppedMat = perspectiveTransform(mat, cardResult.points, dims.width, dims.height);

    // 4. Enhancement
    const enhancedMat = enhanceDocument(croppedMat);

    // 5. Output to Buffer
    const outputCanvas = createCanvas(dims.width, dims.height);
    const outputCtx = outputCanvas.getContext("2d");
    const outputImgData = outputCtx.createImageData(enhancedMat.cols, enhancedMat.rows);
    outputImgData.data.set(enhancedMat.data);
    outputCtx.putImageData(outputImgData, 0, 0);
    
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
