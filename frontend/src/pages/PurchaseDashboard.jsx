import React, { useState } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { Panel, SectionHeader, KpiCard, ResponsiveChart } from "@/components/shared/Widgets";
import { PageLoading, EmptyState } from "@/components/shared/States";
import { fmtMoney, fmtFull, fmtDate, CHART } from "@/lib/format";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Package, AlertCircle } from "lucide-react";
import { LedgerDrilldown } from "@/components/shared/LedgerDrilldown";

const chartTip = {
  contentStyle: { borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 },
};
const poStatus = {
  Pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  Partial: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  Received: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
};

export default function PurchaseDashboard() {
  const { data, isLoading } = useDashboard("purchase");
  const [activeLedger, setActiveLedger] = useState(null);
  const [expandedCols, setExpandedCols] = useState({
    vendor: false,
    due: true,
    credit: true,
  });
  if (isLoading || !data) return <PageLoading />;
  const d = data.data;
  const totalPayable = d.vendor_payables.reduce((a, b) => a + b.outstanding, 0);
  const pendingPo = d.po_tracking.filter((p) => p.status !== "Received").length;

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0" data-testid="purchase-dashboard">
      <SectionHeader title="Purchase Dashboard" subtitle="Procurement, vendor management & PO tracking" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <KpiCard label="Total Purchases" value={d.total_purchases} tone="violet" icon={ShoppingBag} />
        <KpiCard label="Vendor Payables" value={totalPayable} tone="rose" icon={AlertCircle} />
        <KpiCard label="Active Vendors" value={d.vendor_wise.length} tone="primary" icon={Package} isCurrency={false} />
        <KpiCard label="Pending POs" value={pendingPo} tone="amber" icon={AlertCircle} isCurrency={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        <Panel title="Purchase Trends" subtitle="Monthly procurement volume" className="min-w-0" testId="purchase-trends-panel">
          <ResponsiveChart height={260}>
            <AreaChart data={d.monthly} margin={{ left: 10, right: 12, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="gPur" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.purchases} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={CHART.purchases} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickFormatter={(v) => fmtMoney(v)} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={72} />
              <Tooltip {...chartTip} formatter={(v) => fmtFull(v)} />
              <Area type="monotone" dataKey="amount" name="Purchases" stroke={CHART.purchases} fill="url(#gPur)" strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveChart>
        </Panel>

        <Panel title="Vendor-wise Procurement" subtitle="Top suppliers by volume" className="min-w-0" testId="purchase-vendorwise-panel">
          <ResponsiveChart height={260}>
            <BarChart data={d.vendor_wise.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 12, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => fmtMoney(v)} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis type="category" dataKey="vendor" width={95} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip {...chartTip} formatter={(v) => fmtFull(v)} />
              <Bar dataKey="amount" name="Purchases" fill={CHART.purchases} radius={[0, 4, 4, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveChart>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        <Panel
          title="Vendor Payables"
          subtitle="Outstanding balances & credit days"
          className="min-w-0"
          testId="vendor-payables-panel"
          action={
            <div className="flex items-center gap-1.5 bg-muted/60 dark:bg-muted/30 p-0.5 rounded-md border border-border/60">
              <span className="text-[10px] font-medium text-muted-foreground px-1.5">Cols:</span>
              <button
                type="button"
                onClick={() => setExpandedCols(prev => ({ ...prev, vendor: !prev.vendor }))}
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                  expandedCols.vendor
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }`}
                title="Expand / Compact Vendor Name column width"
              >
                Vendor {expandedCols.vendor ? "↔ wide" : ""}
              </button>
              <button
                type="button"
                onClick={() => setExpandedCols(prev => ({ ...prev, due: !prev.due }))}
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                  expandedCols.due
                    ? "bg-background text-foreground shadow-2xs"
                    : "bg-muted text-muted-foreground line-through opacity-60"
                }`}
                title="Toggle Due Date column visibility"
              >
                Due
              </button>
              <button
                type="button"
                onClick={() => setExpandedCols(prev => ({ ...prev, credit: !prev.credit }))}
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                  expandedCols.credit
                    ? "bg-background text-foreground shadow-2xs"
                    : "bg-muted text-muted-foreground line-through opacity-60"
                }`}
                title="Toggle Credit Left column visibility"
              >
                Credit
              </button>
            </div>
          }
        >
          {/* Scrollable container with visible horizontal and vertical scrollbar */}
          <div className="border border-border/80 rounded-lg bg-card overflow-hidden">
            <div className="max-h-80 w-full custom-scrollbar" tabIndex={0}>
              <Table wrapperClassName="overflow-visible" className="w-full min-w-[560px] text-xs sm:text-sm">
                <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-md z-10 border-b border-border shadow-2xs">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={`py-2.5 font-semibold text-foreground ${expandedCols.vendor ? "min-w-[280px]" : "min-w-[170px]"}`}>
                      Vendor Name
                    </TableHead>
                    <TableHead className="py-2.5 text-right font-semibold text-foreground min-w-[130px]">
                      Outstanding
                    </TableHead>
                    {expandedCols.due && (
                      <TableHead className="py-2.5 font-semibold text-foreground min-w-[110px]">
                        Due Date
                      </TableHead>
                    )}
                    {expandedCols.credit && (
                      <TableHead className="py-2.5 text-right font-semibold text-foreground min-w-[110px]">
                        Credit Days
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.vendor_payables.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6">
                        <EmptyState />
                      </TableCell>
                    </TableRow>
                  )}
                  {d.vendor_payables.map((v, i) => (
                    <TableRow
                      key={i}
                      data-testid={`payable-row-${i}`}
                      onClick={() => setActiveLedger({ id: v.vendor, name: v.vendor })}
                      className="cursor-pointer hover:bg-muted/60 transition-colors border-b border-border/40 last:border-0"
                      title={`Click to inspect statement for ${v.vendor}`}
                    >
                      <TableCell className={`py-2 font-medium text-primary hover:underline ${expandedCols.vendor ? "whitespace-normal break-words" : "truncate max-w-[200px]"}`}>
                        {v.vendor}
                      </TableCell>
                      <TableCell className="text-right font-mono py-2 whitespace-nowrap">
                        {fmtFull(v.outstanding)}
                      </TableCell>
                      {expandedCols.due && (
                        <TableCell className="py-2 whitespace-nowrap text-muted-foreground">
                          {fmtDate(v.due_date)}
                        </TableCell>
                      )}
                      {expandedCols.credit && (
                        <TableCell className={`text-right font-mono py-2 whitespace-nowrap ${v.credit_days_left < 0 ? "text-rose-600 dark:text-rose-400 font-semibold" : ""}`}>
                          {v.due_date ? `${v.credit_days_left}d` : "—"}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Panel>

        <Panel title="Purchase Order Tracking" subtitle="Pending & partial deliveries" className="min-w-0" testId="po-tracking-panel">
          <div className="max-h-80 overflow-auto border rounded-md min-w-0">
            <Table className="min-w-[440px] text-xs sm:text-sm">
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="py-2">PO No</TableHead>
                  <TableHead className="py-2">Vendor</TableHead>
                  <TableHead className="py-2 text-right">Amount</TableHead>
                  <TableHead className="py-2">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.po_tracking.length === 0 && <TableRow><TableCell colSpan={4} className="py-6"><EmptyState label="No PO data (add via Tally)" /></TableCell></TableRow>}
                {d.po_tracking.map((p, i) => (
                  <TableRow
                    key={i}
                    data-testid={`po-row-${i}`}
                    onClick={() => setActiveLedger({ id: p.vendor, name: p.vendor })}
                    className="cursor-pointer hover:bg-muted/60 transition-colors"
                    title={`Click to inspect statement for ${p.vendor}`}
                  >
                    <TableCell className="font-mono text-[11px] sm:text-xs py-2">{p.po_no}</TableCell>
                    <TableCell className="max-w-[150px] truncate py-2 font-medium text-primary hover:underline">{p.vendor}</TableCell>
                    <TableCell className="text-right font-mono py-2">{fmtFull(p.amount)}</TableCell>
                    <TableCell className="py-2"><Badge variant="secondary" className={`${poStatus[p.status]} text-[10px] sm:text-xs py-0`}>{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </div>

      <Panel title="Supplier Analysis" subtitle="Rankings by billing value & outstanding" className="min-w-0" testId="supplier-analysis-panel">
        <div className="max-h-96 overflow-auto border rounded-md min-w-0">
          <Table className="min-w-[480px] text-xs sm:text-sm">
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="py-2 w-10">#</TableHead>
                <TableHead className="py-2">Supplier</TableHead>
                <TableHead className="py-2 text-right">Total Billing</TableHead>
                <TableHead className="py-2 text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.supplier_analysis.map((s, i) => (
                <TableRow
                  key={i}
                  data-testid={`supplier-row-${i}`}
                  onClick={() => setActiveLedger({ id: s.supplier, name: s.supplier })}
                  className="cursor-pointer hover:bg-muted/60 transition-colors"
                  title={`Click to inspect statement for ${s.supplier}`}
                >
                  <TableCell className="font-mono text-muted-foreground py-2 text-xs">{i + 1}</TableCell>
                  <TableCell className="font-medium py-2 text-primary hover:underline">{s.supplier}</TableCell>
                  <TableCell className="text-right font-mono py-2">{fmtFull(s.billing)}</TableCell>
                  <TableCell className="text-right font-mono py-2">{fmtFull(s.outstanding)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>

      {/* Ledger Drilldown Modal */}
      {activeLedger && (
        <LedgerDrilldown
          ledgerId={activeLedger.id}
          name={activeLedger.name}
          onClose={() => setActiveLedger(null)}
        />
      )}
    </div>
  );
}
