import {
  addPosition,
  deletePosition,
  getPosition,
  updatePosition,
} from "../service/Position.js";

export const addPositionController = async (req, res) => {
  try {
    const { name, department_id } = req.body;
    if (!name) {
      return res.status(400).json({
        result: false,
        message: "Name and Department_id are required..!",
      });
    }
    const positionInsertData = await addPosition(name, department_id, req.user.company_id);
    res.status(200).json(positionInsertData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error });
  }
};

export const getPositionController = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { page, limit, department_id } = req.query;
    if (!company_id) {
      return res
        .status(400)
        .json({ result: false, message: "Company context is required..!" });
    }
    
    let deptId = null;
    if (department_id && department_id !== "null" && department_id !== "undefined") {
      deptId = Number(department_id);
    }

    const positionGetData = await getPosition(company_id, page, limit, deptId);
    res.status(200).json(positionGetData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const updatedPositionController = async (req, res) => {
  try {
    const { name, department_id } = req.body;
    const { position_id } = req.params;
    if (!position_id) {
      return res
        .status(400)
        .json({ result: false, message: "Position_id is required..!" });
    }
    const positionUpdateData = await updatePosition(
      name,
      department_id,
      position_id,
      req.user.company_id
    );
    res.status(200).json(positionUpdateData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const deletedPositionController = async (req, res) => {
  try {
    const { position_id } = req.params;
    if (!position_id) {
      return res
        .status(400)
        .json({ result: false, message: "Position_id is required..!" });
    }
    const positionDeleteData = await deletePosition(position_id, req.user.company_id);
    res.status(200).json(positionDeleteData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
