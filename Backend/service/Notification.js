import prisma from "../lib/prisma.js";
import { sendNotificationToUser } from "../utils/socket.js";

/**
 * Create a new notification in the database and push it in real-time if the user is online.
 */
export const createNotification = async (companyId, title, body, toUserId, referenceId = null) => {
  try {
    if (!toUserId) return null;

    const notif = await prisma.notification.create({
      data: {
        company_id: parseInt(companyId),
        title,
        body,
        to_user_id: parseInt(toUserId),
        reference_id: referenceId ? parseInt(referenceId) : null,
        is_read: false
      }
    });
    
    // Broadcast via socket
    sendNotificationToUser(toUserId, notif);
    return notif;
  } catch (error) {
    console.error("[Notification Service] Error creating notification:", error);
    return null;
  }
};

/**
 * Create a notification for all Admin / Superadmin / HR users in the company.
 */
export const notifyAdmins = async (companyId, title, body, referenceId = null) => {
  try {
    const admins = await prisma.user.findMany({
      where: {
        employee: {
          company_id: parseInt(companyId),
          role: {
            name: {
              in: ["Admin", "Superadmin", "HR Manager", "HR"]
            }
          }
        }
      }
    });

    const notifications = [];
    for (const admin of admins) {
      const notif = await createNotification(companyId, title, body, admin.id, referenceId);
      if (notif) notifications.push(notif);
    }
    return notifications;
  } catch (error) {
    console.error("[Notification Service] Error notifying admins:", error);
    return [];
  }
};

/**
 * Create a notification for the department manager of a specific employee.
 * If the employee IS the department manager (self-managed), notify Admins/HR instead.
 */
export const notifyManager = async (employeeId, title, body, referenceId = null) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(employeeId) },
      include: {
        department_employee_department_idTodepartment: {
          include: {
            employee_department_manager_idToemployee: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    const dept = employee?.department_employee_department_idTodepartment;
    const deptManagerId = dept?.manager_id;
    const isSelfManager = deptManagerId && deptManagerId === parseInt(employeeId);

    if (isSelfManager) {
      // Manager is submitting their own request → notify Admins & HR instead
      const adminHrUsers = await prisma.user.findMany({
        where: {
          employee: {
            company_id: employee.company_id,
            role: {
              name: {
                in: ['Admin', 'Superadmin', 'HR Manager', 'HR']
              }
            }
          }
        }
      });

      const notifications = [];
      for (const adminUser of adminHrUsers) {
        const notif = await createNotification(employee.company_id, title, body, adminUser.id, referenceId);
        if (notif) notifications.push(notif);
      }
      return notifications;
    }

    // Normal case: notify the department manager
    const managerUser = dept?.employee_department_manager_idToemployee?.user?.[0];
    if (managerUser) {
      return await createNotification(employee.company_id, title, body, managerUser.id, referenceId);
    }
    return null;
  } catch (error) {
    console.error("[Notification Service] Error notifying manager:", error);
    return null;
  }
};
export default {
  createNotification,
  notifyAdmins,
  notifyManager
};
