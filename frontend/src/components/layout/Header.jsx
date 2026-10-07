import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  Calendar,
  Filter,
  Moon,
  Sun,
  RefreshCw,
  X,
  Clock,
  Sparkles,
  FileText
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function buildPeriodGroups(periodInfo) {
  if (!periodInfo || !periodInfo.financial_years || periodInfo.financial_years.length === 0) {
    return [
      {
        label: "Standard Periods",
        options: [{ id: "all", name: "All Time (Complete Data)" }],
      },
    ];
  }

  const standardOptions = [{ id: "all", name: "All Time (Complete Data)" }];
  const quarterOptions = [];
  const monthOptions = [];

  // 1. Financial Years
  for (const fy of periodInfo.financial_years) {
    const parts = fy.match(/FY (\d{4})-(\d{2,4})/);
    let fyLabel = fy;
    if (parts) {
      const y1 = parts[1];
      const y2 = parts[2].length === 2 ? parts[2] : parts[2].slice(-2);
      fyLabel = `${fy} (Apr ${y1.slice(-2)} – Mar ${y2})`;
    }
    standardOptions.push({ id: fy, name: fyLabel });

    // Quarters for this FY
    if (parts) {
      const startY = parseInt(parts[1], 10);
      const endY = parts[2].length === 4 ? parseInt(parts[2], 10) : parseInt(parts[1].slice(0, 2) + parts[2], 10);
      const sY = String(startY).slice(-2);
      const eY = String(endY).slice(-2);
      quarterOptions.push({ id: `Q1 ${fy.replace("FY ", "")}`, name: `Q1 ${fy.replace("FY ", "")} (Apr ${sY} – Jun ${sY})` });
      quarterOptions.push({ id: `Q2 ${fy.replace("FY ", "")}`, name: `Q2 ${fy.replace("FY ", "")} (Jul ${sY} – Sep ${sY})` });
      quarterOptions.push({ id: `Q3 ${fy.replace("FY ", "")}`, name: `Q3 ${fy.replace("FY ", "")} (Oct ${sY} – Dec ${sY})` });
      quarterOptions.push({ id: `Q4 ${fy.replace("FY ", "")}`, name: `Q4 ${fy.replace("FY ", "")} (Jan ${eY} – Mar ${eY})` });
    }
  }

  // 2. Months from XML data
  if (periodInfo.months && periodInfo.months.length > 0) {
    for (const m of periodInfo.months) {
      const [year, monthNum] = m.split("-");
      const mIdx = parseInt(monthNum, 10) - 1;
      const mName = MONTH_NAMES[mIdx] || monthNum;
      monthOptions.push({
        id: m,
        name: `${mName} ${year}`,
      });
    }
  }

  const groups = [
    { label: "Financial Years", options: standardOptions },
  ];
  if (quarterOptions.length > 0) {
    groups.push({ label: "Quarters", options: quarterOptions });
  }
  if (monthOptions.length > 0) {
    groups.push({ label: "Monthly Breakdown", options: monthOptions });
  }

  return groups;
}

