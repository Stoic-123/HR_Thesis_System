import prisma from "../lib/prisma.js";

export const addCompany = async (
  name,
  phone,
  email,
  primary_color,
  secondary_color,
  logo_path,
  telegram_group_id,
  telegram_attendance_group_id,
  telegram_leave_group_id,
  telegram_overtime_group_id,
  telegram_announcement_group_id,
  telegram_bot_token,
  default_password
) => {
  try {
    await prisma.company.create({
      data: {
        name,
        phone,
        email,
        primary_color,
        secondary_color,
        logo_path,
        telegram_group_id,
        telegram_attendance_group_id,
        telegram_leave_group_id,
        telegram_overtime_group_id,
        telegram_announcement_group_id,
        telegram_bot_token,
        default_password,
      },
    });

    return {
      result: true,
      message: "Company created successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

export const getCompany = async (company_id = null) => {
  try {
    if (company_id) {
      const companyRecord = await prisma.company.findUnique({
        where: { id: parseInt(company_id) },
      });
      if (!companyRecord) {
        return {
          result: false,
          message: "Company not found.",
        };
      }
      return {
        result: true,
        message: "Get Company data successfully.",
        data: companyRecord,
      };
    }

    const companyRecord = await prisma.company.findMany();

    if (companyRecord.length === 0) {
      return {
        result: false,
        message: "No Company data in database..!",
      };
    }
    return {
      result: true,
      message: "Get Company data successfully.",
      data: companyRecord,
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
export const updateCompany = async (
  name,
  phone,
  email,
  primary_color,
  secondary_color,
  logo_path,
  telegram_group_id,
  telegram_attendance_group_id,
  telegram_leave_group_id,
  telegram_overtime_group_id,
  telegram_announcement_group_id,
  telegram_bot_token,
  default_password,
  company_id
) => {
  try {
    await prisma.company.update({
      where: { id: parseInt(company_id) },
      data: {
        name,
        phone,
        email,
        primary_color,
        secondary_color,
        logo_path,
        telegram_group_id,
        telegram_attendance_group_id,
        telegram_leave_group_id,
        telegram_overtime_group_id,
        telegram_announcement_group_id,
        telegram_bot_token,
        default_password,
      },
    });

    return {
      result: true,
      message: "Company updated successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
