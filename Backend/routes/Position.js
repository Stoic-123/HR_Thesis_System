import express from "express";
const router = express.Router();
import {
  addPositionController,
  getPositionController,
} from "../controller/Position.js";

router.post("/add-position", addPositionController);
router.get("/get-position/:company_id", getPositionController);
export default router;
