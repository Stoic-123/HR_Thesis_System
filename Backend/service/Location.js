import prisma from "../lib/prisma.js";

export const addLocation = async (name, company_id, longitude, latitude, radius) => {
  try {
    const newLocation = await prisma.location.create({
      data: {
        name,
        company_id: parseInt(company_id),
        longitude: longitude || null,
        latitude: latitude || null,
        radius: radius ? parseInt(radius) : null,
      },
    });
    return {
      result: true,
      message: "Location created successfully.",
      data: newLocation,
    };
  } catch (error) {
    console.error(error.message);
    throw error;
  }
};

export const getLocation = async (company_id) => {
  try {
    const locations = await prisma.location.findMany({
      where: { company_id: parseInt(company_id) },
      orderBy: { id: "desc" },
    });
    return {
      result: true,
      message: "Get locations successfully.",
      data: locations,
    };
  } catch (error) {
    console.error(error.message);
    throw error;
  }
};

export const updateLocation = async (id, name, longitude, latitude, radius, company_id) => {
  try {
    const updated = await prisma.location.update({
      where: { 
        id: parseInt(id),
        company_id: parseInt(company_id)
      },
      data: {
        name,
        longitude: longitude || null,
        latitude: latitude || null,
        radius: radius ? parseInt(radius) : null,
      },
    });
    return {
      result: true,
      message: "Location updated successfully.",
      data: updated,
    };
  } catch (error) {
    console.error(error.message);
    throw error;
  }
};

export const getEmployeeLocations = async (company_id) => {
  try {
    const employees = await prisma.employee.findMany({
      where: {
        company_id: parseInt(company_id),
      },
      include: {
        department_employee_department_idTodepartment: true,
        positions: true,
        location: true,
        employeelocation: {
          include: {
            location: true,
          },
        },
      },
      orderBy: [
        { first_name: "asc" },
        { last_name: "asc" }
      ],
    });

    const data = employees.map((emp) => ({
      id: emp.id,
      first_name: emp.first_name,
      last_name: emp.last_name,
      full_name: `${emp.first_name} ${emp.last_name}`,
      email: emp.email || null,
      profile_path: emp.profile_path || null,
      department_name: emp.department_employee_department_idTodepartment?.name || null,
      position_name: emp.positions?.name || null,
      location_id: emp.location_id,
      primary_location: emp.location ? {
        id: emp.location.id,
        name: emp.location.name,
      } : null,
      secondary_locations: emp.employeelocation.map((el) => ({
        id: el.location.id,
        name: el.location.name,
      })),
    }));

    return {
      result: true,
      message: "Get employee locations successfully.",
      data,
    };
  } catch (error) {
    console.error(error.message);
    throw error;
  }
};

export const assignEmployeeLocations = async (employee_id, location_id, secondary_location_ids) => {
  try {
    const empId = parseInt(employee_id);
    const primaryId = location_id ? parseInt(location_id) : null;

    // Use Prisma transaction to ensure atomic execution
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update employee's primary location
      await tx.employee.update({
        where: { id: empId },
        data: {
          location_id: primaryId,
        },
      });

      // 2. Remove all existing secondary location assignments
      await tx.employeelocation.deleteMany({
        where: { employee_id: empId },
      });

      // 3. Insert new secondary location assignments if provided
      if (Array.isArray(secondary_location_ids) && secondary_location_ids.length > 0) {
        // Filter out the primary location to avoid redundancy
        const uniqueSecondaryIds = [...new Set(secondary_location_ids)]
          .map((id) => parseInt(id))
          .filter((id) => id !== primaryId && !isNaN(id));

        if (uniqueSecondaryIds.length > 0) {
          await tx.employeelocation.createMany({
            data: uniqueSecondaryIds.map((id) => ({
              employee_id: empId,
              location_id: id,
            })),
          });
        }
      }

      return true;
    });

    return {
      result: true,
      message: "Employee locations assigned successfully.",
    };
  } catch (error) {
    console.error(error.message);
    throw error;
  }
};

export const deleteLocation = async (id, company_id) => {
  try {
    const locId = parseInt(id);
    const companyId = parseInt(company_id);

    // 1. Check if any employee working profile is assigned to this location
    const workingProfileCount = await prisma.employeeworkingprofile.count({
      where: { working_location_id: locId },
    });
    if (workingProfileCount > 0) {
      return {
        result: false,
        message: `Cannot delete this Location because ${workingProfileCount} employee working profile(s) are currently assigned to it.`,
      };
    }

    // 2. Check if any location schedule is linked to this location
    const scheduleCount = await prisma.working_location_schedule.count({
      where: { location_id: locId },
    });
    if (scheduleCount > 0) {
      return {
        result: false,
        message: `Cannot delete this Location because ${scheduleCount} location schedule(s) are currently linked to it.`,
      };
    }

    await prisma.location.delete({
      where: { 
        id: locId,
        company_id: companyId
      },
    });
    return {
      result: true,
      message: "Location deleted successfully.",
    };
  } catch (error) {
    console.error(error.message);
    throw error;
  }
};

