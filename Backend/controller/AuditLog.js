import { getAuditLog } from "../service/AuditLog.js";

export const getAuditLogsController = async (req, res) => {
  try {
    const { company_id, page, limit } = req.query;
    if (!company_id) {
      return res.status(400).json({ result: false, message: "Company ID is required" });
    }
    const logs = await getAuditLog(company_id, page, limit);
    res.status(200).json({ result: true, ...logs });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
