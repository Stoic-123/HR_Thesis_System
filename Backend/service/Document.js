import prisma from "../lib/prisma.js";

export const addDocumentType = async (name, company_id) => {
  try {
    await prisma.documenttype.create({
      data: {
        name,
        company_id: parseInt(company_id),
      },
    });

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
  employee_id,
  document_type_id,
  document_path,
  company_id
) => {
  try {
    const eid = parseInt(employee_id);
    const cid = parseInt(company_id);

    // Verify employee belongs to company
    const employee = await prisma.employee.findUnique({
      where: { id: eid, company_id: cid },
    });

    if (!employee) {
      return { result: false, message: "Employee not found in your company." };
    }

    await prisma.document.create({
      data: {
        employee_id: eid,
        document_type_id: parseInt(document_type_id),
        document_path,
      },
    });

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
    const rows = await prisma.documenttype.findMany({
      where: {
        company_id: parseInt(company_id),
      },
    });

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
