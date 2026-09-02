import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ResponsiveContainer } from "recharts";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { fmtMoney, fmtFull } from "@/lib/format";
import { cn } from "@/lib/utils";

export const KpiCard = ({ label, value, mom, tone = "primary", icon: Icon, testId, isCurrency = true }) => {
  const up = mom >= 0;
  const toneMap = {
    primary: "text-blue-600 bg-blue-50 dark:bg-blue-950/40",
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
    violet: "text-violet-600 bg-violet-50 dark:bg-violet-950/40",
    rose: "text-rose-600 bg-rose-50 dark:bg-rose-950/40",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
  };
  return (
    <Card data-testid={testId} className="p-5 border-border/70 shadow-sm hover:shadow-md transition-shadow animate-fade-up">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn("p-2 rounded-md", toneMap[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl md:text-3xl font-bold font-mono tracking-tight" title={isCurrency ? fmtFull(value) : String(value)}>
        {isCurrency ? fmtMoney(value) : value}
      </p>
      {mom !== undefined && mom !== null && (
        <div className="mt-2 flex items-center gap-1 text-xs font-medium">
          <span className={cn("inline-flex items-center gap-0.5", up ? "text-emerald-600" : "text-rose-600")}>
            {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(mom).toFixed(1)}%
          </span>
          <span className="text-muted-foreground">vs last month</span>
        </div>
      )}
    </Card>
  );
};

export const Panel = ({ title, subtitle, action, children, className, testId }) => (
  <Card data-testid={testId} className={cn("p-5 md:p-6 border-border/70 shadow-sm animate-fade-up", className)}>
    {(title || action) && (
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          {title && <h3 className="text-base font-semibold text-foreground font-display">{title}</h3>}
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    {children}
  </Card>
);

export const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-2">
    <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-display text-foreground">{title}</h1>
    {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
  </div>
);

// Remounts the recharts container one frame after mount so it always
// measures a settled layout (fixes intermittent 0-width first paint).
export const ResponsiveChart = ({ height, children }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <ResponsiveContainer key={ready ? "r" : "i"} width="100%" height={height} debounce={0}>
      {children}
    </ResponsiveContainer>
  );
};
