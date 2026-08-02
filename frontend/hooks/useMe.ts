import { useQuery } from "@tanstack/react-query";
import { getMe } from "../services/auth.services";

export const useMe = () => {
  return useQuery({
    queryKey: ["me"],
    queryFn: getMe,
  });
};
