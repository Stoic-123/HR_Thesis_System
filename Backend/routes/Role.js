import express from "express";
const router = express.Router();
import {
  addRoleController,
  getRoleController,
  updateRoleController,
  updateRolePermissionsController,
  deleteRoleController,
} from "../controller/Role.js";

router.post("/add-role", addRoleController);
router.get("/get-role", getRoleController);
router.put("/update-role/:role_id", updateRoleController);
router.put("/update-permissions/:role_id", updateRolePermissionsController);
router.delete("/delete-role/:role_id", deleteRoleController);
export default router;

