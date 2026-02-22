import prisma from "../lib/prisma.js";

export const addAuditLog = async (auditLog) => {
  try {
    const result = await prisma.auditlog.create({
      data: {
        user_id: auditLog.user_id ? parseInt(auditLog.user_id) : null,
        company_id: parseInt(auditLog.company_id),
        module: auditLog.module,
        action: auditLog.action,
        description: auditLog.description || auditLog.details,
        ip_address: auditLog.ip_address,
        user_agent: auditLog.user_agent,
      },
    });
    return result.id;
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

export const getAuditLog = async (company_id) => {
  try {
    const result = await prisma.auditlog.findMany({
      where: {
        company_id: parseInt(company_id),
      },
      include: {
        user: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });
    return result;
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};