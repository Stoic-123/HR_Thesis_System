import { chatWithAI } from "../lib/ai/ollama.js";
import prisma from "../lib/prisma.js";

export const smartSearchController = async (req, res) => {
  try {
    const { query } = req.query;

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const company_id = req.user.company_id;

    if (!query) {
      return res.status(400).json({ success: false, message: "Query is required" });
    }

    // 1. Get all employees (limited for performance)
    const employees = await prisma.employee.findMany({
      where: { company_id },
      take: 100,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
         is_active: true,
         address: true,
         profile_path: true,
         positions: { select: { name: true } },
        department_employee_department_idTodepartment: { select: { name: true } },
      },
    });

    if (employees.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // 2. Use LLM to find the best matches (Semantic Match)
    // This is MUCH faster than generating 100 separate embeddings
    const employeeListString = employees.map(e => 
      `ID:${e.id} | Name:${e.first_name} ${e.last_name} | Pos:${e.positions?.name || "N/A"} | Dept:${e.department_employee_department_idTodepartment?.name || "N/A"} | Addr:${e.address || ""}`
    ).join("\n");

    const searchPrompt = [
      { 
        role: "system", 
        content: `You are an HR Search Engine. Given a list of employees and a search query, return the IDs of the top 10 most relevant employees as a comma-separated list.
        
        CRITERIA:
        - Match names, departments, positions, or locations mentioned in the query.
        - If the query is vague (e.g., "sales team"), include everyone in that department.
        - Return ONLY the IDs (e.g., 1, 5, 23). If no matches, return "NONE".`
      },
      { 
        role: "user", 
        content: `QUERY: "${query}"\n\nEMPLOYEES:\n${employeeListString}` 
      }
    ];

    const aiResult = await chatWithAI(searchPrompt, "llama3.2");
    
    if (aiResult.trim().toUpperCase() === "NONE") {
      return res.status(200).json({ success: true, data: [] });
    }

    // Parse IDs from AI response
    const matchedIds = aiResult.match(/\d+/g)?.map(id => parseInt(id)) || [];

    // 3. Filter and sort employees based on AI results
    const results = matchedIds
      .map(id => employees.find(e => e.id === id))
      .filter(Boolean)
      .map(emp => ({
        id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        full_name: `${emp.first_name} ${emp.last_name}`,
        email: emp.email,
        status: emp.is_active,
        profile_path: emp.profile_path,
        position: emp.positions?.name || "N/A",
        department: emp.department_employee_department_idTodepartment?.name || "N/A",
      }));

    console.log(`[Smart Search] Query: "${query}" -> Matches: ${matchedIds.join(", ")}`);

    res.status(200).json({ 
      success: true, 
      data: results 
    });
  } catch (error) {
    console.error("[Smart Search] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
