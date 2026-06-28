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

    // Fetch context (restricted to department if user is not HR/Admin)
    const deptFilter = isHrOrAdmin ? null : currentEmployee?.department_id;
    const context = await getHRContext(company_id, deptFilter);
    
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
         - add_holiday {"name": "string", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"}`
      : `Available tools:
         - update_employee_department {"employee_id": number, "department_id": number} (ONLY for employees in your department)
         - update_employee {"employee_id": number, "new_args": {"field": "value"}} (ONLY for employees in your department)
         * Note: Administrative tools (add_department, add_position, add_holiday) are strictly disabled for your role.`;

    const systemPrompt = `
      ${roleDescription}
      
      CONTEXT:
      - EMPLOYEES: ${JSON.stringify(context.employees)}
      - DEPARTMENTS: ${JSON.stringify(context.departments)}
      - POSITIONS: ${JSON.stringify(context.positions)}
      
      CAPABILITIES:
      1. You can search, move, and update employee information (age, name, etc.).
      2. Admin only: You can manage departments (add), positions (add), and holidays.
      
      RESTRICTIONS:
      - You are NOT allowed to delete anything (employees, departments, positions, etc.).
      - If a user is not Admin/HR, you MUST refuse to perform company-wide administrative tasks (like adding departments, holidays, positions).
      - Refuse to update or fetch information about employees who are NOT in the EMPLOYEES context list.
      - If a user asks for something you cannot do (e.g., "order pizza", "hack the system", "delete everyone"), respond politely that it is outside your current HR management capabilities.
      
      OUTPUT RULES:
      1. NEVER output raw JSON code blocks or database IDs to the user.
      2. ALWAYS respond with natural, conversational English.
      3. If you find data, summarize it in a nice list or paragraph.
      4. DO NOT say "Here is the JSON" or similar technical phrases.
      5. Answer ONLY in English.
      
      ACTION RULES:
      1. For ACTIONS on specific people/items, if multiple matches exist, ALWAYS ask for clarification.
      2. To perform an action (and ONLY to perform an action), return ONLY a JSON object: {"tool": "tool_name", "args": {...}}.
      3. ${toolInstructions}
      
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

    try {
      await chatWithAI(messages, "llama3.2", (token) => {
        accumulatedText += token;
        
        if (isToolCallDetected === null) {
          const trimmed = accumulatedText.trim();
          if (trimmed.length > 0) {
            if (trimmed.startsWith("{")) {
              isToolCallDetected = true;
            } else {
              isToolCallDetected = false;
              // Stream the accumulated text so far
              res.write(`data: ${JSON.stringify({ token: trimmed })}\n\n`);
            }
          }
        } else if (isToolCallDetected === false) {
          // Stream directly to the client in real-time
          res.write(`data: ${JSON.stringify({ token })}\n\n`);
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
            result = await tools[toolCall.tool](toolCall.args, company_id);
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
          ? `⚙️ [SYSTEM COMMAND]: ${result.message}` 
          : `⚠️ [AI ASSISTANT]: I'm sorry, I couldn't complete that action. ${result.message}`;

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
