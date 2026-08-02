import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCycles, getTemplates, getTeamDashboard, getMyDashboard } from "@/services/kpi.services";

export const useKpiCycles = () => {
  return useQuery({
    queryKey: ["kpi-cycles"],
    queryFn: getCycles,
  });
};

export const useKpiTemplates = () => {
  return useQuery({
    queryKey: ["kpi-templates"],
    queryFn: getTemplates,
  });
};

export const useTeamKpiDashboard = (cycle_id: number | null) => {
  return useQuery({
    queryKey: ["kpi-team-dashboard", cycle_id],
    queryFn: () => getTeamDashboard(cycle_id!),
    enabled: !!cycle_id,
  });
};

export const useMyKpiDashboard = (cycle_id: number | null) => {
  return useQuery({
    queryKey: ["kpi-my-dashboard", cycle_id],
    queryFn: () => getMyDashboard(cycle_id!),
    enabled: !!cycle_id,
  });
};
