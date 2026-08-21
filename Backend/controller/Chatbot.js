import { chatWithAI } from "../lib/ai/ollama.js";
import { getHRContext } from "../service/AI.js";
import prisma from "../lib/prisma.js";
import { formatICTDate, formatICTTime, toICTDate } from "../utils/timezone.js";

/**
 * Strips any raw tool-call JSON blobs from AI response text before showing it to the user.
 * This is a last-resort defense: if the model leaks {"tool":...} into its narrative, we remove it.
 */
function sanitizeResponseText(text) {
  if (!text) return text;
  // Remove ```json ... ``` code blocks containing tool calls
  let sanitized = text.replace(/```json[\s\S]*?```/gi, '');
  // Remove bare { "tool": ... } objects or unclosed {"tool": ...
  sanitized = sanitized.replace(/\{\s*"tool"[\s\S]*$/g, '');
  sanitized = sanitized.replace(/\{\s*"tool"\s*:[\s\S]*?\}\s*\}?/g, '');
  sanitized = sanitized.replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '');
  sanitized = sanitized.replace(/<tool_call>[\s\S]*$/gi, '');
  // Remove any leftover markdown code fences
  sanitized = sanitized.replace(/```[\s\S]*?```/g, '');
  // Clean up extra blank lines created by removals
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n').trim();
  return sanitized;
}

function buildEmployeeNameFilter(searchString) {
  if (!searchString) return {};
  const parts = searchString.trim().split(/\s+/);
  if (parts.length > 1) {
    return {
      OR: [
        {
          AND: [
            { first_name: { contains: parts[0] } },
            { last_name: { contains: parts[1] } }
          ]
        },
        {
          AND: [
            { first_name: { contains: parts[1] } },
            { last_name: { contains: parts[0] } }
          ]
        }
      ]
    };
  } else {
    return {
      OR: [
        { first_name: { contains: searchString } },
        { last_name: { contains: searchString } }
      ]
    };
  }
}

