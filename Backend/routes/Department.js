import express from "express";
const router = express.Router();
import { addDepartmentController } from "../controller/Department.js";

router.post("/add-department", addDepartmentController);

export default router;
