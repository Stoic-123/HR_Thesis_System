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
export const addDocument = async (
  emloyee_id,
  document_type_id,
  document_path
) => {
  try {
    const sql =
      "INSERT INTO document (employee_id,document_type_id, document_path) VALUES(?,?,?)";
    const [results] = await db.execute(sql, [
      emloyee_id,
      document_type_id,
      document_path,
    ]);
    if (results.affectedRows === 0) {
      return {
        result: false,
        message: "Failed to add document..!",
      };
    }
    return {
      result: true,
      message: "Document added successfully.",
    };
  } catch (error) {
    console.log(error);
    throw error;
  }
};
export const getDocumentType = async (company_id) => {
  try {
    const sql = "SELECT * FROM documenttype where company_id =?";
    const [rows] = await db.execute(sql, [company_id]);
    if (rows.length === 0) {
      return {
        result: false,
        message: "No document type data in database..!",
      };
    }
    return {
      result: true,
      message: "Get document type successfully.",
      data: rows,
    };
  } catch (error) {
    console.log(error);
    throw error;
  }
};
