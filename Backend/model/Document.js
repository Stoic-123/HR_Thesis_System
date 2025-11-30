import { db } from "../config/db.js";

export const addDocumentType = async (name, company_id) => {
  try {
    const sql = "INSERT INTO DocumentType (name,company_id) VALUE (?,?)";
    const [docTypeResult] = await db.execute(sql, [name, company_id]);
    if (docTypeResult.affectedRows === 0) {
      return {
        result: false,
        message: "Failed to create document type..!",
      };
    }
    return {
      result: true,
      message: "Document type created successfully.",
    };
  } catch (error) {
    console.log(error);
    throw error;
  }
};
