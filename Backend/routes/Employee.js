import express from "express";
const router = express.Router();
import { requireAuth } from "../middleware/auth.js";
import {
  addEmployeeController,
  getAllEmployeeController,
  getEmployeeController,
  updateEmployeeController,
  uploadEmployeeDocumentController,
  deleteEmployeeDocumentController,
  deleteEmployeeController,
} from "../controller/Employee.js";
import { validate } from "../middleware/validate.js";
import { createEmployeeSchema } from "../validation/employee.schema.js";

router.post("/add-employee", requireAuth, validate(createEmployeeSchema), addEmployeeController);
router.put("/update-employee/:id", requireAuth, updateEmployeeController);
router.post("/upload-document/:id", requireAuth, uploadEmployeeDocumentController);
router.delete("/delete-document/:id", requireAuth, deleteEmployeeDocumentController);
router.delete("/delete-employee/:id", requireAuth, deleteEmployeeController);
router.get("/get-all-employee", requireAuth, getAllEmployeeController);
router.get("/get-employee/:id", requireAuth, getEmployeeController);
export default router;
