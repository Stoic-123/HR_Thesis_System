import {
  addEmployee,
  emailCheck,
  getAllEmployee,
  getEmployee,
  updateEmployee,
  addDocument,
  deleteDocument,
  deleteEmployee,
} from "../service/Employee.js";
import { addAuditLog } from "../service/AuditLog.js";
import prisma from "../lib/prisma.js";
import { createCanvas, loadImage } from "canvas";
import { detectObjects } from "../lib/scanner/yolo.js";
import { validateFile } from "../utils/fileValidation.js";
import { uploadToStorage } from "../service/Storage.js";

export const addEmployeeController = async (req, res) => {
  try {
    let profile_path = null;

    if (req.files) {
      if (req.files.profile_path) {
        const fileCheck = validateFile(req.files.profile_path, "image");
        if (!fileCheck.isValid) {
          return res.status(400).json({ result: false, message: fileCheck.message });
        }
        const profile = req.files.profile_path;
        const profileName = Date.now() + "_" + profile.name;
        profile_path = await uploadToStorage(profile.data, "profiles", profileName, profile.mimetype);
      }
    }
    const {
      first_name,
      last_name,
      age,
      gender,
      phone_number1,
      phone_number2,
      email,
      address,
      position_id,
      department_id,
      role_id,
      telegram_username,
      joined_at,
      is_active,
      base_salary,
    } = req.body;
    const company_id = req.user.company_id;
    const user_id = req.user.id;

    const mailCheck = await emailCheck(email);
    if (mailCheck.result) {
      return res.status(400).json({
        result: false,
        message: "Email already existed in database..!",
      });
    }
    const employeeInsertData = await addEmployee(
      first_name,
      last_name,
      age,
      gender,
      phone_number1,
      phone_number2,
      email,
      address,
      profile_path,
      position_id,
      department_id,
      role_id,
      telegram_username,
      joined_at,
      company_id,
      is_active,
      base_salary,
    );

    // Audit Log
    await addAuditLog(
      user_id,
      company_id,
      "Employee",
      "CREATE",
      `Created new employee: ${first_name} ${last_name}`,
      null,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(200).json({ employeeInsertData });
  } catch (error) {
    console.error("Error adding employee:", error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const updateEmployeeController = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    const company_id = req.user.company_id;
    const user_id = req.user.id;

    if (req.files && req.files.profile_path) {
      const fileCheck = validateFile(req.files.profile_path, "image");
      if (!fileCheck.isValid) {
        return res.status(400).json({ result: false, message: fileCheck.message });
      }
      const profile = req.files.profile_path;
      const profileName = Date.now() + "_" + profile.name;
      updateData.profile_path = await uploadToStorage(profile.data, "profiles", profileName, profile.mimetype);
    }

    const result = await updateEmployee(id, updateData);

    // Audit Log
    await addAuditLog(
      user_id,
      company_id,
      "Employee",
      "UPDATE",
      `Updated employee ID: ${id}`,
      null,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("Error updating employee:", error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const uploadEmployeeDocumentController = async (req, res) => {
  try {
    const { id } = req.params;
    const { document_type_id } = req.body;
    const company_id = req.user.company_id;
    const user_id = req.user.id;

    if (!req.files || !req.files.document) {
      return res.status(400).json({ result: false, message: "No document uploaded" });
    }

    const fileCheck = validateFile(req.files.document, "document");
    if (!fileCheck.isValid) {
      return res.status(400).json({ result: false, message: fileCheck.message });
    }

    const document = req.files.document;

    if (!document_type_id) {
      return res.status(400).json({ result: false, message: "សូមជ្រើសរើសប្រភេទឯកសារ (Document type is required)" });
    }

    // AI/YOLO Soft Verification for Images (log warning instead of hard blocking)
    const typeIdNum = parseInt(document_type_id);
    if (!isNaN(typeIdNum)) {
      const docType = await prisma.documenttype.findUnique({
        where: { id: typeIdNum }
      });

      if (docType) {
        const typeName = docType.name.toLowerCase();
        const isPassportSelected = typeName.includes("passport");
        const isIdCardSelected = typeName.includes("card") || typeName.includes("id") || typeName.includes("identity") || typeName.includes("license");

        if (isPassportSelected || isIdCardSelected) {
          const isImage = document.mimetype && document.mimetype.startsWith("image/");
          if (isImage) {
            try {
              const img = await loadImage(document.data);
              const canvas = createCanvas(img.width, img.height);
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0);

              const detections = await detectObjects(canvas);
              if (detections.length > 0) {
                const topDetection = detections[0];
                const detectedClass = topDetection.class;
                console.log(`[AI Verification] Selected: ${docType.name}, Detected: ${detectedClass}`);
              }
            } catch (err) {
              console.error("[AI Verification] Image check error:", err);
            }
          }
        }
      }
    }

    const documentName = Date.now() + "_" + document.name;
    const document_path = await uploadToStorage(document.data, "documents", documentName, document.mimetype);

    const result = await addDocument(id, document_type_id, document_path);

    // Audit Log
    await addAuditLog(
      user_id,
      company_id,
      "Document",
      "UPLOAD",
      `Uploaded document for employee ID: ${id}`,
      null,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("Error uploading document:", error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const deleteEmployeeDocumentController = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;
    const user_id = req.user.id;

    const result = await deleteDocument(id);

    // Audit Log
    await addAuditLog(
      user_id,
      company_id,
      "Document",
      "DELETE",
      `Deleted document ID: ${id}`,
      null,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("Error deleting document:", error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const deleteEmployeeController = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;
    const user_id = req.user.id;

    const result = await deleteEmployee(id);

    // Audit Log
    await addAuditLog(
      user_id,
      company_id,
      "Employee",
      "DELETE",
      `Deleted employee ID: ${id}`,
      null,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("Error deleting employee:", error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const getAllEmployeeController = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { page, limit, status, department_id, search } = req.query;
    if (!company_id) {
      return res
        .status(400)
        .json({ result: false, message: "Company context is required..!" });
    }
    const employeeGetData = await getAllEmployee(company_id, page, limit, status, department_id, search);
    res.status(200).json(employeeGetData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const getEmployeeController = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ result: false, message: "Employee id is not defined..!" });
    }
    const employeeGetData = await getEmployee(id);
    res.status(200).json(employeeGetData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
