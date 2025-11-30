import { addEmployee } from "../model/Employee.js";

export const addEmployeeController = async (req, res) => {
  try {
    let profilePath = null;
    let documents = [];

    if (req.files) {
      if (req.files.profile_image) {
        const profile = req.files.profile_image;
        const profileName = Date.now() + "_" + profile.name;
        const uploadPath = "./public/uploads/profiles/" + profileName;
        await profile.mv(uploadPath);
        profilePath = "/uploads/profiles/" + profileName;
      }

      if (req.files.document) {
        const docs = Array.isArray(req.files.document)
          ? req.files.document
          : [req.files.document];
        for (const doc of docs) {
          const docName = Date.now() + "_" + doc.name;
          const uploadPath = "./public/uploads/documents/" + docName;
          await doc.mv(uploadPath);
          documents.push({
            path: "/uploads/documents/" + docName,
            type: req.body.document_type || 1,
          });
        }
      }
    }

    const employeeData = {
      ...req.body,
      profile_path: profilePath,
    };

    const employeeInsertData = await addEmployee(employeeData, documents);
    res.status(200).json({ employeeInsertData });
  } catch (error) {
    console.error("Error adding employee:", error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
