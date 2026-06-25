import prisma from "../lib/prisma.js";

export const addAuditLog = async (user_id,company_id,module,action,description,details,ip_address,user_agent) => {
  try {
    const result = await prisma.auditlog.create({
      data: {
        user_id: user_id ? parseInt(user_id) : null,
        company_id: company_id ? parseInt(company_id) : null,
        module: module,
        action: action,
        description: description || details,
        ip_address: ip_address,
        user_agent: user_agent,
      },
    });
    return result.id;
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

export const getAuditLog = async (company_id, page = 1, limit = 10) => {
  try {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [data, total] = await Promise.all([
      prisma.auditlog.findMany({
        where: {
          company_id: parseInt(company_id),
        },
        include: {
          user: true,
        },
        orderBy: {
          created_at: "desc",
        },
        skip,
        take,
      }),
      prisma.auditlog.count({
        where: {
          company_id: parseInt(company_id),
        },
      }),
    ]);

    return {
      data,
      pagination: {
        total,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};