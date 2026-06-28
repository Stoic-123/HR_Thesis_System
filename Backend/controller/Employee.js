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

export const addEmployeeController = async (req, res) => {
  try {
    let profile_path = null;

    if (req.files) {
      if (req.files.profile_path) {
        const profile = req.files.profile_path;
        const profileName = Date.now() + "_" + profile.name;
        const uploadPath = "./public/uploads/profiles/" + profileName;
        await profile.mv(uploadPath);
        profile_path = "/uploads/profiles/" + profileName;
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
      const profile = req.files.profile_path;
      const profileName = Date.now() + "_" + profile.name;
      const uploadPath = "./public/uploads/profiles/" + profileName;
      await profile.mv(uploadPath);
      updateData.profile_path = "/uploads/profiles/" + profileName;
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

    const document = req.files.document;

    // AI/YOLO Verification for Images
    const docType = await prisma.documenttype.findUnique({
      where: { id: parseInt(document_type_id) }
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
            // In case of error (e.g. invalid image format), log and proceed
          }
        }
      }
    }

    const documentName = Date.now() + "_" + document.name;
    const uploadPath = "./public/uploads/documents/" + documentName;
    await document.mv(uploadPath);
    const document_path = "/uploads/documents/" + documentName;

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
