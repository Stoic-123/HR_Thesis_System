import express from "express";
const router = express.Router();
import {
  addLocationController,
  getLocationController,
  updateLocationController,
  deleteLocationController,
  getEmployeeLocationsController,
  assignEmployeeLocationsController,
} from "../controller/Location.js";

router.post("/add-location", addLocationController);
router.get("/get-location", getLocationController);
router.put("/update-location/:id", updateLocationController);
router.delete("/delete-location/:id", deleteLocationController);

router.get("/employee-locations", getEmployeeLocationsController);
router.post("/assign-employee-locations", assignEmployeeLocationsController);

export default router;
