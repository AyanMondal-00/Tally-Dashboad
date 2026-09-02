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
    <div className="space-y-6" data-testid="purchase-dashboard">
      <SectionHeader title="Purchase Dashboard" subtitle="Procurement, vendor management & PO tracking" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Purchases" value={d.total_purchases} tone="violet" icon={ShoppingBag} />
        <KpiCard label="Vendor Payables" value={totalPayable} tone="rose" icon={AlertCircle} />
        <KpiCard label="Active Vendors" value={d.vendor_wise.length} tone="primary" icon={Package} isCurrency={false} />
        <KpiCard label="Pending POs" value={pendingPo} tone="amber" icon={AlertCircle} isCurrency={false} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Purchase Trends" subtitle="Monthly procurement volume" testId="purchase-trends-panel">
          <ResponsiveChart height={260}>
            <AreaChart data={d.monthly} margin={{ left: -10, right: 8 }}>
              <defs>
                <linearGradient id="gPur" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.purchases} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={CHART.purchases} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickFormatter={(v) => fmtMoney(v)} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={64} />
              <Tooltip {...chartTip} formatter={(v) => fmtFull(v)} />
              <Area type="monotone" dataKey="amount" name="Purchases" stroke={CHART.purchases} fill="url(#gPur)" strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveChart>
        </Panel>

        <Panel title="Vendor-wise Procurement" subtitle="Top suppliers by volume" testId="purchase-vendorwise-panel">
          <ResponsiveChart height={260}>
            <BarChart data={d.vendor_wise.slice(0, 8)} layout="vertical" margin={{ left: 20, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => fmtMoney(v)} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis type="category" dataKey="vendor" width={110} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip {...chartTip} formatter={(v) => fmtFull(v)} />
              <Bar dataKey="amount" name="Purchases" fill={CHART.purchases} radius={[0, 4, 4, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveChart>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Vendor Payables" subtitle="Outstanding balances & credit days" testId="vendor-payables-panel">
          <div className="max-h-80 overflow-auto border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow><TableHead>Vendor</TableHead><TableHead className="text-right">Outstanding</TableHead><TableHead>Due</TableHead><TableHead className="text-right">Credit Left</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {d.vendor_payables.length === 0 && <TableRow><TableCell colSpan={4}><EmptyState /></TableCell></TableRow>}
                {d.vendor_payables.map((v, i) => (
                  <TableRow key={i} data-testid={`payable-row-${i}`}>
                    <TableCell className="max-w-[160px] truncate">{v.vendor}</TableCell>
                    <TableCell className="text-right font-mono">{fmtFull(v.outstanding)}</TableCell>
                    <TableCell>{fmtDate(v.due_date)}</TableCell>
                    <TableCell className={`text-right font-mono ${v.credit_days_left < 0 ? "text-rose-600" : ""}`}>
                      {v.due_date ? `${v.credit_days_left}d` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>

        <Panel title="Purchase Order Tracking" subtitle="Pending & partial deliveries" testId="po-tracking-panel">
          <div className="max-h-80 overflow-auto border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow><TableHead>PO No</TableHead><TableHead>Vendor</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {d.po_tracking.length === 0 && <TableRow><TableCell colSpan={4}><EmptyState label="No PO data (add via Tally)" /></TableCell></TableRow>}
                {d.po_tracking.map((p, i) => (
                  <TableRow key={i} data-testid={`po-row-${i}`}>
                    <TableCell className="font-mono text-xs">{p.po_no}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{p.vendor}</TableCell>
                    <TableCell className="text-right font-mono">{fmtFull(p.amount)}</TableCell>
                    <TableCell><Badge variant="secondary" className={poStatus[p.status]}>{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </div>

      <Panel title="Supplier Analysis" subtitle="Rankings by billing value & outstanding" testId="supplier-analysis-panel">
        <div className="max-h-96 overflow-auto border rounded-md">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow><TableHead>#</TableHead><TableHead>Supplier</TableHead><TableHead className="text-right">Total Billing</TableHead><TableHead className="text-right">Outstanding</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {d.supplier_analysis.map((s, i) => (
                <TableRow key={i} data-testid={`supplier-row-${i}`}>
                  <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{s.supplier}</TableCell>
                  <TableCell className="text-right font-mono">{fmtFull(s.billing)}</TableCell>
                  <TableCell className="text-right font-mono">{fmtFull(s.outstanding)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </div>
  );
}