export const Header = ({ title }) => {
  const {
    companies,
    company,
    companyId,
    setCompanyId,
    period,
    setPeriod,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    dark,
    setDark,
  } = useApp();

  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [customStart, setCustomStart] = useState(startDate || "");
  const [customEnd, setCustomEnd] = useState(endDate || "");

  const periodGroups = React.useMemo(() => {
    return buildPeriodGroups(company?.period_info);
  }, [company?.period_info]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    await queryClient.invalidateQueries({ queryKey: ["ledger"] });
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleApplyCustomDates = () => {
    setStartDate(customStart);
    setEndDate(customEnd);
    setPeriod("custom");
    setPopoverOpen(false);
  };

  const handleClearFilter = () => {
    setPeriod("all");
    setStartDate("");
    setEndDate("");
    setCustomStart("");
    setCustomEnd("");
    setPopoverOpen(false);
  };

  const getActiveFilterLabel = () => {
    if (period === "custom") {
      if (startDate && endDate) return `${startDate} → ${endDate}`;
      if (startDate) return `From ${startDate}`;
      if (endDate) return `Until ${endDate}`;
      return "Custom Range";
    }
    for (const grp of periodGroups) {
      const match = grp.options.find((o) => o.id === period);
      if (match) return match.name.split(" (")[0];
    }
    return "All Time";
  };

  const isFiltered = period !== "all" || Boolean(startDate || endDate);

  // XML Data period badge summary
  const periodInfo = company?.period_info;
  const xmlYearsText = periodInfo?.financial_years?.length
    ? `${periodInfo.financial_years.length} ${periodInfo.financial_years.length === 1 ? "Yr" : "Yrs"} XML Data (${periodInfo.financial_years.slice().reverse().join(", ")})`
    : null;

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-border glass-header">
      <div className="flex items-center justify-between gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 lg:px-6 py-2 min-w-0">
        {/* Left Section: Page Title, XML Meta Card & Filter Badges */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 pl-9 lg:pl-0">
          <span className="text-xs sm:text-sm font-bold text-foreground truncate font-display shrink-0">
            {title}
          </span>

          {/* Compact XML Info Card */}
          {company && (
            <div
              className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 shadow-2xs shrink-0 max-w-[280px] xl:max-w-[340px]"
              title={`Uploaded XML Data: ${company.name} | Period: ${periodInfo?.financial_years?.join(", ") || "All"} (${periodInfo?.min_date || ""} to ${periodInfo?.max_date || ""})`}
            >
              <div className="p-0.5 rounded bg-blue-100 dark:bg-blue-950/80 shrink-0">
                <FileText className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex flex-col min-w-0 leading-none">
                <span className="text-[10px] font-semibold text-foreground truncate">
                  {company.name}
                </span>
                <span className="text-[9px] font-medium text-blue-600 dark:text-blue-400 font-mono mt-0.5 truncate">
                  {periodInfo?.financial_years?.length
                    ? `${periodInfo.financial_years.length} ${periodInfo.financial_years.length === 1 ? "Yr" : "Yrs"} (${periodInfo.financial_years.slice().reverse().join(", ")})`
                    : "XML Live Data"}
                </span>
              </div>
            </div>
          )}

          {/* Active Filter Pill */}
          {isFiltered && (
            <Badge
              variant="secondary"
              className="hidden md:inline-flex text-[10px] items-center gap-1 font-mono bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 py-0.5 px-1.5"
            >
              <Clock className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate max-w-[110px]">{getActiveFilterLabel()}</span>
            </Badge>
          )}
        </div>

        {/* Right Section: Compact, Perfectly Scaled Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 min-w-0">
          {/* Company Switcher */}
          <Select value={companyId || ""} onValueChange={setCompanyId}>
            <SelectTrigger
              data-testid="company-switcher-trigger"
              className="h-8 sm:h-8.5 w-[115px] xs:w-[145px] sm:w-[175px] md:w-[210px] lg:w-[230px] bg-card hover:bg-accent/40 border border-border/80 text-[11px] sm:text-xs px-2 shadow-2xs transition-colors rounded-lg shrink-0"
            >
              <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                <div className="p-0.5 rounded bg-blue-50 dark:bg-blue-950/60 shrink-0">
                  <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <SelectValue
                  placeholder="Select company"
                  className="truncate font-medium text-[11px] sm:text-xs text-foreground"
                />
              </div>
            </SelectTrigger>
            <SelectContent className="w-[260px] sm:w-[320px] max-w-[90vw] p-1.5 rounded-lg shadow-xl">
              {companies.map((c) => (
                <SelectItem
                  key={c.id}
                  value={c.id}
                  data-testid={`company-option-${c.id}`}
                  className="cursor-pointer py-1.5 px-2 rounded-md"
                >
                  <div className="flex flex-col gap-0.5 py-0.5 min-w-0">
                    <span className="font-semibold text-xs text-foreground truncate">
                      {c.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {c.branch} · {c.currency}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Dynamic Period Selector Dropdown */}
          <Select
            value={period === "custom" ? "custom" : period}
            onValueChange={(val) => {
              if (val !== "custom") {
                setPeriod(val);
                setStartDate("");
                setEndDate("");
              }
            }}
          >
            <SelectTrigger
              data-testid="fy-selector-trigger"
              className="h-8 sm:h-8.5 w-[90px] xs:w-[115px] sm:w-[135px] md:w-[145px] bg-card text-[11px] sm:text-xs font-medium border border-border/80 rounded-lg shadow-2xs px-2 shrink-0"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate">{getActiveFilterLabel()}</span>
              </div>
            </SelectTrigger>
            <SelectContent className="w-[230px] max-h-[340px] p-1 rounded-lg shadow-xl">
              {periodGroups.map((grp) => (
                <div key={grp.label} className="py-1">
                  <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {grp.label}
                  </div>
                  {grp.options.map((opt) => (
                    <SelectItem
                      key={opt.id}
                      value={opt.id}
                      className="text-xs cursor-pointer py-1.5"
                    >
                      {opt.name}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>

          {/* Advanced Custom Date Range Popover */}
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={isFiltered ? "default" : "outline"}
                size="sm"
                className={`h-8 sm:h-8.5 px-2 text-xs font-medium rounded-lg gap-1 shrink-0 ${
                  isFiltered
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "border-border text-foreground/80 hover:bg-accent"
                }`}
                title="Advanced Custom Date Range"
              >
                <Filter className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden xl:inline text-[11px]">Range</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[280px] sm:w-[320px] p-4 bg-card border border-border shadow-xl rounded-xl space-y-3"
            >
              <div className="flex items-center justify-between pb-1 border-b border-border/60">
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Custom Date Range</span>
                </div>
                {isFiltered && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilter}
                    className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Reset
                  </Button>
                )}
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">From Date</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">To Date</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  onClick={handleApplyCustomDates}
                  disabled={!customStart && !customEnd}
                >
                  Apply Filter
                </Button>
                {isFiltered && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={handleClearFilter}
                    title="Clear filter"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Sync Badge */}
          {company && (
            <Badge
              variant="outline"
              className="hidden 2xl:flex items-center gap-1 h-8 sm:h-8.5 px-2 text-[10px] font-normal border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400 shrink-0"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate">Sync: {company.last_sync}</span>
            </Badge>
          )}

          {/* Action Button Group: Refresh & Theme */}
          <div className="flex items-center gap-1 pl-0.5 border-l border-border/60 shrink-0">
            <button
              data-testid="header-refresh-button"
              onClick={handleRefresh}
              className="h-8 w-8 sm:h-8.5 sm:w-8.5 flex items-center justify-center rounded-lg border border-border/80 bg-card hover:bg-accent transition-colors shrink-0 shadow-2xs"
              title="Refresh dashboards"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  refreshing ? "animate-spin text-blue-600" : "text-muted-foreground"
                }`}
              />
            </button>

            <button
              data-testid="theme-toggle"
              onClick={() => setDark(!dark)}
              className="h-8 w-8 sm:h-8.5 sm:w-8.5 flex items-center justify-center rounded-lg border border-border/80 bg-card hover:bg-accent transition-colors shrink-0 shadow-2xs"
              title="Toggle theme"
            >
              {dark ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-slate-600" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
