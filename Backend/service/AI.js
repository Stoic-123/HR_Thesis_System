import prisma from "../lib/prisma.js";

export const getHRContext = async (company_id, department_id = null) => {
  try {
    if (!company_id) {
      console.warn("[AI Service] No company_id provided, returning empty context.");
      return { employees: [], departments: [], positions: [], leaveTypes: [], holidays: [] };
    }

    const employeeWhere = { company_id: parseInt(company_id) };
    if (department_id) {
      employeeWhere.department_id = parseInt(department_id);
    }

    const [employees, departments, positions, leaveTypes, holidays] = await Promise.all([
      prisma.employee.findMany({
        where: employeeWhere,
        take: 100, // Safety limit
        select: {
          id: true,
          first_name: true,
          last_name: true,
          age: true,
          gender: true,
          phone_number1: true,
          email: true,
          address: true,
          joined_at: true,
          positions: { select: { name: true } },
          department_employee_department_idTodepartment: { select: { name: true } },
          is_active: true,
          relationship_status: true,
          total_children: true,
        },
      }),
      prisma.department.findMany({
        where: { company_id: parseInt(company_id) },
        select: { id: true, name: true },
      }),
      prisma.positions.findMany({
        where: { department: { company_id: parseInt(company_id) } },
        select: { id: true, name: true },
      }),
      prisma.leavetype.findMany({
        where: { company_id: parseInt(company_id) },
        select: { name: true, code: true, default_balance: true },
      }),
      prisma.holiday.findMany({
        where: { company_id: parseInt(company_id) },
        select: { name: true, start_date: true },
      }),
    ]);

    return {
      employees: employees.map(e => ({
        id: e.id,
        name: `${e.first_name} ${e.last_name}`,
        age: e.age,
        sex: e.gender,
        phone: e.phone_number1,
        email: e.email,
        addr: e.address,
        joined: e.joined_at?.toISOString().split('T')[0],
        pos: e.positions?.name,
        dept: e.department_employee_department_idTodepartment?.name || "N/A",
        status: e.is_active,
        rel: e.relationship_status,
        kids: e.total_children,
      })),
      departments: departments.map(d => ({ id: d.id, name: d.name })),
      positions: positions.map(p => ({ id: p.id, name: p.name })),
      leaveTypes: leaveTypes.map(l => `${l.name}: ${l.default_balance}d`),
      holidays: holidays.map(h => `${h.name}: ${h.start_date?.toISOString().split('T')[0]}`),
    };
  } catch (error) {
    console.error("[AI Service] Context Error:", error);
    // Return empty context instead of null to prevent "Cannot read properties of null"
    return { employees: [], departments: [], positions: [], leaveTypes: [], holidays: [] };
  }
};
