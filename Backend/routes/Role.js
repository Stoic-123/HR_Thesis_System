import express from "express";
const router = express.Router();
import {
  addRoleController,
  getRoleController,
  updateRoleController,
} from "../controller/Role.js";

router.post("/add-role", addRoleController);
router.get("/get-role/:company_id", getRoleController);
router.put("/update-role/:role_id", updateRoleController);
export default router;
