import { useQuery } from "@tanstack/react-query";
import { getTimeModes } from "@/services/timemode.services";

export const useTimeModes = (page = 1, limit = 100) => {
  return useQuery({
    queryKey: ["timeModes", page, limit],
    queryFn: () => getTimeModes(page, limit),
  });
};
