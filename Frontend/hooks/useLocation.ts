import { useQuery } from "@tanstack/react-query";
import { getLocations } from "@/services/location.services";

export const useLocations = () => {
  return useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
  });
};
