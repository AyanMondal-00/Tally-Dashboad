import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "@/lib/api";
import { useApp } from "@/context/AppContext";

export function useDashboard(role) {
  const { companyId } = useApp();
  return useQuery({
    queryKey: ["dashboard", role, companyId],
    queryFn: () => getDashboard(role, companyId),
    enabled: !!companyId,
  });
}
