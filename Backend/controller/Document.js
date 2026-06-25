import {
  addDocument,
  addDocumentType,
  getDocumentType,
  deleteDocumentType,
  updateDocumentType,
} from "../service/Document.js";
import prisma from "../lib/prisma.js";
import { createCanvas, loadImage } from "canvas";
import { detectObjects } from "../lib/scanner/yolo.js";



export const addDocumentTypeController = async (req, res) => {
  try {
    const { name } = req.body;
    const company_id = req.user.company_id;
    if (!name || !company_id) {
      return res
        .status(400)
        .json({ result: false, message: "Name and company context are required..!" });
    }
    const documentInsertData = await addDocumentType(name, company_id);
    res.status(200).json(documentInsertData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const addDocumentController = async (req, res) => {
  try {
    const { employee_id, document_type_id } = req.body;

    // ✅ Correct validation
    if (!employee_id || !document_type_id) {
      return res.status(400).json({
        result: false,
        message: "Employee_id and document_type_id are required..!",
      });
    }

    // ✅ Initialize array
    let document_path;

    // ✅ Safe file check
    if (req.files && req.files.document_path) {
      const docs = Array.isArray(req.files.document_path)
        ? req.files.document_path
        : [req.files.document_path];

      // Retrieve document type from DB to inspect name
      const docType = await prisma.documenttype.findUnique({
        where: { id: parseInt(document_type_id) }
      });

      if (docType) {
        const typeName = docType.name.toLowerCase();
        const isPassportSelected = typeName.includes("passport");
        const isIdCardSelected = typeName.includes("card") || typeName.includes("id") || typeName.includes("identity") || typeName.includes("license");

        if (isPassportSelected || isIdCardSelected) {
          for (const doc of docs) {
            // Only perform verification on image files
            const isImage = doc.mimetype && doc.mimetype.startsWith("image/");
            if (isImage) {
              try {
                const img = await loadImage(doc.data);
                const canvas = createCanvas(img.width, img.height);
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);

                const detections = await detectObjects(canvas);
                if (detections.length > 0) {
                  const detectedClass = topDetection.class;
                  const isCardDetected = detectedClass === "id_card" || detectedClass === "khmer_id";
                  const isDocDetected = detectedClass === "document" || detectedClass === "passport";

                  if (isPassportSelected && isCardDetected) {
                    return res.status(400).json({
                      result: false,
                      message: "លិខិតឆ្លងដែនមិនត្រឹមត្រូវ៖ ឯកសារនេះមើលទៅដូចជាកាតសម្គាល់ខ្លួន (ID Card) ទៅវិញទេ។ (Invalid Passport: This document looks like an ID card.)"
                    });
                  }

                  if (isIdCardSelected && isDocDetected) {
                    return res.status(400).json({
                      result: false,
                      message: "កាតសម្គាល់ខ្លួនមិនត្រឹមត្រូវ៖ ឯកសារនេះមើលទៅដូចជាក្រដាស/លិខិតឆ្លងដែន (Passport/Document) ទៅវិញទេ។ (Invalid ID Card: This document looks like a paper/passport.)"
                    });
                  }
                }
              } catch (err) {
                console.error("[AI Verification] Image check error:", err);
                // In case of an unexpected processing error, log and let it proceed or return error
              }
            }
          }
        }
      }

      for (const doc of docs) {
        const docName = Date.now() + "_" + doc.name;
        const uploadPath = "./public/uploads/documents/" + docName;

        await doc.mv(uploadPath);

        document_path = "/uploads/documents/" + docName;
      }
    }

    const documentInsertData = await addDocument(
      employee_id,
      document_type_id,
      document_path,
      req.user.company_id
    );

    res.status(200).json(documentInsertData);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      result: false,
      message: error.message,
    });
  }
};

export const getDocumentTypeController = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { page, limit } = req.query;
    if (!company_id) {
      return res
        .status(400)
        .json({ result: false, message: "Company context is required..!" });
    }
    const documentTypeGetData = await getDocumentType(company_id, page, limit);
    res.status(200).json(documentTypeGetData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const deleteDocumentTypeController = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const result = await deleteDocumentType(id, company_id);
    res.status(200).json(result);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const updateDocumentTypeController = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const company_id = req.user.company_id;

    if (!name) {
      return res.status(400).json({ result: false, message: "Name is required." });
    }

    const result = await updateDocumentType(id, name, company_id);
    res.status(200).json(result);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};


