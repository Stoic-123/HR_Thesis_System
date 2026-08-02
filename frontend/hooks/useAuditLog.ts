import { useQuery } from "@tanstack/react-query";
import { getAuditLogs } from "../services/auditlog.services";
import { useMe } from "./useMe";

export const useAuditLogs = (page = 1, limit = 10) => {
  const { data: me } = useMe();
  const company_id = me?.employee?.company_id;

  return useQuery({
    queryKey: ["audit-logs", company_id, page, limit],
    queryFn: () => getAuditLogs(company_id, page, limit),
    enabled: !!company_id,
  });
};
