import express from "express";
const router = express.Router();
import {
  activatedDepartmentController,
  addDepartmentController,
  deactivatedDepartmentController,
  getDepartmentController,
  updatedDepartmentController,
} from "../controller/Department.js";

router.post("/add-department", addDepartmentController);
router.get("/get-department/:company_id/:is_active", getDepartmentController);
router.put("/update-department/:department_id", updatedDepartmentController);
router.put(
  "/deactivate-department/:department_id",
  deactivatedDepartmentController
);
router.put(
  "/activate-department/:department_id",
  activatedDepartmentController
);
export default router;
