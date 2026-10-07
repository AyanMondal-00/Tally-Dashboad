import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ResponsiveContainer } from "recharts";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { fmtMoney, fmtFull } from "@/lib/format";
import { cn } from "@/lib/utils";

export const KpiCard = ({ label, value, mom, tone = "primary", icon: Icon, testId, isCurrency = true }) => {
  const up = mom >= 0;
  const toneMap = {
    primary: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400",
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400",
    violet: "text-violet-600 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-400",
    rose: "text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400",
  };
  return (
    <Card data-testid={testId} className="p-3.5 sm:p-4 md:p-5 border-border/70 shadow-xs hover:shadow-md transition-all duration-200 animate-fade-up min-w-0 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground break-words leading-tight flex-1" title={label}>{label}</p>
          {Icon && (
            <span className={cn("p-1.5 sm:p-2 rounded-lg shrink-0", toneMap[tone])}>
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
          )}
        </div>
        <p className="mt-2 sm:mt-3 text-base sm:text-xl md:text-2xl lg:text-3xl font-bold font-mono tracking-tight truncate" title={isCurrency ? fmtFull(value) : String(value)}>
          {isCurrency ? fmtMoney(value) : value}
        </p>
      </div>
      {mom !== undefined && mom !== null && (
        <div className="mt-2 flex items-center gap-1 text-[11px] sm:text-xs font-medium">
          <span className={cn("inline-flex items-center gap-0.5 shrink-0", up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
            {up ? <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <ArrowDownRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
            {Math.abs(mom).toFixed(1)}%
          </span>
          <span className="text-muted-foreground truncate">vs last mo</span>
        </div>
      )}
    </Card>
  );
};

export const Panel = ({ title, subtitle, action, children, className, testId }) => (
  <Card data-testid={testId} className={cn("p-3.5 sm:p-5 md:p-6 border-border/70 shadow-xs animate-fade-up min-w-0 w-full overflow-hidden", className)}>
    {(title || action) && (
      <div className="flex flex-col xs:flex-row xs:items-start justify-between gap-2 sm:gap-3 mb-3.5 sm:mb-4">
        <div className="min-w-0">
          {title && <h3 className="text-sm sm:text-base font-semibold text-foreground font-display truncate">{title}</h3>}
          {subtitle && <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    )}
    <div className="min-w-0 w-full">{children}</div>
  </Card>
);

export const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-2 sm:mb-3">
    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight font-display text-foreground">{title}</h1>
    {subtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">{subtitle}</p>}
  </div>
);

// Remounts the recharts container one frame after mount so it always
// measures a settled layout (fixes intermittent 0-width first paint).
export const ResponsiveChart = ({ height = 280, children }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="w-full min-w-0 overflow-hidden" style={{ height }}>
      <ResponsiveContainer key={ready ? "r" : "i"} width="100%" height="100%" debounce={50}>
        {children}
      </ResponsiveContainer>
    </div>
  );
};
