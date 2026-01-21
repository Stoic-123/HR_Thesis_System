import { db } from "../config/db.js";

export const addAuditLog = async (auditLog) => {
 try {
       const [result] = await db.execute(
        "INSERT INTO AuditLog (employee_id, action, details) VALUES (?, ?, ?)",
        [auditLog.employee_id, auditLog.action, auditLog.details]
    );
    return result.insertId;
 } catch (error) {
    console.log(error.message);
    throw error
    
 }
};
export const getAuditLog = async () => {
    const [result] = await db.execute("SELECT * FROM AuditLog");
    return result;
};