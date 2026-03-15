import prisma from "../lib/prisma.js";

export const addPosition = async (name, department_id, company_id) => {
  try {
    const did = department_id ? parseInt(department_id) : null;
    const cid = parseInt(company_id);

    if (did) {
      const dept = await prisma.department.findUnique({
        where: { id: did, company_id: cid },
      });
      if (!dept) {
        return { result: false, message: "Department not found in your company." };
      }
    }

    await prisma.positions.create({
      data: {
        name,
        department_id: did,
      },
    });

    return {
      result: true,
      message: "Position created successfully.",
    };
  } catch (error) {
    console.error("DB ERROR:", error);
    throw error;
  }
};

export const getPosition = async (company_id) => {
  try {
    const positionResult = await prisma.positions.findMany({
      where: {
        is_active: true,
        department: {
          company_id: parseInt(company_id),
        },
      },
    });

    if (positionResult.length === 0) {
      return {
        result: false,
        message: "No position data in database..!",
      };
    }
    return {
      result: true,
      data: positionResult,
    };
  } catch (error) {
    console.error("DB ERROR:", error);
    throw error;
  }
};
export const updatePosition = async (name, department_id, position_id, company_id) => {
  try {
    const pid = parseInt(position_id);
    const did = department_id ? parseInt(department_id) : null;
    const cid = parseInt(company_id);

    if (did) {
      const dept = await prisma.department.findUnique({
        where: { id: did, company_id: cid },
      });
      if (!dept) {
        return { result: false, message: "Department not found in your company." };
      }
    }

    await prisma.positions.update({
      where: { 
        id: pid,
        department: { company_id: cid }
      },
      data: {
        name,
        department_id: did,
      },
    });

    return {
      result: true,
      message: "Position updated successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
export const deletePosition = async (position_id, company_id) => {
  try {
    const id = parseInt(position_id);
    const cid = parseInt(company_id);

    const position = await prisma.positions.findUnique({
      where: { 
        id,
        department: { company_id: cid }
      }
    });

    if (!position) {
      return { result: false, message: "Position not found in your company." };
    }

    const checkPositionInUsed = await prisma.employee.findMany({
      where: { position_id: id, company_id: cid },
    });

    if (checkPositionInUsed.length !== 0) {
      return {
        result: false,
        message: "Position is in used, you cannot delete this position..!",
      };
    }

    await prisma.positions.delete({
      where: { id },
    });

    return {
      result: true,
      message: "Positon deleted successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
