import express from "express";
const router = express.Router();
import {
  activatedDepartmentController,
  addDepartmentController,
  deactivatedDepartmentController,
  getDepartmentController,
  updatedDepartmentController,
} from "../controller/Department.js";
import { validate } from "../middleware/validate.js";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
} from "../validation/department.schema.js";

router.post("/add-department", validate(createDepartmentSchema), addDepartmentController);
router.get("/get-department/:is_active", getDepartmentController);
router.put("/update-department/:department_id", validate(updateDepartmentSchema), updatedDepartmentController);
router.put(
  "/deactivate-department/:department_id",
  deactivatedDepartmentController
);
router.put(
  "/activate-department/:department_id",
  activatedDepartmentController
);
export default router;
