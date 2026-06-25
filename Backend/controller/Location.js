import { addLocation, getLocation, updateLocation, deleteLocation, getEmployeeLocations, assignEmployeeLocations } from "../service/Location.js";
import { addAuditLog } from "../service/AuditLog.js";

export const addLocationController = async (req, res) => {
  try {
    const { name, longitude, latitude, radius } = req.body;
    const company_id = req.user.company_id;

    if (!name) {
      return res.status(400).json({ result: false, message: "Location name is required." });
    }

    const result = await addLocation(name, company_id, longitude, latitude, radius);

    // Audit Log
    await addAuditLog(
      req.user.id,
      company_id,
      "Location",
      "CREATE",
      `Created new location: ${name}`,
      null,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(200).json(result);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getLocationController = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const result = await getLocation(company_id);
    res.status(200).json(result);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const updateLocationController = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, longitude, latitude, radius } = req.body;
    const company_id = req.user.company_id;

    if (!name) {
      return res.status(400).json({ result: false, message: "Location name is required." });
    }

    const result = await updateLocation(id, name, longitude, latitude, radius, company_id);

    // Audit Log
    await addAuditLog(
      req.user.id,
      company_id,
      "Location",
      "UPDATE",
      `Updated location: ${name}`,
      null,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(200).json(result);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const deleteLocationController = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const result = await deleteLocation(id, company_id);

    // Audit Log
    await addAuditLog(
      req.user.id,
      company_id,
      "Location",
      "DELETE",
      `Deleted location ID: ${id}`,
      null,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(200).json(result);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getEmployeeLocationsController = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const result = await getEmployeeLocations(company_id);
    res.status(200).json(result);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const assignEmployeeLocationsController = async (req, res) => {
  try {
    const { employee_id, location_id, secondary_location_ids } = req.body;
    const company_id = req.user.company_id;

    if (!employee_id) {
      return res.status(400).json({ result: false, message: "Employee ID is required." });
    }

    const result = await assignEmployeeLocations(employee_id, location_id, secondary_location_ids);

    // Audit Log
    await addAuditLog(
      req.user.id,
      company_id,
      "EmployeeLocation",
      "UPDATE",
      `Assigned locations for employee ID: ${employee_id}`,
      null,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(200).json(result);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
