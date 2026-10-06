import React, { useState } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { KpiCard, Panel, SectionHeader, ResponsiveChart } from "@/components/shared/Widgets";
import { PageLoading, EmptyState } from "@/components/shared/States";
import { fmtMoney, fmtFull, CHART } from "@/lib/format";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign, ShoppingBag, ArrowDownToLine, ArrowUpFromLine, Wallet, Landmark, Coins, AlertTriangle,
} from "lucide-react";

const chartTip = {
  contentStyle: { borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 },
};

const TopList = ({ rows, valueKey, nameKey = "name", limit }) => (
  <div className="space-y-1">
    {rows.slice(0, limit).map((r, i) => {
      const max = rows[0][valueKey] || 1;
      const pct = Math.max((r[valueKey] / max) * 100, 3);
      return (
        <div key={i} className="relative rounded-md px-3 py-2 overflow-hidden" data-testid={`topper-row-${i}`}>
          <div className="absolute inset-y-0 left-0 bg-blue-50 dark:bg-blue-950/40" style={{ width: `${pct}%` }} />
          <div className="relative flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 truncate">
              <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}</span>
              <span className="truncate font-medium">{r[nameKey]}</span>
            </span>
            <span className="font-mono font-semibold ml-2">{fmtMoney(r[valueKey])}</span>
          </div>
        </div>
      );
    })}
  </div>
);

