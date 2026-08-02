import { useQuery } from "@tanstack/react-query";
import { getAllEmployee, getEmployee } from "@/services/employee.services";

export const useAllEmployee = (page = 1, limit = 10, status: string | null = null, departmentId: string | null = null, search: string | null = null) => {
  return useQuery({
    queryKey: ["employees", page, limit, status, departmentId, search],
    queryFn: () => getAllEmployee(page, limit, status, departmentId, search),
  });
};

export const useEmployee = (id: string) => {
  return useQuery({
    queryKey: ["emp", id],
    queryFn: () => getEmployee(id),
    enabled: !!id, // important
  });
};
