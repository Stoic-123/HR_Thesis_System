import prisma from "../lib/prisma.js";

export const getMobileCalendarController = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({ result: false, message: "Year and month are required" });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month

    // Fetch holidays
    const holidays = await prisma.holiday.findMany({
      where: {
        company_id: parseInt(companyId),
        OR: [
          { start_date: { lte: endDate }, end_date: { gte: startDate } }
        ]
      }
    });

    // Fetch approved leaves
    const leaves = await prisma.leaverecord.findMany({
      where: {
        status: "approved",
        employee_leaverecord_employee_idToemployee: {
          company_id: parseInt(companyId)
        },
        OR: [
          { start_date: { lte: endDate }, end_date: { gte: startDate } }
        ]
      },
      include: {
        employee_leaverecord_employee_idToemployee: {
          select: {
            first_name: true,
            last_name: true,
          }
        }
      }
    });

    const formattedHolidays = holidays.map(h => ({
      id: `h_${h.id}`,
      type: 'holiday',
      name: h.name,
      start_date: h.start_date,
      end_date: h.end_date,
    }));

    const formattedLeaves = leaves.map(l => ({
      id: `l_${l.id}`,
      type: 'leave',
      name: `${l.employee_leaverecord_employee_idToemployee.first_name} ${l.employee_leaverecord_employee_idToemployee.last_name}`,
      start_date: l.start_date,
      end_date: l.end_date,
    }));

    res.status(200).json({
      result: true,
      data: [...formattedHolidays, ...formattedLeaves]
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
