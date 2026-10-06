import React from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { Panel, SectionHeader, KpiCard, ResponsiveChart } from "@/components/shared/Widgets";
import { PageLoading, EmptyState } from "@/components/shared/States";
import { fmtMoney, fmtFull, fmtDate, CHART } from "@/lib/format";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const chartTip = {
  contentStyle: { borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 },
};
const BUCKETS = [
  { key: "0_30", label: "0–30d" }, { key: "31_60", label: "31–60d" },
  { key: "61_90", label: "61–90d" }, { key: "above_90", label: "90d+" },
];

const AgingBlock = ({ title, aging, testId }) => {
  const chartData = BUCKETS.map((b) => ({ name: b.label, value: aging.buckets[b.key], key: b.key }));
  const total = Object.values(aging.buckets).reduce((a, b) => a + b, 0);
  return (
    <Panel title={title} subtitle={`Total outstanding ${fmtMoney(total)}`} testId={testId}>
      <ResponsiveChart height={200}>
        <BarChart data={chartData} margin={{ left: -10, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tickFormatter={(v) => fmtMoney(v)} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={60} />
          <Tooltip {...chartTip} formatter={(v) => fmtFull(v)} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {chartData.map((e) => <Cell key={e.key} fill={CHART.aging[e.key]} />)}
          </Bar>
        </BarChart>
      </ResponsiveChart>
      <div className="mt-3 max-h-40 overflow-auto no-scrollbar space-y-1">
        {aging.rows.slice(0, 8).map((r, i) => (
          <div key={i} className="flex justify-between text-sm px-1 py-1 border-b border-border/40 last:border-0">
            <span className="truncate">{r.name}</span>
            <span className="font-mono ml-2 shrink-0" style={{ color: CHART.aging[r.bucket] }}>{fmtMoney(r.amount)}</span>
          </div>
        ))}
        {aging.rows.length === 0 && <EmptyState label="Nothing outstanding" />}
      </div>
    </Panel>
  );
};

const StatementTable = ({ rows = [], cols = [] }) => (
  <div className="overflow-x-auto -mx-1 px-1 min-w-0">
    <Table className="w-full text-xs sm:text-sm">
      <TableHeader>
        <TableRow>{cols.map((c) => <TableHead key={c.k} className={`py-2 px-2.5 sm:px-4 ${c.right ? "text-right" : ""}`}>{c.h}</TableHead>)}</TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={i}>
            {cols.map((c) => (
              <TableCell key={c.k} className={`py-2 px-2.5 sm:px-4 ${c.right ? "text-right font-mono" : ""} ${c.bold ? "font-semibold" : ""}`}>
                {c.money ? fmtFull(r[c.k]) : r[c.k]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export default function CfoDashboard() {
  const { data, isLoading } = useDashboard("cfo");
  if (isLoading || !data) return <PageLoading />;
  const d = data.data;
  const pnl = d.financials.pnl;
  const bs = d.financials.balance_sheet;
  const exp = d.expenses;
  const expenseData = [
    { name: "Direct Expenses", value: exp.direct_total },
    { name: "Indirect Expenses", value: exp.indirect_total },
    { name: "Net Profit", value: Math.max(pnl.net_profit, 0) },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0" data-testid="cfo-dashboard">
      <SectionHeader title="CFO Dashboard" subtitle="Financial control, risk & capital management" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <KpiCard label="Revenue" value={pnl.revenue} tone="primary" />
        <KpiCard label="Gross Profit" value={pnl.gross_profit} tone="emerald" />
        <KpiCard label="Net Profit" value={pnl.net_profit} tone="violet" />
        <KpiCard label="Net Margin" value={`${pnl.net_margin}%`} tone="amber" isCurrency={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        <AgingBlock title="Receivables Aging" aging={d.receivables} testId="aging-chart-receivables" />
        <AgingBlock title="Payables Aging" aging={d.payables} testId="aging-chart-payables" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
        <Panel title="Cash Flow Projection" subtitle="Expected collections vs upcoming liabilities" className="lg:col-span-2 min-w-0" testId="cfo-projection-panel">
          {d.projection.length ? (
            <ResponsiveChart height={260}>
              <BarChart data={d.projection} margin={{ left: -15, right: 8, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={(v) => fmtMoney(v)} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={55} />
                <Tooltip {...chartTip} formatter={(v) => fmtFull(v)} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <Bar dataKey="collections" name="Collections" fill={CHART.receipts} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="liabilities" name="Liabilities" fill={CHART.payments} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveChart>
          ) : <EmptyState />}
        </Panel>

        <Panel title="Expense Breakdown" subtitle="Direct vs indirect vs profit" className="min-w-0" testId="cfo-expense-panel">
          {exp.direct_total + exp.indirect_total > 0 ? (
            <ResponsiveChart height={260}>
              <PieChart>
                <Pie data={expenseData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2} isAnimationActive={false}>
                  {expenseData.map((e, i) => <Cell key={i} fill={[CHART.purchases, CHART.payments, CHART.receipts][i]} />)}
                </Pie>
                <Tooltip {...chartTip} formatter={(v) => fmtFull(v)} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              </PieChart>
            </ResponsiveChart>
          ) : <EmptyState />}
        </Panel>
      </div>

      <Panel title="Financial Statement Overview" subtitle="Synced snapshots from Tally" className="min-w-0" testId="cfo-financials-panel">
        <Tabs defaultValue="pnl" className="w-full min-w-0">
          <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
            <TabsList className="h-8 sm:h-9">
              <TabsTrigger value="pnl" className="text-xs" data-testid="fin-tab-pnl">P&L Statement</TabsTrigger>
              <TabsTrigger value="bs" className="text-xs" data-testid="fin-tab-bs">Balance Sheet</TabsTrigger>
              <TabsTrigger value="tb" className="text-xs" data-testid="fin-tab-tb">Trial Balance</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="pnl" className="mt-3">
            <StatementTable
              cols={[{ k: "name", h: "Particulars" }, { k: "amount", h: "Amount", right: true, money: true }]}
              rows={[
                { name: "Revenue", amount: pnl.revenue }, { name: "Cost of Goods Sold", amount: pnl.cogs },
                { name: "Gross Profit", amount: pnl.gross_profit }, { name: "Direct Expenses", amount: pnl.direct_expenses },
                { name: "Indirect Expenses", amount: pnl.indirect_expenses }, { name: "Operating Profit", amount: pnl.operating_profit },
                { name: "Net Profit", amount: pnl.net_profit },
              ]}
            />
          </TabsContent>
          <TabsContent value="bs" className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 min-w-0">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold mb-2 text-muted-foreground">Assets</p>
              <StatementTable cols={[{ k: "name", h: "Asset" }, { k: "amount", h: "Amount", right: true, money: true }]} rows={bs.assets} />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold mb-2 text-muted-foreground">Liabilities</p>
              <StatementTable cols={[{ k: "name", h: "Liability" }, { k: "amount", h: "Amount", right: true, money: true }]} rows={bs.liabilities} />
            </div>
          </TabsContent>
          <TabsContent value="tb" className="mt-3">
            <StatementTable
              cols={[{ k: "ledger", h: "Ledger" }, { k: "debit", h: "Debit", right: true, money: true }, { k: "credit", h: "Credit", right: true, money: true }]}
              rows={d.financials.trial_balance}
            />
          </TabsContent>
        </Tabs>
      </Panel>
    </div>
  );
}
