import express from "express";
const router = express.Router();
import {
  addDocumentController,
  addDocumentTypeController,
  getDocumentTypeController,
  deleteDocumentTypeController,
  updateDocumentTypeController,
} from "../controller/Document.js";

router.post("/add-document-type", addDocumentTypeController);
router.get("/get-document-type", getDocumentTypeController);
router.put("/update-document-type/:id", updateDocumentTypeController);
router.delete("/delete-document-type/:id", deleteDocumentTypeController);

router.post("/add-document", addDocumentController);

export default router;
