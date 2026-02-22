import {
  addDocument,
  addDocumentType,
  getDocumentType,
} from "../service/Document.js";

export const addDocumentTypeController = async (req, res) => {
  try {
    const { name } = req.body;
    const company_id = req.user.company_id;
    if (!name || !company_id) {
      return res
        .status(400)
        .json({ result: false, message: "Name and company context are required..!" });
    }
    const documentInsertData = await addDocumentType(name, company_id);
    res.status(200).json(documentInsertData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const addDocumentController = async (req, res) => {
  try {
    const { employee_id, document_type_id } = req.body;

    // ✅ Correct validation
    if (!employee_id || !document_type_id) {
      return res.status(400).json({
        result: false,
        message: "Employee_id and document_type_id are required..!",
      });
    }

    // ✅ Initialize array
    let document_path;

    // ✅ Safe file check
    if (req.files && req.files.document_path) {
      const docs = Array.isArray(req.files.document_path)
        ? req.files.document_path
        : [req.files.document_path];

      for (const doc of docs) {
        const docName = Date.now() + "_" + doc.name;
        const uploadPath = "./public/uploads/documents/" + docName;

        await doc.mv(uploadPath);

        document_path = "/uploads/documents/" + docName;
      }
    }

    const documentInsertData = await addDocument(
      employee_id,
      document_type_id,
      document_path,
      req.user.company_id
    );

    res.status(200).json(documentInsertData);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      result: false,
      message: error.message,
    });
  }
};

export const getDocumentTypeController = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    if (!company_id) {
      return res
        .status(400)
        .json({ result: false, message: "Company context is required..!" });
    }
    const documentTypeGetData = await getDocumentType(company_id);
    res.status(200).json(documentTypeGetData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
