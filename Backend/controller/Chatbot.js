import { chatWithAI } from "../lib/ai/ollama.js";
import { getHRContext } from "../service/AI.js";
import prisma from "../lib/prisma.js";

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
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const whereClause = {
        employee: {
          company_id: parseInt(company_id),
          is_active: "active"
        },
        work_at: {
          gte: todayStart,
          lte: todayEnd,
        },
      };

      if (deptFilter) {
        whereClause.employee.department_id = parseInt(deptFilter);
      }

      const records = await prisma.attendancerecord.findMany({
        where: whereClause,
        include: {
          employee: true,
        },
      });

      if (records.length === 0) {
        return { success: true, message: "No employee has scanned today." };
      }

      const summary = records.map(r => ({
        employee: `${r.employee.first_name} ${r.employee.last_name}`,
        time: r.work_at.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        status: r.status,
        type: r.type,
      }));

      const summaryText = summary.map(s => `* **${s.employee}:** checked in at ${s.time} (${s.type === 'FINGER' ? 'Fingerprint' : 'Online'})`).join("\n");
      return { success: true, message: `Today's scan list:\n${summaryText}` };
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
        `* **Joined Date:** ${employee.joined_at ? employee.joined_at.toISOString().split('T')[0] : "N/A"}`,
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
        const start = r.start_date.toISOString().split('T')[0];
        const end = r.end_date.toISOString().split('T')[0];
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
        const dateStr = r.work_at.toISOString().split('T')[0];
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
    
    // Customize Prompt Capabilities and Roles dynamically
    let roleDescription = isHrOrAdmin 
      ? "You are the HR System Master AI. You have full administrative access across the entire company."
      : `You are a Department Manager AI. You only have access to view and manage employees within your own department.`;

    let toolInstructions = isHrOrAdmin
      ? `Available tools:
         - get_today_attendance {} (Use this for fetching today's scan/attendance list)
         - get_employee_profile {"employee_name_or_id": "string"} (Use this to get detailed profile info like phone, email, age, address, relationship status, joined date, children, etc. of a specific employee)
         - get_employee_leave_balance {"employee_name_or_id": "string"} (ONLY for checking a single specific employee by name/ID)
         - get_leave_records {"employee_name_or_id": "string", "status": "string", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"} (Use this to search the log of leave requests/applications. ALL parameters are optional. If employee_name_or_id is omitted or null, it will query across ALL active employees)
         - get_attendance_records {"employee_name_or_id": "string", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "is_late": boolean, "status": "string"} (Use this to search historical attendance logs. ALL parameters are optional. If employee_name_or_id is omitted or null, it will search across ALL active employees in the company. Perfect for queries like 'who was late this month', 'top late employees', or listing attendance logs)
         - get_company_leave_summary {} (Use this for company-wide queries, list of all leaves, comparisons, sorting, or queries like 'who has taken the most leaves', 'unpaid the most', or 'top leave users')`
      : `Available tools:
         - get_today_attendance {} (Get list of scanned employees today in your department)
         - get_employee_profile {"employee_name_or_id": "string"} (ONLY to get detailed profile info like phone, email, age, address, relationship status, joined date, children, etc. of an employee in your department)
         - get_employee_leave_balance {"employee_name_or_id": "string"} (ONLY for checking a single specific employee in your department by name/ID)
         - get_leave_records {"employee_name_or_id": "string", "status": "string", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"} (ONLY for searching the log of leave requests/applications for employees in your department. If employee_name_or_id is omitted, searches your whole department)
         - get_attendance_records {"employee_name_or_id": "string", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "is_late": boolean, "status": "string"} (ONLY for searching historical attendance logs of employees in your department. If employee_name_or_id is omitted, searches your whole department)
         - get_company_leave_summary {} (Use this for queries in your department like 'who has taken the most leaves', 'unpaid the most', 'top leave users', or list of all department leaves)`;

    const systemPrompt = `
      ${roleDescription}
      
      CONTEXT:
      - CURRENT DATE/TIME: ${new Date().toISOString()} (Use this for calculating date ranges like 'last 3 months', 'this month', or previous years relative to today)
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
      1. To perform any action or query database records (such as fetching today's scan/attendance list, updating employees, or adding items), you MUST call the appropriate tool by returning ONLY a JSON object: {"tool": "tool_name", "args": {...}}.
      2. Do NOT write any conversational text, introductory remarks, or explanations if you are calling a tool. Return ONLY the JSON object.
      3. NEVER ask the user for their login credentials, passwords, or verification. The user is already securely authenticated by the system.
      4. For actions on specific employees, if multiple matches exist, ask for clarification.
      5. ${toolInstructions}
      
      IMPORTANT: Be polite and professional. If you are unsure, ask for more details.
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
    const embeddedJsonMatch = accumulatedText.match(/\{[\s\S]*"tool"[\s\S]*\}/);
    const embeddedXmlMatch = accumulatedText.match(/<tool_call>[\s\S]*<\/tool_call>/);
    if (embeddedJsonMatch || embeddedXmlMatch) {
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
          ...messages,
          { role: "assistant", content: accumulatedText },
          { role: "system", content: `Here is the database result from the tool execution:
            ---
            ${displayMessage}
            ---
            Using this data, generate a premium, professional conversational response for the user.
            Rules:
            1. Respond naturally, politely, and clearly.
            2. For lists or reports (e.g. rankings, late logs, leave summaries), format it beautifully. Use clear headings, emojis (like 🥇, 🥈, 🥉), and clean bulleted lists (do not use double asterisks ** around the entire bullet text; keep it clean and readable).
            3. Add a short "Summary" or "Recommendation" section at the end of lists, providing professional HR guidance.
            4. Make sure not to output any raw JSON or raw tool syntax.`
          }
        ];

        try {
          await chatWithAI(
            summarizeMessages,
            process.env.AI_MODEL || "qwen2.5:1.5b",
            (summaryToken) => {
              res.write(`data: ${JSON.stringify({ token: summaryToken })}\n\n`);
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
      res.write(`data: ${JSON.stringify({ token: accumulatedText })}\n\n`);
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
