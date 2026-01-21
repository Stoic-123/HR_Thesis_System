import express from "express";
const router = express.Router();
import {
  addDocumentController,
  addDocumentTypeController,
  getDocumentTypeController,
} from "../controller/Document.js";

router.post("/add-document-type", addDocumentTypeController);
router.get("/get-document-type", getDocumentTypeController);
router.post("/add-document", addDocumentController);
export default router;
