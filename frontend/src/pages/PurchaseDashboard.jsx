import React from "react";
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
            <AreaChart data={d.monthly} margin={{ left: -15, right: 8, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="gPur" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.purchases} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={CHART.purchases} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickFormatter={(v) => fmtMoney(v)} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={55} />
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
        <Panel title="Vendor Payables" subtitle="Outstanding balances & credit days" className="min-w-0" testId="vendor-payables-panel">
          <div className="max-h-80 overflow-auto border rounded-md min-w-0">
            <Table className="min-w-[480px] text-xs sm:text-sm">
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="py-2">Vendor</TableHead>
                  <TableHead className="py-2 text-right">Outstanding</TableHead>
                  <TableHead className="py-2">Due</TableHead>
                  <TableHead className="py-2 text-right">Credit Left</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.vendor_payables.length === 0 && <TableRow><TableCell colSpan={4} className="py-6"><EmptyState /></TableCell></TableRow>}
                {d.vendor_payables.map((v, i) => (
                  <TableRow key={i} data-testid={`payable-row-${i}`}>
                    <TableCell className="max-w-[160px] truncate py-2 font-medium">{v.vendor}</TableCell>
                    <TableCell className="text-right font-mono py-2">{fmtFull(v.outstanding)}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{fmtDate(v.due_date)}</TableCell>
                    <TableCell className={`text-right font-mono py-2 ${v.credit_days_left < 0 ? "text-rose-600 dark:text-rose-400 font-semibold" : ""}`}>
                      {v.due_date ? `${v.credit_days_left}d` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                  <TableRow key={i} data-testid={`po-row-${i}`}>
                    <TableCell className="font-mono text-[11px] sm:text-xs py-2">{p.po_no}</TableCell>
                    <TableCell className="max-w-[150px] truncate py-2 font-medium">{p.vendor}</TableCell>
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
                <TableRow key={i} data-testid={`supplier-row-${i}`}>
                  <TableCell className="font-mono text-muted-foreground py-2 text-xs">{i + 1}</TableCell>
                  <TableCell className="font-medium py-2">{s.supplier}</TableCell>
                  <TableCell className="text-right font-mono py-2">{fmtFull(s.billing)}</TableCell>
                  <TableCell className="text-right font-mono py-2">{fmtFull(s.outstanding)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </div>
  );
}
