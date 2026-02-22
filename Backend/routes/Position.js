import express from "express";
const router = express.Router();
import {
  addPositionController,
  deletedPositionController,
  getPositionController,
  updatedPositionController,
} from "../controller/Position.js";

router.post("/add-position", addPositionController);
router.get("/get-position", getPositionController);
router.put("/update-position/:position_id", updatedPositionController);
router.delete("/delete-position/:position_id", deletedPositionController);
export default router;
