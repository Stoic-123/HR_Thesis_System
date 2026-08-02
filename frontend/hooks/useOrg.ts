import { useQuery } from "@tanstack/react-query";
import { getDepartments } from "@/services/department.services";
import { getPositions } from "@/services/position.services";

export const useDepartments = (is_active: number | null = 1, page = 1, limit = 10) => {
  return useQuery({
    queryKey: ["departments", is_active, page, limit],
    queryFn: () => getDepartments(is_active, page, limit),
  });
};

export const usePositions = (page = 1, limit = 10, department_id?: number) => {
  return useQuery({
    queryKey: ["positions", page, limit, department_id],
    queryFn: () => getPositions(page, limit, department_id),
  });
};
