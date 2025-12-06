import express from "express";
const router = express.Router();
import { addRoleController, getRoleController } from "../controller/Role.js";

router.post("/add-role", addRoleController);
router.get("/get-role/:company_id", getRoleController);
export default router;
