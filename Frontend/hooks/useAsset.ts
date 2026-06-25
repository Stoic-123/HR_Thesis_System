import { useQuery } from "@tanstack/react-query";
import { getAssetCategories, getAssets, getAssetRequests } from "@/services/asset.services";

export const useAssetCategories = () => {
  return useQuery({
    queryKey: ["asset-categories"],
    queryFn: getAssetCategories,
  });
};

export const useAssets = () => {
  return useQuery({
    queryKey: ["assets"],
    queryFn: getAssets,
  });
};

export const useAssetRequests = () => {
  return useQuery({
    queryKey: ["asset-requests"],
    queryFn: getAssetRequests,
  });
};
