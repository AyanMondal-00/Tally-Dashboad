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
    <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-border">
      <div className="flex items-center justify-between gap-3 px-4 md:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-2 min-w-0 pl-10 lg:pl-0">
          <span className="hidden md:inline text-sm font-medium text-muted-foreground truncate">{title}</span>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Company switcher */}
          <Select value={companyId || ""} onValueChange={setCompanyId}>
            <SelectTrigger
              data-testid="company-switcher-trigger"
              className="h-9 w-[180px] md:w-[240px] bg-card"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                <SelectValue placeholder="Select company" className="truncate" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id} data-testid={`company-option-${c.id}`}>
                  <div className="flex flex-col">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-[11px] text-muted-foreground">{c.branch} · {c.currency}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* FY selector */}
          <div className="hidden md:block">
            <FySelect value={fy} onValueChange={setFy}>
              <FyTrigger data-testid="fy-selector-trigger" className="h-9 w-[130px] bg-card">
                <FyValue />
              </FyTrigger>
              <FyContent>
                {FYS.map((f) => (
                  <FyItem key={f} value={f}>{f}</FyItem>
                ))}
              </FyContent>
            </FySelect>
          </div>

          {company && (
            <Badge variant="outline" className="hidden xl:flex gap-1.5 h-9 px-3 font-normal border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Synced {company.last_sync}
            </Badge>
          )}

          <button
            data-testid="header-refresh-button"
            onClick={handleRefresh}
            className="h-9 w-9 flex items-center justify-center rounded-md border border-border bg-card hover:bg-accent transition-colors"
            title="Refresh dashboards"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>

          <button
            data-testid="theme-toggle"
            onClick={() => setDark(!dark)}
            className="h-9 w-9 flex items-center justify-center rounded-md border border-border bg-card hover:bg-accent transition-colors"
            title="Toggle theme"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
