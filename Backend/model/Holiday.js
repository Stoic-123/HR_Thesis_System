import { db } from "../config/db.js";

export const createHoliday = async (company_id, name, start_date, end_date) => {
  try {
    const sql =
      "INSERT INTO holiday (company_id,name,start_date,end_date) VALUES(?,?,?,?)";
    const [holidayResult] = await db.execute(sql, [
      company_id,
      name,
      start_date,
      end_date,
    ]);
    if (holidayResult.affectedRows === 0) {
      return {
        result: false,
        message: "Failed to create holiday..!",
      };
    }
    return {
      result: true,
      message: "Holiday created successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
export const getHoliday = async (company_id, year = null) => {
  try {
    let sql = "SELECT * FROM holiday WHERE company_id = ?";
    let params = [company_id];

    if (year !== null && year !== undefined) {
      sql += " AND (YEAR(start_date) = ? OR YEAR(end_date) = ?)";
      params.push(year, year);
    }

    sql += " ORDER BY start_date ASC";

    const [holidays] = await db.execute(sql, params);

    return {
      result: true,
      data: holidays,
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
export const deleteHoliday = async (holiday_id) => {
  try {
    const sql = "DELETE FROM holiday WHERE id=?";
    const [holidayResult] = await db.execute(sql, [holiday_id]);
    if (holidayResult.affectedRows === 0) {
      return {
        result: false,
        message: "Failed to delete holiday..!",
      };
    }
    return {
      result: true,
      message: "Holiday delated successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
export const updateHoliday = async (name, start_date, end_date, holiday_id) => {
  try {
    const sql =
      "UPDATE holiday SET name=?, start_date=?, end_date=? WHERE id=?";
    const [holidayResult] = await db.execute(sql, [
      name,
      start_date,
      end_date,
      holiday_id,
    ]);
    if (holidayResult.affectedRows === 0) {
      return {
        result: false,
        message: "Failed to update holiday..!",
      };
    }
    return {
      result: true,
      message: "Holiday updated successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
