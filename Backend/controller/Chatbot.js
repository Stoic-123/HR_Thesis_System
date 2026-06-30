import { chatWithAI } from "../lib/ai/ollama.js";
import { getHRContext } from "../service/AI.js";
import prisma from "../lib/prisma.js";
import { updateEmployee } from "../service/Employee.js";

const tools = {
  update_employee_department: async (args, company_id) => {
    try {
      const { employee_id, department_id } = args;
      let targetDeptId = parseInt(department_id);

      // If department_id is not a number, try to find it by name
      if (isNaN(targetDeptId) && typeof department_id === 'string') {
        const dept = await prisma.department.findFirst({
          where: { name: { contains: department_id }, company_id: parseInt(company_id) }
        });
        if (dept) targetDeptId = dept.id;
      }

      if (isNaN(targetDeptId)) {
        return { success: false, message: `Department "${department_id}" is not a valid ID or name.` };
      }

      await updateEmployee(employee_id, { department_id: targetDeptId });
      return { success: true, message: `Successfully moved employee to the new department.` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
  update_employee: async (args, company_id) => {
    try {
      const { employee_id, new_args } = args;

      // Handle name-to-id conversion for department_id if passed as string
      if (new_args.department_id && isNaN(parseInt(new_args.department_id)) && typeof new_args.department_id === 'string') {
        const dept = await prisma.department.findFirst({
          where: { name: { contains: new_args.department_id }, company_id: parseInt(company_id) }
        });
        if (dept) new_args.department_id = dept.id;
      }

      // Handle name-to-id conversion for position_id if passed as string
      if (new_args.position_id && isNaN(parseInt(new_args.position_id)) && typeof new_args.position_id === 'string') {
        const pos = await prisma.positions.findFirst({
          where: { name: { contains: new_args.position_id }, department: { company_id: parseInt(company_id) } }
        });
        if (pos) new_args.position_id = pos.id;
      }

      await updateEmployee(employee_id, new_args);
      return { success: true, message: `Successfully updated employee information.` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
  add_department: async (args, company_id) => {
    try {
      const { name } = args;
      await prisma.department.create({ data: { name, company_id: parseInt(company_id) } });
      return { success: true, message: `Successfully created new department: ${name}.` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
  add_position: async (args, company_id) => {
    try {
      let { name, department_id } = args;
      let dept = null;

      // Robust department finding
      if (department_id && !isNaN(parseInt(department_id))) {
        // Try by ID first
        dept = await prisma.department.findUnique({
          where: { id: parseInt(department_id), company_id: parseInt(company_id) }
        });
      }

      if (!dept && typeof department_id === 'string') {
        // AI might have passed the name instead of ID
        dept = await prisma.department.findFirst({
          where: { name: { contains: department_id }, company_id: parseInt(company_id) }
        });
      }

      if (!dept) {
        // Last resort: search context for name match if department_id was meant to be a name
        return { success: false, message: `Department "${department_id}" not found. Please provide a valid department ID or exact name.` };
      }

      await prisma.positions.create({
        data: { name, department_id: dept.id }
      });
      return { success: true, message: `Successfully created new position "${name}" in "${dept.name}" department.` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
  add_holiday: async (args, company_id) => {
    try {
      const { name, start_date, end_date } = args;
      await prisma.holiday.create({
        data: {
          name,
          start_date: new Date(start_date),
          end_date: new Date(end_date || start_date),
          company_id: parseInt(company_id)
        }
      });
      return { success: true, message: `Successfully added holiday: ${name}.` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
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
        whereClause.OR = [
          { first_name: { contains: employee_name_or_id } },
          { last_name: { contains: employee_name_or_id } },
        ];
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
      include: { role: true },
    });

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
         - update_employee_department {"employee_id": number, "department_id": number}
         - update_employee {"employee_id": number, "new_args": {"field": "value"}}
         - add_department {"name": "string"}
         - add_position {"name": "string", "department_id": number}
         - add_holiday {"name": "string", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"}
         - get_today_attendance {}
         - get_employee_leave_balance {"employee_name_or_id": "string"} (ONLY for checking a single specific employee by name/ID)
         - get_company_leave_summary {} (Use this for company-wide queries, list of all leaves, comparisons, sorting, or queries like 'who has taken the most leaves', 'unpaid the most', or 'top leave users')`
      : `Available tools:
         - update_employee_department {"employee_id": number, "department_id": number} (ONLY for employees in your department)
         - update_employee {"employee_id": number, "new_args": {"field": "value"}} (ONLY for employees in your department)
         - get_today_attendance {} (Get list of scanned employees today in your department)
         - get_employee_leave_balance {"employee_name_or_id": "string"} (ONLY for checking a single specific employee in your department by name/ID)
         - get_company_leave_summary {} (Use this for queries in your department like 'who has taken the most leaves', 'unpaid the most', 'top leave users', or list of all department leaves)`;

    const systemPrompt = `
      ${roleDescription}
      
      CONTEXT:
      - EMPLOYEES: ${JSON.stringify(context.employees)}
      - DEPARTMENTS: ${JSON.stringify(context.departments)}
      - POSITIONS: ${JSON.stringify(context.positions)}
      - LEAVE TYPES: ${JSON.stringify(context.leaveTypes)}
      - HOLIDAYS: ${JSON.stringify(context.holidays)}
      
      CAPABILITIES:
      1. You can search, move, and update employee information (age, name, etc.).
      2. Admin only: You can manage departments (add), positions (add), and holidays.
      
      RESTRICTIONS:
      - You are NOT allowed to delete anything (employees, departments, positions, etc.).
      - If a user is not Admin/HR and asks for administrative changes (such as adding departments, holidays, or positions), politely refuse and explain that they must request an HR or Admin user to perform or approve this action.
      - Refuse to update or fetch information about employees who are NOT in the EMPLOYEES context list.
      - If a user asks for something you cannot do (e.g., "order pizza", "hack the system", "delete everyone"), respond politely that it is outside your current HR management capabilities.
      
      OUTPUT RULES:
      1. NEVER output raw JSON, code blocks, tool calls, tool examples, or database IDs to the user. If you are writing a conversational response, NEVER include JSON formats or tool structures like \`{"tool": ...}\`.
      2. NEVER output markdown tables (e.g., using | or ---). Tables are strictly forbidden as they do not fit in the chat UI.
      3. Format details using a clean bulleted list, like:
         * **Field Name:** Value
      4. Clean up raw data before rendering:
         - If a value is "null", "N/A", empty, or undefined, do NOT show that line/field at all (e.g., if age is null, skip the Age line).
         - Render dates in a simple, friendly format (e.g. YYYY-MM-DD).
      5. Always respond in polite, conversational, professional English. Do not use technical phrases like "Here is the JSON".
      
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

    // Stream response from Ollama
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let isToolCallDetected = null;
    let accumulatedText = "";
    let isStreamingBlocked = false;

    try {
      await chatWithAI(messages, process.env.AI_MODEL || "qwen2.5:1.5b", (token) => {
        accumulatedText += token;
        
        // If we detect a code block or JSON block starting, block further streaming to client
        if (accumulatedText.includes("```json") || accumulatedText.includes('{"tool":')) {
          isStreamingBlocked = true;
        }

        if (isToolCallDetected === null) {
          const trimmed = accumulatedText.trim();
          if (trimmed.length > 0) {
            if (trimmed.startsWith("{")) {
              isToolCallDetected = true;
            } else {
              isToolCallDetected = false;
              if (!isStreamingBlocked) {
                // Stream the accumulated text so far
                res.write(`data: ${JSON.stringify({ token: trimmed })}\n\n`);
              }
            }
          }
        } else if (isToolCallDetected === false) {
          if (!isStreamingBlocked) {
            // Stream directly to the client in real-time
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }
        }
      });
    } catch (streamError) {
      console.error("[Chatbot Controller] Streaming Error:", streamError);
      if (isToolCallDetected === null || isToolCallDetected === false) {
        res.write(`data: ${JSON.stringify({ error: "Connection to AI model interrupted." })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      }
      throw streamError;
    }

    // After stream completes, check if there is a JSON tool call embedded anywhere in the response
    const embeddedJsonMatch = accumulatedText.match(/\{[\s\S]*"tool"[\s\S]*\}/);
    if (embeddedJsonMatch) {
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
        const jsonMatch = accumulatedText.match(/\{[\s\S]*"tool"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            toolCall = JSON.parse(jsonMatch[0]);
          } catch (innerE) {
            console.warn("[Chatbot] Found JSON-like block but failed to parse:", innerE);
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
        toolCall.tool = normalizedTool;
      }

      if (toolCall && toolCall.tool && tools[toolCall.tool]) {
        console.log(`[Chatbot] Executing tool: ${toolCall.tool}`, toolCall.args);
        let result;

        // Perform security and RBAC validation on tool execution
        const adminOnlyTools = ["add_department", "add_position", "add_holiday"];
        if (!isHrOrAdmin && adminOnlyTools.includes(toolCall.tool)) {
          result = { success: false, message: "You do not have administrative permission to create or edit system records (departments, positions, holidays)." };
        } else if (!isHrOrAdmin && (toolCall.tool === "update_employee" || toolCall.tool === "update_employee_department")) {
          // Ensure targeted employee is in the same department
          const targetEmpId = parseInt(toolCall.args.employee_id);
          const targetEmployee = await prisma.employee.findUnique({
            where: { id: targetEmpId }
          });
          
          if (!targetEmployee || targetEmployee.department_id !== currentEmployee?.department_id) {
            result = { success: false, message: "Access denied. You can only modify employees within your own department." };
          }
        }

        if (result === undefined) {
          try {
            result = await tools[toolCall.tool](toolCall.args, company_id, null);
          } catch (err) {
            console.error(`[Chatbot] Tool execution crashed:`, err);
            result = { success: false, message: "The system encountered an unexpected error while performing this action." };
          }
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

        res.write(`data: ${JSON.stringify({ token: displayMessage })}\n\n`);
      } else {
        // If it looked like a tool call but wasn't valid, treat the whole text as chat response
        res.write(`data: ${JSON.stringify({ token: accumulatedText })}\n\n`);
      }
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
