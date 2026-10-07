import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "@/lib/api";
import { useApp } from "@/context/AppContext";

export function useDashboard(role) {
  const { companyId, period, startDate, endDate } = useApp();
  const filterParams = {};
  if (period && period !== "all") filterParams.period = period;
  if (startDate) filterParams.start_date = startDate;
  if (endDate) filterParams.end_date = endDate;

  return useQuery({
    queryKey: ["dashboard", role, companyId, period, startDate, endDate],
    queryFn: () => getDashboard(role, companyId, filterParams),
    enabled: !!companyId,
  });
}