const tools = {
  get_today_attendance: async (args, company_id, deptFilter) => {
    try {
      let targetDate = new Date();
      if (args && (args.date || args.start_date || args.target_date)) {
        const dStr = args.date || args.start_date || args.target_date;
        const [y, m, d] = String(dStr).split('-').map(Number);
        if (y && m && d) {
          targetDate = new Date(y, m - 1, d);
        }
      }

      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);

      const empWhere = {
        company_id: parseInt(company_id),
        is_active: "active",
        OR: [
          { role_id: null },
          { role: { name: { not: "Admin" } } }
        ]
      };
      if (deptFilter) empWhere.department_id = parseInt(deptFilter);

      const [allEmployees, records, leaveRecords] = await Promise.all([
        prisma.employee.findMany({ where: empWhere }),
        prisma.attendancerecord.findMany({
          where: {
            employee: empWhere,
            work_at: { gte: dayStart, lte: dayEnd },
          },
          include: { employee: true },
        }),
        prisma.leaverecord.findMany({
          where: {
            employee_leaverecord_employee_idToemployee: empWhere,
            status: "approved",
            start_date: { lte: dayEnd },
            end_date: { gte: dayStart },
          },
          include: {
            employee_leaverecord_employee_idToemployee: true,
            leavetype: true,
          },
        }),
      ]);

      const scannedEmpIds = new Set(records.map((r) => r.employee_id));
      const onLeaveEmpIds = new Set(leaveRecords.map((l) => l.employee_id));

      const checkedInList = records.map(
        (r) =>
          `- **${r.employee.first_name} ${r.employee.last_name}:** Checked in at ${r.work_at.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit" })} (${r.status || "on time"})`
      );

      const onLeaveList = leaveRecords.map((l) => {
        const emp = l.employee_leaverecord_employee_idToemployee;
        return `- **${emp.first_name} ${emp.last_name}:** On ${l.leavetype?.name || "Approved Leave"}`;
      });

      const absentList = allEmployees
        .filter((e) => !scannedEmpIds.has(e.id) && !onLeaveEmpIds.has(e.id))
        .map((e) => `- **${e.first_name} ${e.last_name}:** Absent / Not Scanned`);

      const dateStr = formatICTDate(dayStart);
      const isToday = formatICTDate(new Date()) === dateStr;
      const titleLabel = isToday ? "Today's Attendance Status" : `Attendance Status for ${dateStr}`;
      let summaryText = `📊 **${titleLabel}**:\n\n`;

      summaryText += `✅ **Checked In (${checkedInList.length}):**\n` + (checkedInList.length > 0 ? checkedInList.join("\n") : "- None") + "\n\n";
      summaryText += `🏖️ **On Approved Leave (${onLeaveList.length}):**\n` + (onLeaveList.length > 0 ? onLeaveList.join("\n") : "- None") + "\n\n";
      summaryText += `❌ **Absent / Not Scanned (${absentList.length}):**\n` + (absentList.length > 0 ? absentList.join("\n") : "- None");

      return { success: true, message: summaryText };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
  get_pending_leave_requests: async (args, company_id, deptFilter) => {
    try {
      const empWhere = {
        company_id: parseInt(company_id),
        is_active: "active",
      };
      if (deptFilter) empWhere.department_id = parseInt(deptFilter);

      const records = await prisma.leaverecord.findMany({
        where: {
          employee_leaverecord_employee_idToemployee: empWhere,
          status: "pending",
        },
        include: {
          employee_leaverecord_employee_idToemployee: true,
          leavetype: true,
        },
        orderBy: { request_at: "desc" },
      });

      if (records.length === 0) {
        return {
          success: true,
          message: "🎉 No pending leave requests at this time. All leave applications have been processed!",
        };
      }

      const summaryText = records
        .map((r) => {
          const emp = r.employee_leaverecord_employee_idToemployee;
          const start = r.start_date ? formatICTDate(r.start_date) : "N/A";
          const end = r.end_date ? formatICTDate(r.end_date) : "N/A";
          return `- **${emp.first_name} ${emp.last_name}:** Applied for **${r.leavetype?.name || "Leave"}** from **${start}** to **${end}** (Reason: ${r.reason || "No reason specified"})`;
        })
        .join("\n");

      return {
        success: true,
        message: `📋 **Pending Leave Requests (${records.length}):**\n\n${summaryText}`,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
  get_department_headcount: async (args, company_id, deptFilter) => {
    try {
      const empWhere = {
        company_id: parseInt(company_id),
        is_active: "active",
      };
      if (deptFilter) empWhere.department_id = parseInt(deptFilter);

      const departments = await prisma.department.findMany({
        where: { company_id: parseInt(company_id) },
        include: {
          employee_department_idToemployee: {
            where: { is_active: "active" },
          },
        },
      });

      if (departments.length === 0) {
        return { success: true, message: "No departments found for this company." };
      }

      const totalEmployees = departments.reduce((acc, d) => acc + (d.employee_department_idToemployee?.length || 0), 0);
      const summaryText = departments
        .map((d) => `- **${d.name}:** ${d.employee_department_idToemployee?.length || 0} active employee(s)`)
        .join("\n");

      return {
        success: true,
        message: `🏢 **Department Headcount Breakdown (Total Active: ${totalEmployees}):**\n\n${summaryText}`,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
  get_available_assets: async (args, company_id, deptFilter) => {
    try {
      const assets = await prisma.asset.findMany({
        where: {
          company_id: parseInt(company_id),
        },
        include: {
          assetcategory: true,
        },
      });

      if (assets.length === 0) {
        return { success: true, message: "No company assets found in the inventory." };
      }

      const availableAssets = assets.filter(
        (a) => a.status?.toLowerCase() === "available" || (!a.assigned_to && a.status?.toLowerCase() !== "maintenance" && a.status?.toLowerCase() !== "retired")
      );
      const assignedAssets = assets.filter((a) => a.status?.toLowerCase() === "allocated" || a.assigned_to);

      const availText =
        availableAssets.length > 0
          ? availableAssets.map((a) => `- **${a.asset_name}** (${a.asset_code || "No Code"}) — Category: ${a.assetcategory?.category_name || "General"}`).join("\n")
          : "- None available right now";

      return {
        success: true,
        message: `📦 **Company Asset Inventory Overview:**\n\n🟢 **Available for Allocation (${availableAssets.length}):**\n${availText}\n\n🔵 **Currently Allocated (${assignedAssets.length})**`,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
  get_employee_leave_balance: async (args, company_id, deptFilter) => {
    try {
      const { employee_name_or_id } = args;
      if (!employee_name_or_id) {
        return { success: false, message: "Please specify the employee name or ID." };
      }

      const whereClause = {
        company_id: parseInt(company_id),
      };

      if (isNaN(parseInt(employee_name_or_id))) {
        const nameFilter = buildEmployeeNameFilter(employee_name_or_id);
        whereClause.OR = nameFilter.OR;
      } else {
        whereClause.id = parseInt(employee_name_or_id);
      }

      if (deptFilter) {
        whereClause.department_id = parseInt(deptFilter);
      }

      const employee = await prisma.employee.findFirst({
        where: whereClause,
      });

      if (!employee) {
        return { success: false, message: `Employee "${employee_name_or_id}" not found or access denied.` };
      }

      // Fetch all leave profiles for this employee
      const profiles = await prisma.leaveprofile.findMany({
        where: { employee_id: employee.id },
        include: { leavetype: true },
      });

      if (profiles.length === 0) {
        return { success: true, message: `No leave profiles found for ${employee.first_name} ${employee.last_name}.` };
      }

      const summaryText = profiles.map(p => 
        `* **${p.leavetype.name} (${p.leavetype.code}):** Assigned: ${p.assignment || 0} days | Used: ${p.used || 0} days | Balance: ${p.balance || 0} days`
      ).join("\n");

      return {
        success: true,
        message: `Leave balance summary for **${employee.first_name} ${employee.last_name}**:\n${summaryText}`
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
  get_company_leave_summary: async (args, company_id, deptFilter) => {
    try {
      const whereClause = {
        employee: {
          company_id: parseInt(company_id),
          is_active: "active"
        }
      };

      if (deptFilter) {
        whereClause.employee.department_id = parseInt(deptFilter);
      }

      const profiles = await prisma.leaveprofile.findMany({
        where: whereClause,
        include: {
          employee: true,
          leavetype: true,
        },
      });

      if (profiles.length === 0) {
        return { success: true, message: "No leave profiles found." };
      }

      const summaryText = profiles.map(p => 
        `* **${p.employee.first_name} ${p.employee.last_name}:** ${p.leavetype.name} (Used: ${p.used || 0} days, Balance: ${p.balance || 0} days)`
      ).join("\n");

      return {
        success: true,
        message: `Company Leave Summary:\n${summaryText}`
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
  get_employee_profile: async (args, company_id, deptFilter) => {
    try {
      const { employee_name_or_id } = args;
      if (!employee_name_or_id) {
        return { success: false, message: "Please specify the employee name or ID." };
      }

      const whereClause = {
        company_id: parseInt(company_id),
      };

      if (isNaN(parseInt(employee_name_or_id))) {
        const nameFilter = buildEmployeeNameFilter(employee_name_or_id);
        whereClause.OR = nameFilter.OR;
      } else {
        whereClause.id = parseInt(employee_name_or_id);
      }

      if (deptFilter) {
        whereClause.department_id = parseInt(deptFilter);
      }

      const employee = await prisma.employee.findFirst({
        where: whereClause,
        include: {
          positions: true,
          department_employee_department_idTodepartment: true,
        }
      });

      if (!employee) {
        return { success: false, message: `Employee "${employee_name_or_id}" not found or access denied.` };
      }

      const deptName = employee.department_employee_department_idTodepartment?.name || "N/A";
      const posName = employee.positions?.name || "N/A";

      const lines = [
        `Profile details for **${employee.first_name} ${employee.last_name}** (ID: ${employee.id}):`,
        `* **Department:** ${deptName}`,
        `* **Position:** ${posName}`,
        `* **Age:** ${employee.age || "N/A"}`,
        `* **Gender:** ${employee.gender || "N/A"}`,
        `* **Email:** ${employee.email || "N/A"}`,
        `* **Phone:** ${employee.phone_number1 || "N/A"}`,
        `* **Address:** ${employee.address || "N/A"}`,
        `* **Joined Date:** ${employee.joined_at ? formatICTDate(employee.joined_at) : "N/A"}`,
        `* **Relationship Status:** ${employee.relationship_status || "N/A"}`,
        `* **Children:** ${employee.total_children ?? "N/A"}`,
        `* **Status:** ${employee.is_active || "active"}`
      ];

      return { success: true, message: lines.join("\n") };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
  get_leave_records: async (args, company_id, deptFilter) => {
    try {
      let { employee_name_or_id, status, start_date, end_date, group_by, limit } = args;

      const whereClause = {
        employee_leaverecord_employee_idToemployee: {
          company_id: parseInt(company_id),
          is_active: "active"
        }
      };

      if (deptFilter) {
        whereClause.employee_leaverecord_employee_idToemployee.department_id = parseInt(deptFilter);
      }

      if (employee_name_or_id) {
        if (isNaN(parseInt(employee_name_or_id))) {
          const nameFilter = buildEmployeeNameFilter(employee_name_or_id);
          whereClause.employee_leaverecord_employee_idToemployee.OR = nameFilter.OR;
        } else {
          whereClause.employee_id = parseInt(employee_name_or_id);
        }
      }

      if (status) {
        whereClause.status = status;
      }

      if (start_date || end_date) {
        whereClause.start_date = {};
        if (start_date) {
          whereClause.start_date.gte = new Date(start_date);
        }
        if (end_date) {
          whereClause.start_date.lte = new Date(end_date);
        }
      }

      const records = await prisma.leaverecord.findMany({
        where: whereClause,
        include: {
          employee_leaverecord_employee_idToemployee: true,
          leavetype: true
        },
        orderBy: { start_date: 'desc' },
        take: 1000
      });

      if (records.length === 0) {
        return { success: true, message: "No leave records found matching the criteria." };
      }

      // Auto-grouping check: if company-wide query and records are numerous, group by employee for cleaner display
      if (!group_by && !employee_name_or_id && records.length > 15) {
        group_by = 'employee';
      }

      if (group_by === 'employee') {
        const counts = {};
        records.forEach(r => {
          const emp = r.employee_leaverecord_employee_idToemployee;
          const key = r.employee_id;
          if (!counts[key]) {
            counts[key] = {
              name: `${emp.first_name} ${emp.last_name}`,
              id: emp.id,
              count: 0
            };
          }
          counts[key].count++;
        });

        const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
        const limited = limit ? sorted.slice(0, parseInt(limit)) : sorted;

        const summaryText = limited.map((item, index) => 
          `${index + 1}. **${item.name}** (ID: ${item.id}): ${item.count} leave requests`
        ).join("\n");

        const dateRangeStr = (start_date || end_date) 
          ? ` from ${start_date || ''} to ${end_date || ''}` 
          : "";

        return {
          success: true,
          message: `Top Employees by Leave Request Count${dateRangeStr}:\n${summaryText}`
        };
      }

      // Safe limit of 25 for raw list to prevent prompt bloat
      const displayRecords = records.slice(0, 25);
      const summaryText = displayRecords.map(r => {
        const emp = r.employee_leaverecord_employee_idToemployee;
        const start = formatICTDate(r.start_date);
        const end = formatICTDate(r.end_date);
        return `* **${emp.first_name} ${emp.last_name}** (ID: ${emp.id}): ${r.leavetype.name} from ${start} to ${end} (${r.status}, Reason: ${r.reason || 'None'})`;
      }).join("\n");

      return {
        success: true,
        message: `Leave Request Records:\n${summaryText}`
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
  get_attendance_records: async (args, company_id, deptFilter) => {
    try {
      let { employee_name_or_id, start_date, end_date, is_late, status, group_by, limit } = args;

      const whereClause = {
        employee: {
          company_id: parseInt(company_id),
          is_active: "active"
        }
      };

      if (deptFilter) {
        whereClause.employee.department_id = parseInt(deptFilter);
      }

      if (employee_name_or_id) {
        if (isNaN(parseInt(employee_name_or_id))) {
          const nameFilter = buildEmployeeNameFilter(employee_name_or_id);
          whereClause.employee.OR = nameFilter.OR;
        } else {
          whereClause.employee_id = parseInt(employee_name_or_id);
        }
      }

      if (is_late !== undefined && is_late !== null) {
        whereClause.is_late = is_late === true || is_late === 'true' || is_late === 1 || is_late === '1' || String(is_late).toLowerCase() === 'yes';
      }

      if (status) {
        whereClause.status = status;
      }

      if (start_date || end_date) {
        whereClause.work_at = {};
        if (start_date) {
          whereClause.work_at.gte = new Date(start_date);
        }
        if (end_date) {
          whereClause.work_at.lte = new Date(end_date);
        }
      }

      const records = await prisma.attendancerecord.findMany({
        where: whereClause,
        include: {
          employee: true,
          timemode: true
        },
        orderBy: { work_at: 'desc' },
        take: 1000
      });

      if (records.length === 0) {
        return { success: true, message: "No attendance records found matching the criteria." };
      }

      // Auto-grouping check: if company-wide query and records are numerous, group by employee for cleaner display
      if (!group_by && !employee_name_or_id && records.length > 15) {
        group_by = 'employee';
      }

      if (group_by === 'employee') {
        const counts = {};
        records.forEach(r => {
          const key = r.employee_id;
          if (!counts[key]) {
            counts[key] = {
              name: `${r.employee.first_name} ${r.employee.last_name}`,
              id: r.employee.id,
              count: 0
            };
          }
          counts[key].count++;
        });

        const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
        const limited = limit ? sorted.slice(0, parseInt(limit)) : sorted;

        const summaryText = limited.map((item, index) => 
          `${index + 1}. **${item.name}** (ID: ${item.id}): ${item.count} times`
        ).join("\n");

        const dateRangeStr = (start_date || end_date) 
          ? ` from ${start_date || ''} to ${end_date || ''}` 
          : "";

        return {
          success: true,
          message: `Top Employees by Attendance Count${dateRangeStr}:\n${summaryText}`
        };
      }

      // Safe limit of 25 for raw list to prevent prompt bloat
      const displayRecords = records.slice(0, 25);
      const summaryText = displayRecords.map(r => {
        const dateStr = formatICTDate(r.work_at);
        const timeStr = r.work_at.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        return `* **${r.employee.first_name} ${r.employee.last_name}** (ID: ${r.employee.id}): ${dateStr} at ${timeStr} (Mode: ${r.timemode.name}, Status: ${r.status}, Late: ${r.is_late ? 'Yes' : 'No'})`;
      }).join("\n");

      return {
        success: true,
        message: `Attendance Records:\n${summaryText}`
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
};

export const chatController = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    
    const company_id = req.user.company_id;
    const employee_id = req.user.employee_id;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    // Fetch user details to determine role/department constraints
    const currentEmployee = await prisma.employee.findUnique({
      where: { id: employee_id },
      include: {
        role: {
          include: {
            rolebaseaccess: true
          }
        }
      },
    });

    const hasChatbotPermission =
      currentEmployee?.role?.name === "Admin" ||
      currentEmployee?.role?.rolebaseaccess?.some(p => p.path === "chatbot:access");

    if (!hasChatbotPermission) {
      return res.status(403).json({ success: false, message: "Forbidden: You do not have permission to access the HR AI Chatbot." });
    }

    const isHrOrAdmin =
      currentEmployee?.role?.name?.toLowerCase().includes("admin") ||
      currentEmployee?.role?.name?.toLowerCase().includes("hr");

    const deptFilter = isHrOrAdmin ? null : currentEmployee?.department_id;
    const context = await getHRContext(company_id, null);
    
    // Exact system date variables in local Cambodia Time (UTC+7)
    const nowICT = toICTDate(new Date());
    const todayStr = formatICTDate(nowICT);
    const yesterdayDate = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = formatICTDate(yesterdayDate);
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayDayName = dayNames[nowICT.getUTCDay()];
    const yesterdayDayName = dayNames[(nowICT.getUTCDay() + 6) % 7];

    // Customize Prompt Capabilities and Roles dynamically
    let roleDescription = isHrOrAdmin 
      ? "You are the HR System Master AI. You have full administrative access across the entire company."
      : `You are a Department Manager AI. You only have access to view and manage employees within your own department.`;

    let toolInstructions = isHrOrAdmin
      ? `Available tools:
         - get_today_attendance {"date": "YYYY-MM-DD"} (Use this for fetching attendance status for today (${todayStr}), yesterday (${yesterdayStr}), or any specific date. Returns checked-in, on-leave, and absent lists)
         - get_department_headcount {} (Use this for queries like 'Show department headcount', 'department employee count', or breakdown of headcount per department)
         - get_pending_leave_requests {} (Use this for fetching ALL pending leave applications/requests waiting for manager/HR approval across the company)
         - get_available_assets {} (Use this for queries like 'Available company assets', 'company assets', 'free hardware', or asset inventory status)
         - get_employee_profile {"employee_name_or_id": "string"} (Use this to get detailed profile info like phone, email, age, address, relationship status, joined date, children, etc. of a specific employee)
         - get_employee_leave_balance {"employee_name_or_id": "string"} (ONLY for checking a single specific employee by name/ID)
         - get_leave_records {"employee_name_or_id": "string", "status": "string", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"} (Use this to search the log of leave requests/applications. ALL parameters are optional. If employee_name_or_id is omitted or null, it will query across ALL active employees)
         - get_attendance_records {"employee_name_or_id": "string", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "is_late": boolean, "status": "string"} (Use this to search historical attendance logs. ALL parameters are optional. If employee_name_or_id is omitted or null, it will search across ALL active employees in the company. Perfect for queries like 'who was late this month', 'top late employees', or listing attendance logs)
         - get_company_leave_summary {} (Use this for company-wide queries, list of all leaves, comparisons, sorting, or queries like 'who has taken the most leaves', 'unpaid the most', or 'top leave users')`
      : `Available tools:
         - get_today_attendance {"date": "YYYY-MM-DD"} (Get list of scanned employees in your department for today (${todayStr}), yesterday (${yesterdayStr}), or any specific date, plus on-leave and absent)
         - get_department_headcount {} (Get department employee headcount breakdown)
         - get_pending_leave_requests {} (Get list of pending leave applications waiting for approval in your department)
         - get_available_assets {} (Get list of available company assets)
         - get_employee_profile {"employee_name_or_id": "string"} (ONLY to get detailed profile info like phone, email, age, address, relationship status, joined date, children, etc. of an employee in your department)
         - get_employee_leave_balance {"employee_name_or_id": "string"} (ONLY for checking a single specific employee in your department by name/ID)
         - get_leave_records {"employee_name_or_id": "string", "status": "string", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"} (ONLY for searching the log of leave requests/applications for employees in your department. If employee_name_or_id is omitted, searches your whole department)
         - get_attendance_records {"employee_name_or_id": "string", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "is_late": boolean, "status": "string"} (ONLY for searching historical attendance logs of employees in your department. If employee_name_or_id is omitted, searches your whole department)
         - get_company_leave_summary {} (Use this for queries in your department like 'who has taken the most leaves', 'unpaid the most', 'top leave users', or list of all department leaves)`;

    const systemPrompt = `
      ${roleDescription}
      
      CURRENT SYSTEM CALENDAR & TIME (Cambodia UTC+7):
      - TODAY: ${todayStr} (${todayDayName})
      - YESTERDAY: ${yesterdayStr} (${yesterdayDayName})
      - CURRENT YEAR: ${nowICT.getUTCFullYear()}
      - CURRENT TIME: ${formatICTTime(nowICT)}
      
      DATE INTERPRETATION RULES:
      - TODAY ALWAYS means ${todayStr}.
      - YESTERDAY ALWAYS means ${yesterdayStr}.
      - CURRENT YEAR is strictly ${nowICT.getUTCFullYear()}. Never use 2023 or any outdated training date!
      - When querying attendance for yesterday, pass {"date": "${yesterdayStr}"} to the tool.
      
      CONTEXT:
      - EMPLOYEES: ${JSON.stringify(context.employees)}
      - DEPARTMENTS: ${JSON.stringify(context.departments)}
      - POSITIONS: ${JSON.stringify(context.positions)}
      - LEAVE TYPES: ${JSON.stringify(context.leaveTypes)}
      - HOLIDAYS: ${JSON.stringify(context.holidays)}
      
      CAPABILITIES:
      1. You can search employee basic information (id, name, department, position).
      2. You can view detailed profile information of an employee (such as email, phone, age, address, relationship status, kids, joined date) using the get_employee_profile tool.
      3. You can query the log of leave requests/applications (status, dates, reasons) using the get_leave_records tool.
      4. You can query historical attendance logs (punctuality, late entries) using the get_attendance_records tool.
      
      RESTRICTIONS:
      - You are strictly a READ-ONLY assistant. You do NOT have the ability to make administrative changes, update profiles, add department/holiday/position records, or create anything.
      - Refuse to fetch information about employees who are NOT in the EMPLOYEES context list.
      - If a user asks for something you cannot do (e.g., "order pizza", "hack the system", "delete everyone", "update employee name"), respond politely that it is outside your current read-only HR capabilities.
      
      OUTPUT RULES:
      1. Always respond in a polite, premium, conversational, and highly professional HR manner.
      2. Keep responses clean, clear, and well-structured.
      3. For any lists, rankings, or multiple items, use clean bullet points (e.g. "- Item details") or numbers, and integrate relevant emojis (like 🥇, 🥈, 🥉, 📅, 👤, 📝) to make the text engaging and professional.
      4. Avoid surrounding entire bullets or sentences in double asterisks (e.g. do NOT write "**- Sok Dara is present**"). Keep bold formatting limited to key words or field names (e.g. "- **Status:** Active").
      5. NEVER output raw JSON blocks, code blocks, database IDs (such as employee IDs or profile IDs in database formats), or tool call definitions to the user.
      6. NEVER output markdown tables (e.g. using "|" or "---"). Tables are forbidden. Use beautifully formatted bullet lists instead.
      7. Clean up raw data before formatting:
         - If a profile value is "null", "N/A", empty, or undefined, omit that field entirely from the response.
         - Render all dates in a simple, friendly calendar format (e.g. YYYY-MM-DD).
      
      ACTION AND QUERY RULES:
      0. GREETINGS & CASUAL CONVERSATION: If the user says hello, hi, hey, good morning, how are you, thank you, or asks general questions about your identity or what you can do, DO NOT call any tool. Respond directly, politely, and warmly as the HR Assistant.
      1. ANY question about attendance, late arrivals, leave records, employee profiles, or who was absent/late REQUIRES a tool call. You MUST call the tool. NEVER answer these from memory or make up numbers.
      2. To call a tool, output ONLY a raw JSON object and NOTHING else: {"tool": "tool_name", "args": {...}}. No introduction, no explanation, no text before or after.
      3. NEVER invent, estimate, or guess attendance counts, leave counts, or any HR data. If you do not have real data from a tool, say you need to look it up and call the tool.
      4. NEVER ask the user for their login credentials, passwords, or verification. The user is already securely authenticated by the system.
      5. For actions on specific employees, if multiple matches exist, ask for clarification.
      6. ${toolInstructions}
      
      CRITICAL: If the user asks who is most late, who has the most leave, how many late arrivals, or any attendance/leave question — you MUST call a tool. Do NOT answer from context. Context only shows employee names, not attendance or leave numbers.
    `;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message }
    ];

    // Stream response from Ollama (collect first stage in background to prevent tool leaks)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let isToolCallDetected = false;
    let accumulatedText = "";

    try {
      const firstStageResult = await chatWithAI(
        messages,
        process.env.AI_MODEL || "qwen2.5:1.5b",
        (token) => {
          accumulatedText += token;
        },
        company_id
      );
      if (!accumulatedText && firstStageResult) {
        accumulatedText = firstStageResult;
      }
    } catch (streamError) {
      console.error("[Chatbot Controller] First stage Error:", streamError);
      let friendlyMessage = streamError.message || "Connection to AI model interrupted.";
      if (friendlyMessage.includes("Rate limit exceeded") || friendlyMessage.includes("429") || friendlyMessage.toLowerCase().includes("rate-limited")) {
        friendlyMessage = "⚠️ **AI Rate Limit Exceeded**\n\nI'm sorry, but we have reached the daily query limit for the free AI model on OpenRouter.\n\n**How to resolve this:**\n- Go to **System Settings** -> **Company Settings** and change the AI provider to a local model (Ollama) or Hugging Face.\n- Or, configure a paid API key or add credits to your OpenRouter account in **Company Settings** to unlock higher rate limits.";
      }
      res.write(`data: ${JSON.stringify({ token: friendlyMessage })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    // After stream completes, check if there is a JSON tool call or XML tool call embedded anywhere in the response
    const hasToolKeyword = accumulatedText.includes('"tool"') || accumulatedText.includes('"get_') || accumulatedText.includes('<tool_call>');
    if (hasToolKeyword) {
      isToolCallDetected = true;
    }

    if (isToolCallDetected === true) {
      console.log(`[Chatbot] Raw AI Tool Response:`, accumulatedText);
      // Check if AI wants to use a tool (more robust extraction)
      let toolCall = null;
      try {
        const cleaned = accumulatedText.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
        toolCall = JSON.parse(cleaned);
      } catch (e) {
        // More robust parsing: find the first JSON object that contains the "tool" property
        const toolIndex = accumulatedText.indexOf('"tool"');
        if (toolIndex !== -1) {
          const startBrace = accumulatedText.lastIndexOf('{', toolIndex);
          if (startBrace !== -1) {
            let depth = 0;
            for (let i = startBrace; i < accumulatedText.length; i++) {
              if (accumulatedText[i] === '{') depth++;
              else if (accumulatedText[i] === '}') {
                depth--;
                if (depth === 0) {
                  const candidate = accumulatedText.substring(startBrace, i + 1);
                  try {
                    const parsed = JSON.parse(candidate);
                    if (parsed && parsed.tool) {
                      toolCall = parsed;
                      break;
                    }
                  } catch (innerE) {
                    // Ignore parsing error and continue scanning
                  }
                }
              }
            }
          }
        }
      }

      // Regex fallback if JSON was truncated/unclosed (e.g. {"tool": "get_today_attendance", "args": {"date": "2026-08-19)
      if (!toolCall || !toolCall.tool) {
        const toolNameMatch = accumulatedText.match(/"tool"\s*:\s*"([^"]+)"/i);
        if (toolNameMatch) {
          const toolName = toolNameMatch[1];
          const args = {};
          const dateMatch = accumulatedText.match(/"(?:date|start_date|end_date)"\s*:\s*"([^"]+)"/i);
          if (dateMatch) args.date = dateMatch[1];
          const empMatch = accumulatedText.match(/"employee_name_or_id"\s*:\s*"([^"]+)"/i);
          if (empMatch) args.employee_name_or_id = empMatch[1];
          toolCall = { tool: toolName, args };
          console.log("[Chatbot] Successfully parsed truncated JSON tool call:", toolCall);
        }
      }


      // If JSON parsing failed, try XML-style tool call parsing
      if (!toolCall || !toolCall.tool) {
        const xmlMatch = accumulatedText.match(/<tool_call>([\s\S]*?)<\/tool_call>/);
        if (xmlMatch) {
          try {
            const xmlContent = xmlMatch[1].trim();
            const lines = xmlContent.split('\n').map(l => l.trim()).filter(Boolean);
            const toolName = lines[0].replace(/<[^>]*>/g, "").trim();

            const args = {};
            const keyRegex = /<arg_key>([\s\S]*?)<\/arg_key>\s*<arg_value>([\s\S]*?)<\/arg_value>/g;
            let match;
            while ((match = keyRegex.exec(xmlContent)) !== null) {
              const key = match[1].trim();
              let val = match[2].trim();

              if (val.toLowerCase() === 'true') val = true;
              else if (val.toLowerCase() === 'false') val = false;
              else if (!isNaN(val) && val !== '') val = Number(val);

              args[key] = val;
            }

            toolCall = {
              tool: toolName,
              args: args
            };
            console.log("[Chatbot] Successfully parsed XML tool call:", toolCall);
          } catch (xmlError) {
            console.error("[Chatbot] Failed to parse XML tool call:", xmlError);
          }
        }
      }

      if (toolCall && toolCall.tool) {
        let normalizedTool = toolCall.tool;
        if (
          normalizedTool === "get_pending_leave_requests" ||
          normalizedTool === "get_pending_leaves" ||
          normalizedTool === "pending_leave_requests" ||
          normalizedTool === "pending_leaves"
        ) {
          normalizedTool = "get_pending_leave_requests";
        }
        if (
          normalizedTool === "get_department_headcount" ||
          normalizedTool === "get_headcount" ||
          normalizedTool === "department_headcount" ||
          normalizedTool === "show_department_headcount" ||
          normalizedTool === "headcount"
        ) {
          normalizedTool = "get_department_headcount";
        }
        if (
          normalizedTool === "get_available_assets" ||
          normalizedTool === "get_assets" ||
          normalizedTool === "available_assets" ||
          normalizedTool === "available_company_assets" ||
          normalizedTool === "show_available_assets"
        ) {
          normalizedTool = "get_available_assets";
        }
        if (
          normalizedTool === "get_scan_attendance_list" ||
          normalizedTool === "get_attendance" ||
          normalizedTool === "get_attendance_list" ||
          normalizedTool === "list_attendance"
        ) {
          normalizedTool = "get_today_attendance";
        }
        if (
          normalizedTool === "get_employee_leave_balance" ||
          normalizedTool === "get_leave_balance" ||
          normalizedTool === "get_leave" ||
          normalizedTool === "check_leave_balance" ||
          normalizedTool === "get_leave_profile"
        ) {
          normalizedTool = "get_employee_leave_balance";
        }
        if (
          normalizedTool === "get_employee_profile" ||
          normalizedTool === "get_profile" ||
          normalizedTool === "get_employee" ||
          normalizedTool === "check_profile" ||
          normalizedTool === "employee_profile"
        ) {
          normalizedTool = "get_employee_profile";
        }
        if (
          normalizedTool === "get_leave_records" ||
          normalizedTool === "get_leave_logs" ||
          normalizedTool === "get_leave_history" ||
          normalizedTool === "get_leave_requests" ||
          normalizedTool === "check_leaves"
        ) {
          normalizedTool = "get_leave_records";
        }
        if (
          normalizedTool === "get_attendance_records" ||
          normalizedTool === "get_attendance_logs" ||
          normalizedTool === "get_attendance_history" ||
          normalizedTool === "check_attendance" ||
          normalizedTool === "list_attendance_history"
        ) {
          normalizedTool = "get_attendance_records";
        }
        toolCall.tool = normalizedTool;
      }

      if (toolCall && toolCall.tool && tools[toolCall.tool]) {
        console.log(`[Chatbot] Executing tool: ${toolCall.tool}`, toolCall.args);
        let result;

        try {
          result = await tools[toolCall.tool](toolCall.args, company_id, deptFilter);
        } catch (err) {
          console.error(`[Chatbot] Tool execution crashed:`, err);
          result = { success: false, message: "The system encountered an unexpected error while performing this action." };
        }
        
        // Log the AI action
        try {
          await prisma.auditlog.create({
            data: {
              company_id: parseInt(company_id),
              module: "AI_AGENT",
              action: toolCall.tool.toUpperCase(),
              description: `AI Agent executed ${toolCall.tool}: ${result.message}`,
            }
          });
        } catch (logErr) {
          console.error("[Chatbot] Audit log failed:", logErr);
        }

        const displayMessage = result.success 
          ? result.message 
          : `⚠️ I'm sorry, I couldn't complete that action. ${result.message}`;

        // Feed the database result back to the AI model so it can synthesize a professional response
        const summarizeMessages = [
          {
            role: "system",
            content: `You are the HR System AI Assistant. The database query has already been executed and returned the following exact real-time data:
---
${displayMessage}
---
TASK: Formulate a clear, direct, and professional answer to the user's question: "${message}".
CRITICAL RULES:
1. Do NOT call any tools or output any JSON, code, or tool syntax. All data is already provided above.
2. Directly answer the question using clean bullet points and emojis (✅, 🏖️, ❌, 👤, 📊).
3. Keep the response concise, executive, and helpful.
4. Speak naturally and directly to the user without mentioning system internals or how data was retrieved.`
          },
          ...history.slice(-3),
          { role: "user", content: message }
        ];

        try {
          let summaryBuffer = "";
          await chatWithAI(
            summarizeMessages,
            process.env.AI_MODEL || "qwen2.5:1.5b",
            (summaryToken) => {
              summaryBuffer += summaryToken;
              // Sanitize on-the-fly: only stream clean text, drop tool-call fragments
              const clean = sanitizeResponseText(summaryBuffer);
              // Only write tokens that haven't been sent yet
              const lastSent = summaryBuffer.length - summaryToken.length;
              const cleanedPrev = sanitizeResponseText(summaryBuffer.slice(0, lastSent));
              const newCleanChunk = clean.slice(cleanedPrev.length);
              if (newCleanChunk) {
                res.write(`data: ${JSON.stringify({ token: newCleanChunk })}\n\n`);
              }
            },
            company_id
          );
        } catch (summaryErr) {
          console.error("[Chatbot Controller] Synthesis failed, falling back to raw output:", summaryErr);
          let friendlyMessage = displayMessage;
          if (summaryErr.message.includes("Rate limit exceeded") || summaryErr.message.includes("429") || summaryErr.message.toLowerCase().includes("rate-limited")) {
            friendlyMessage = `⚠️ **AI Rate Limit Exceeded**\n\nThe free AI provider request limit was reached while generating the summary.\n\n**Here is the raw data retrieved from our database:**\n\n${displayMessage}\n\n*Note: Change providers or configure a paid API key in **Company Settings** to avoid this limit in the future.*`;
          }
          res.write(`data: ${JSON.stringify({ token: friendlyMessage })}\n\n`);
        }
      } else {
        // If it looked like a tool call but wasn't valid, treat the whole text as chat response
        res.write(`data: ${JSON.stringify({ token: accumulatedText })}\n\n`);
      }
    } else {
      // Regular conversational response (e.g. greetings or direct answers)
      // Sanitize: strip any tool-call JSON the model may have leaked into a plain response
      const cleanResponse = sanitizeResponseText(accumulatedText);
      res.write(`data: ${JSON.stringify({ token: cleanResponse })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error("[Chatbot Controller] Error:", error);
    const userFriendlyError = "I'm sorry, I'm having trouble connecting to my brain right now. Please try again in a moment.";
    
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: userFriendlyError });
    } else {
      res.write(`data: ${JSON.stringify({ error: userFriendlyError })}\n\n`);
      res.end();
    }
  }
};
