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
export const getDocumentType = async (company_id, page = 1, limit = 10) => {
  try {
    const where = {
      company_id: parseInt(company_id),
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [data, total] = await Promise.all([
      prisma.documenttype.findMany({
        where,
        skip,
        take,
      }),
      prisma.documenttype.count({
        where,
      }),
    ]);

    if (data.length === 0) {
      return {
        result: false,
        message: "No document type data in database..!",
      };
    }
    return {
      result: true,
      message: "Get document type successfully.",
      data,
      pagination: {
        total,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const deleteDocumentType = async (id, company_id) => {
  try {
    const docType = await prisma.documenttype.findUnique({
      where: { id: parseInt(id) },
    });

    if (!docType || docType.company_id !== parseInt(company_id)) {
      return { result: false, message: "Document type not found or access denied." };
    }

    // Check if any documents are using this type
    const docCount = await prisma.document.count({
      where: { document_type_id: parseInt(id) },
    });

    if (docCount > 0) {
      return { result: false, message: "Cannot delete document type as it is being used by documents." };
    }

    await prisma.documenttype.delete({
      where: { id: parseInt(id) },
    });

    return { result: true, message: "Document type deleted successfully." };
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const updateDocumentType = async (id, name, company_id) => {
  try {
    const docType = await prisma.documenttype.findUnique({
      where: { id: parseInt(id) },
    });

    if (!docType || docType.company_id !== parseInt(company_id)) {
      return { result: false, message: "Document type not found or access denied." };
    }

    await prisma.documenttype.update({
      where: { id: parseInt(id) },
      data: { name },
    });

    return { result: true, message: "Document type updated successfully." };
  } catch (error) {
    console.log(error);
    throw error;
  }
};


