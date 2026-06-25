import { chatWithAI } from "../lib/ai/ollama.js";

export const classifyIntentController = async (req, res) => {
  try {
    const { query } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!query) {
      return res.status(400).json({ success: false, message: "Query is required" });
    }

    const classificationPrompt = [
      { 
        role: "system", 
        content: `You are an HR System navigator. Classify the user's search query into ONE of these categories:
        - EMPLOYEE (for searching people, names, departments, roles, or general hiring)
        - LEAVE (for leave requests, balance, time off, or leave setup)
        - HOLIDAY (for upcoming holidays, public holidays, or holiday calendar)
        - AUDIT (for activity logs, history, or audit trails)
        - COMPANY (for company profile or settings)
        
        Return ONLY the category name in uppercase.` 
      },
      { role: "user", content: query }
    ];

    const category = await chatWithAI(classificationPrompt, "llama3.2");
    const cleanCategory = category.trim().toUpperCase();

    // Map categories to routes
    const routeMap = {
      'EMPLOYEE': '/dashboard/employee',
      'LEAVE': '/dashboard/leave',
      'HOLIDAY': '/dashboard/holiday',
      'AUDIT': '/dashboard/audit-log',
      'COMPANY': '/dashboard/company'
    };

    const targetRoute = routeMap[cleanCategory] || '/dashboard/employee';
    
    console.log(`[AI Classifier] Query: "${query}" -> Category: ${cleanCategory} -> Route: ${targetRoute}`);

    res.status(200).json({ 
      success: true, 
      category: cleanCategory,
      route: targetRoute 
    });
  } catch (error) {
    console.error("[AI Classifier] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
