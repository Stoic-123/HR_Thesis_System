import { useQuery } from "@tanstack/react-query";
import { getEmployeeLocations } from "@/services/location.services";

export const useEmployeeLocations = () => {
  return useQuery({
    queryKey: ["employeeLocations"],
    queryFn: getEmployeeLocations,
  });
};
