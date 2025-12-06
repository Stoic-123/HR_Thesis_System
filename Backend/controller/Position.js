import { addPosition, getPosition } from "../model/Position.js";

export const addPositionController = async (req, res) => {
  try {
    const { name, department_id } = req.body;
    if (!name) {
      return res.status(400).json({
        result: false,
        message: "Name and Department_id are required..!",
      });
    }
    const positionInsertData = await addPosition(name, department_id);
    res.status(200).json(positionInsertData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error });
  }
};

export const getPositionController = async (req, res) => {
  try {
    const { company_id } = req.params;
    if (!company_id) {
      return res
        .status(400)
        .json({ result: false, message: "Company_id is required..!" });
    }
    const positionGetData = await getPosition(company_id);
    res.status(200).json(positionGetData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
