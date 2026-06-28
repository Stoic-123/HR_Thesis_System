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

    // 1. Clean the search query for the DB fast path
    let cleanQuery = query.trim().toLowerCase();
    
    // Strip common conversational prefixes
    const prefixes = [
      "show me employees who are",
      "show me employees who",
      "show me employees in",
      "show me employees",
      "show me the",
      "show me",
      "who is",
      "who are",
      "search for",
      "find employees in",
      "find employees",
      "find",
      "list of",
      "list all"
    ];
    
    for (const prefix of prefixes) {
      if (cleanQuery.startsWith(prefix)) {
        cleanQuery = cleanQuery.slice(prefix.length).trim();
        break;
      }
    }

    // 2. First attempt: Direct database search (fast path - takes <10ms)
    if (cleanQuery.length > 0) {
      const dbMatches = await prisma.employee.findMany({
        where: {
          company_id,
          OR: [
            { first_name: { contains: cleanQuery } },
            { last_name: { contains: cleanQuery } },
            { email: { contains: cleanQuery } },
            { address: { contains: cleanQuery } },
            { positions: { name: { contains: cleanQuery } } },
            { department_employee_department_idTodepartment: { name: { contains: cleanQuery } } },
          ],
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          is_active: true,
          profile_path: true,
          positions: { select: { name: true } },
          department_employee_department_idTodepartment: { select: { name: true } },
        },
        take: 50, // Safety limit
      });

      if (dbMatches.length > 0) {
        const results = dbMatches.map(emp => ({
          id: emp.id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          full_name: `${emp.first_name} ${emp.last_name}`,
          email: emp.email,
          status: emp.is_active,
          profile_path: emp.profile_path,
          position: emp.positions?.name || "N/A",
          department: emp.department_employee_department_idTodepartment?.name || "N/A",
          relevanceScore: 1.0, // perfect database match
        }));
        console.log(`[Smart Search] DB Fast Path Match for "${query}" (cleaned: "${cleanQuery}"): Found ${results.length} results.`);
        return res.status(200).json({ success: true, data: results });
      }
    }

    // 3. Fallback: Use LLM for semantic matching (takes 10-15s)
    // Get all employees for LLM prompt context
    const employees = await prisma.employee.findMany({
      where: { company_id },
      take: 100,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        is_active: true,
        profile_path: true,
        positions: { select: { name: true } },
        department_employee_department_idTodepartment: { select: { name: true } },
      },
    });

    if (employees.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const employeeListString = employees.map(e => 
      `ID:${e.id} | Name:${e.first_name} ${e.last_name} | Pos:${e.positions?.name || "N/A"} | Dept:${e.department_employee_department_idTodepartment?.name || "N/A"}`
    ).join("\n");

    const searchPrompt = [
      { 
        role: "system", 
        content: `You are an HR Search Engine. Given a list of employees and a search query, return a JSON array containing the IDs of the top 10 most relevant employees.
        
        CRITERIA:
        - Match names, departments, positions, or locations mentioned in the query.
        - If the query is vague (e.g., "sales team"), include everyone in that department.
        
        OUTPUT FORMAT:
        Return ONLY a raw JSON array of numbers, for example: [1, 5, 23]. If no matches, return [].
        Do NOT write any conversational text, headers, or markdown blocks.`
      },
      { 
        role: "user", 
        content: `QUERY: "${query}"\n\nEMPLOYEES:\n${employeeListString}` 
      }
    ];

    console.log(`[Smart Search] DB Fast Path missed. Calling Ollama fallback for query: "${query}"...`);
    const aiResult = await chatWithAI(searchPrompt, "llama3.2");
    console.log(`[Smart Search] Raw AI Response:`, aiResult);

    // Parse IDs from AI response robustly
    let matchedIds = [];
    try {
      const cleaned = aiResult.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
      matchedIds = JSON.parse(cleaned);
      if (!Array.isArray(matchedIds)) {
        matchedIds = [];
      }
    } catch (e) {
      console.warn("[Smart Search] Failed to parse JSON array from AI, falling back to digit match.");
      matchedIds = aiResult.match(/\d+/g)?.map(id => parseInt(id)) || [];
    }

    // Filter and sort employees based on AI results
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
        relevanceScore: 0.9, // semantic match score
      }));

    console.log(`[Smart Search] Ollama Match for "${query}" -> Matches: ${results.map(r => r.id).join(", ")}`);

    res.status(200).json({ 
      success: true, 
      data: results 
    });
  } catch (error) {
    console.error("[Smart Search] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
