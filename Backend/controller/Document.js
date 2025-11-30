import { addDocumentType } from "../model/Document.js";

export const addDocumentTypeController = async (req, res) => {
  try {
    const { name, company_id } = req.body;
    if (!name || !company_id) {
      return res
        .status(400)
        .json({ result: false, message: "Name or Company_id are required..!" });
    }
    const documentInsertData = await addDocumentType(name, company_id);
    res.status(200).json(documentInsertData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
