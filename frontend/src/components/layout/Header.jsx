import React from "react";
import { useApp } from "@/context/AppContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, ChevronDown, Moon, Sun, RefreshCw, Check } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Select as FySelect, SelectContent as FyContent, SelectItem as FyItem,
  SelectTrigger as FyTrigger, SelectValue as FyValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const FYS = ["FY 2025-26", "FY 2024-25", "Q1 2025-26", "Q2 2025-26"];

export const Header = ({ title }) => {
  const { companies, company, companyId, setCompanyId, dark, setDark } = useApp();
  const [fy, setFy] = React.useState("FY 2025-26");
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    await queryClient.invalidateQueries({ queryKey: ["ledger"] });
    setTimeout(() => setRefreshing(false), 600);
    toast.success("Dashboards refreshed");
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-white/85 dark:bg-slate-900/85 border-b border-border glass-header">
      <div className="flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex items-center gap-2 min-w-0 pl-11 lg:pl-0">
          <span className="text-xs sm:text-sm font-semibold text-foreground/80 truncate font-display">{title}</span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Company switcher */}
          <Select value={companyId || ""} onValueChange={setCompanyId}>
            <SelectTrigger
              data-testid="company-switcher-trigger"
              className="h-9 sm:h-10 w-[150px] xs:w-[190px] sm:w-[240px] md:w-[300px] lg:w-[340px] xl:w-[380px] bg-card hover:bg-accent/40 border border-border/80 text-xs sm:text-sm px-2.5 sm:px-3 shadow-2xs transition-colors rounded-lg"
            >
              <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                <div className="p-1 rounded bg-blue-50 dark:bg-blue-950/60 shrink-0">
                  <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <SelectValue placeholder="Select company" className="truncate font-medium text-xs sm:text-sm text-foreground" />
              </div>
            </SelectTrigger>
            <SelectContent className="w-[280px] sm:w-[360px] md:w-[400px] max-w-[90vw] p-1.5 rounded-lg shadow-xl">
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id} data-testid={`company-option-${c.id}`} className="cursor-pointer py-2 px-2.5 rounded-md">
                  <div className="flex flex-col gap-0.5 py-0.5 min-w-0">
                    <span className="font-semibold text-xs sm:text-sm text-foreground truncate">{c.name}</span>
                    <span className="text-[10px] sm:text-[11px] text-muted-foreground">{c.branch} · {c.currency}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* FY selector */}
          <div className="hidden lg:block">
            <FySelect value={fy} onValueChange={setFy}>
              <FyTrigger data-testid="fy-selector-trigger" className="h-9 w-[120px] bg-card text-xs font-medium">
                <FyValue />
              </FyTrigger>
              <FyContent>
                {FYS.map((f) => (
                  <FyItem key={f} value={f} className="text-xs">{f}</FyItem>
                ))}
              </FyContent>
            </FySelect>
          </div>

          {company && (
            <Badge variant="outline" className="hidden 2xl:flex gap-1.5 h-9 px-2.5 text-xs font-normal border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Synced {company.last_sync}
            </Badge>
          )}

          <button
            data-testid="header-refresh-button"
            onClick={handleRefresh}
            className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-md border border-border bg-card hover:bg-accent transition-colors shrink-0"
            title="Refresh dashboards"
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${refreshing ? "animate-spin text-blue-600" : "text-muted-foreground"}`} />
          </button>

          <button
            data-testid="theme-toggle"
            onClick={() => setDark(!dark)}
            className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-md border border-border bg-card hover:bg-accent transition-colors shrink-0"
            title="Toggle theme"
          >
            {dark ? <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" /> : <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600" />}
          </button>
        </div>
      </div>
    </header>
  );
};
