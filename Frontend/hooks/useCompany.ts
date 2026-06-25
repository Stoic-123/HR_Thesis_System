import { useQuery } from "@tanstack/react-query";
import { getCompany } from "@/services/company.services";

export const useCompany = () => {
  return useQuery({
    queryKey: ["company"],
    queryFn: getCompany,
  });
};