export default function CeoDashboard() {
  const { data, isLoading } = useDashboard("ceo");
  const [topN, setTopN] = useState(5);
  if (isLoading || !data) return <PageLoading />;
  const d = data.data;
  const bs = d.business_snapshot;
  const liq = d.liquidity;

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0" data-testid="ceo-dashboard">
      <SectionHeader title="CEO Dashboard" subtitle="Executive strategic view · liquidity, growth & watchlists" />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <KpiCard testId="kpi-gross-sales-value" label="Gross Sales" value={bs.gross_sales} mom={bs.mom.sales} tone="primary" icon={DollarSign} />
        <KpiCard testId="kpi-net-sales-value" label="Net Sales" value={bs.net_sales} tone="emerald" icon={DollarSign} />
        <KpiCard testId="kpi-purchases-value" label="Total Purchases" value={bs.total_purchases} mom={bs.mom.purchases} tone="violet" icon={ShoppingBag} />
        <KpiCard testId="kpi-receipts-value" label="Total Receipts" value={bs.total_receipts} mom={bs.mom.receipts} tone="emerald" icon={ArrowDownToLine} />
        <div className="col-span-2 sm:col-span-1">
          <KpiCard testId="kpi-payments-value" label="Total Payments" value={bs.total_payments} mom={bs.mom.payments} tone="rose" icon={ArrowUpFromLine} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
        <Panel title="Executive Trends" subtitle="Monthly sales, gross profit & margin" className="lg:col-span-2 min-w-0" testId="ceo-trends-panel">
          <ResponsiveChart height={280}>
            <AreaChart data={d.trends.monthly} margin={{ left: -15, right: 8, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.sales} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={CHART.sales} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gGp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.receipts} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={CHART.receipts} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickFormatter={(v) => fmtMoney(v)} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={60} />
              <Tooltip {...chartTip} formatter={(v) => fmtFull(v)} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              <Area type="monotone" dataKey="sales" name="Sales" stroke={CHART.sales} fill="url(#gSales)" strokeWidth={2} isAnimationActive={false} />
              <Area type="monotone" dataKey="gross_profit" name="Gross Profit" stroke={CHART.receipts} fill="url(#gGp)" strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveChart>
        </Panel>

        <Panel title="Liquidity & Net Cash Flow" subtitle="Live balances & working capital" className="min-w-0" testId="ceo-liquidity-panel">
          <div className="space-y-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 p-3.5 sm:p-4 text-white shadow-xs">
              <p className="text-[11px] sm:text-xs uppercase tracking-wider text-blue-100 flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Net Working Capital</p>
              <p className="text-xl sm:text-2xl font-bold font-mono mt-1 truncate">{fmtMoney(liq.net_working_capital)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div className="rounded-md border border-border p-2.5 sm:p-3">
                <p className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1"><Landmark className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Bank</p>
                <p className="font-mono font-semibold text-sm sm:text-base mt-1 truncate">{fmtMoney(liq.bank_total)}</p>
              </div>
              <div className="rounded-md border border-border p-2.5 sm:p-3">
                <p className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1"><Coins className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Cash</p>
                <p className="font-mono font-semibold text-sm sm:text-base mt-1 truncate">{fmtMoney(liq.cash_in_hand)}</p>
              </div>
            </div>
            <div className="space-y-1.5 pt-1 max-h-[160px] sm:max-h-[200px] overflow-y-auto no-scrollbar">
              {liq.banks.map((b, i) => (
                <div key={i} className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-border/50 last:border-0 gap-2">
                  <span className="text-muted-foreground truncate">{b.name}</span>
                  <span className={`font-mono shrink-0 font-medium ${b.balance < 0 ? "text-rose-600 dark:text-rose-400" : ""}`}>{fmtFull(b.balance)}</span>
                </div>
              ))}
              {liq.banks.length === 0 && <EmptyState label="No bank ledgers in imported data" />}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
        <Panel
          title="Toppers Watchlist"
          className="lg:col-span-2 min-w-0"
          testId="ceo-toppers-panel"
          action={
            <div className="flex gap-1">
              {[5, 10, 30].map((n) => (
                <Button key={n} size="sm" variant={topN === n ? "default" : "outline"} className="h-6 sm:h-7 px-2 text-[11px] sm:text-xs"
                  data-testid={`topper-limit-${n}`} onClick={() => setTopN(n)}>Top {n}</Button>
              ))}
            </div>
          }
        >
          <Tabs defaultValue="customers" className="w-full min-w-0">
            <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
              <TabsList className="h-8 sm:h-9">
                <TabsTrigger value="customers" className="text-xs" data-testid="toppers-tab-customers">Customers</TabsTrigger>
                <TabsTrigger value="suppliers" className="text-xs" data-testid="toppers-tab-suppliers">Suppliers</TabsTrigger>
                <TabsTrigger value="items" className="text-xs" data-testid="toppers-tab-items">Items</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="customers" className="mt-3 max-h-[340px] overflow-y-auto no-scrollbar">
              <TopList rows={d.toppers.customers} valueKey="billing" limit={topN} />
            </TabsContent>
            <TabsContent value="suppliers" className="mt-3 max-h-[340px] overflow-y-auto no-scrollbar">
              <TopList rows={d.toppers.suppliers} valueKey="billing" limit={topN} />
            </TabsContent>
            <TabsContent value="items" className="mt-3 max-h-[340px] overflow-y-auto no-scrollbar">
              {d.toppers.items.length ? <TopList rows={d.toppers.items} valueKey="revenue" limit={topN} /> : <EmptyState label="No item data" />}
            </TabsContent>
          </Tabs>
        </Panel>

        <Panel title="Inactive Account Alerts" subtitle="Dormant clients > 60 days" className="min-w-0" testId="ceo-inactive-panel">
          <div className="space-y-2 max-h-[340px] overflow-y-auto no-scrollbar">
            {d.inactive.length === 0 && <EmptyState label="No dormant accounts" />}
            {d.inactive.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-md border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-2.5 sm:px-3 py-2" data-testid={`inactive-row-${i}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium truncate flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">{c.name}</span>
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">Idle {c.last_active_days}d · O/S {fmtMoney(c.balance)}</p>
                </div>
                <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-300 text-[10px] sm:text-xs shrink-0">{fmtMoney(c.annual_value)}/yr</Badge>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
