import React, { useState } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { Panel, SectionHeader, KpiCard, ResponsiveChart } from "@/components/shared/Widgets";
import { PageLoading, EmptyState } from "@/components/shared/States";
import { fmtMoney, fmtFull, fmtDate, CHART } from "@/lib/format";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TrendingUp, ClipboardList, MapPin, Repeat } from "lucide-react";
import { LedgerDrilldown } from "@/components/shared/LedgerDrilldown";

const chartTip = {
  contentStyle: { borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 },
};
const soStatus = {
  Open: "bg-blue-100 text-blue-700 dark:bg-amber-950/50 dark:text-blue-300",
  Partial: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  Backorder: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

const HBar = ({ rows = [], nameKey = "name", color, onRowClick }) => (
  <ResponsiveChart height={260}>
    <BarChart data={rows.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 12, top: 10, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
      <XAxis type="number" tickFormatter={(v) => fmtMoney(v)} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
      <YAxis type="category" dataKey={nameKey} width={95} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
      <Tooltip {...chartTip} formatter={(v) => fmtFull(v)} />
      <Bar
        dataKey="value"
        name="Revenue"
        fill={color}
        radius={[0, 4, 4, 0]}
        isAnimationActive={false}
        onClick={(entry) => onRowClick && onRowClick(entry)}
        className={onRowClick ? "cursor-pointer" : ""}
      />
    </BarChart>
  </ResponsiveChart>
);

export default function SalesDashboard() {
  const { data, isLoading } = useDashboard("sales");
  const [activeLedger, setActiveLedger] = useState(null);
  if (isLoading || !data) return <PageLoading />;
  const d = data.data;
  const openOrders = d.pending_orders.length;
  const repDeals = d.by_rep.reduce((a, b) => a + (b.deals || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0" data-testid="sales-dashboard">
      <SectionHeader title="Sales Dashboard" subtitle="Revenue performance, pipelines & field force" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <KpiCard label="Net Sales" value={d.net_sales} tone="primary" icon={TrendingUp} />
        <KpiCard label="Open Orders" value={openOrders} tone="amber" icon={ClipboardList} isCurrency={false} />
        <KpiCard label="Sales Reps" value={d.by_rep.length} tone="violet" icon={MapPin} isCurrency={false} />
        <KpiCard label="Deals Closed" value={repDeals} tone="emerald" icon={Repeat} isCurrency={false} />
      </div>

      <Panel title="Sales Performance Analytics" subtitle="Revenue split across dimensions" className="min-w-0" testId="sales-performance-panel">
        <Tabs defaultValue="customer" className="w-full min-w-0">
          <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
            <TabsList className="h-8 sm:h-9">
              <TabsTrigger value="customer" className="text-xs" data-testid="sales-tab-customer">By Customer</TabsTrigger>
              <TabsTrigger value="item" className="text-xs" data-testid="sales-tab-item">By Item</TabsTrigger>
              <TabsTrigger value="group" className="text-xs" data-testid="sales-tab-group">By Group</TabsTrigger>
              <TabsTrigger value="region" className="text-xs" data-testid="sales-tab-region">By Region</TabsTrigger>
              <TabsTrigger value="rep" className="text-xs" data-testid="sales-tab-rep">By Rep</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="customer" className="mt-3 min-w-0">
            {d.by_customer.length ? (
              <HBar
                rows={d.by_customer}
                nameKey="name"
                color={CHART.sales}
                onRowClick={(entry) => {
                  const custName = entry?.name || entry?.payload?.name;
                  if (custName) setActiveLedger({ id: custName, name: custName });
                }}
              />
            ) : <EmptyState />}
          </TabsContent>
          <TabsContent value="item" className="mt-3 min-w-0">{d.by_item.length ? <HBar rows={d.by_item} nameKey="name" color={CHART.purchases} /> : <EmptyState label="No item data" />}</TabsContent>
          <TabsContent value="group" className="mt-3 min-w-0">
            {d.by_group.length ? (
              <ResponsiveChart height={260}>
                <PieChart>
                  <Pie data={d.by_group} dataKey="value" nameKey="name" outerRadius={90} label={(e) => e.name} isAnimationActive={false}>
                    {d.by_group.map((e, i) => <Cell key={i} fill={CHART.palette[i % CHART.palette.length]} />)}
                  </Pie>
                  <Tooltip {...chartTip} formatter={(v) => fmtFull(v)} />
                </PieChart>
              </ResponsiveChart>
            ) : <EmptyState label="No stock group data" />}
          </TabsContent>
          <TabsContent value="region" className="mt-3 min-w-0">
            {d.by_region.length ? (
              <ResponsiveChart height={260}>
                <BarChart data={d.by_region} margin={{ left: 10, right: 12, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickFormatter={(v) => fmtMoney(v)} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={72} />
                  <Tooltip {...chartTip} formatter={(v) => fmtFull(v)} />
                  <Bar dataKey="value" name="Revenue" fill={CHART.receipts} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveChart>
            ) : <EmptyState label="No region data" />}
          </TabsContent>
          <TabsContent value="rep" className="mt-3 min-w-0">{d.by_rep.length ? <HBar rows={d.by_rep} nameKey="name" color={CHART.nwc} /> : <EmptyState label="No rep data" />}</TabsContent>
        </Tabs>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        <Panel title="Pending Sales Orders" subtitle="Open, partial & backorders" className="min-w-0" testId="pending-orders-panel">
          <div className="max-h-80 overflow-auto border rounded-md min-w-0">
            <Table className="min-w-[460px] text-xs sm:text-sm">
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="py-2">SO No</TableHead>
                  <TableHead className="py-2">Customer</TableHead>
                  <TableHead className="py-2">Delivery</TableHead>
                  <TableHead className="py-2 text-right">Amount</TableHead>
                  <TableHead className="py-2">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.pending_orders.length === 0 && <TableRow><TableCell colSpan={5} className="py-6"><EmptyState label="No pending orders" /></TableCell></TableRow>}
                {d.pending_orders.map((o, i) => (
                  <TableRow
                    key={i}
                    data-testid={`so-row-${i}`}
                    onClick={() => setActiveLedger({ id: o.customer, name: o.customer })}
                    className="cursor-pointer hover:bg-muted/60 transition-colors"
                    title={`Click to inspect statement for ${o.customer}`}
                  >
                    <TableCell className="font-mono text-[11px] sm:text-xs py-2">{o.so_no}</TableCell>
                    <TableCell className="max-w-[140px] truncate py-2 font-medium text-primary hover:underline">{o.customer}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{fmtDate(o.delivery_date)}</TableCell>
                    <TableCell className="text-right font-mono py-2">{fmtFull(o.amount)}</TableCell>
                    <TableCell className="py-2"><Badge variant="secondary" className={`${soStatus[o.status]} text-[10px] sm:text-xs py-0`}>{o.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>

        <Panel title="Customer Buying Patterns" subtitle="Frequency & upsell opportunities" className="min-w-0" testId="buying-patterns-panel">
          <div className="max-h-80 overflow-auto space-y-2">
            {d.buying_patterns.length === 0 && <EmptyState />}
            {d.buying_patterns.map((b, i) => (
              <div
                key={i}
                className="rounded-md border border-border p-2.5 sm:p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                data-testid={`pattern-row-${i}`}
                onClick={() => setActiveLedger({ id: b.customer, name: b.customer })}
                title={`Click to inspect statement for ${b.customer}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-medium truncate text-primary hover:underline">{b.customer}</span>
                  <Badge variant={b.flag === "Upsell" ? "default" : "secondary"} className="text-[10px] sm:text-xs shrink-0">{b.flag}</Badge>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                  Buys <b>{b.top_item}</b> · {b.frequency}×/yr · last {fmtDate(b.last_purchase)}
                </p>
                <p className="text-[11px] sm:text-xs text-blue-600 dark:text-blue-400 mt-0.5">→ Suggest: {b.upsell}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Sales Force Automation (SFA)" subtitle="Field rep GPS check-ins & visit logs" className="min-w-0" testId="sfa-panel">
        <div className="max-h-96 overflow-auto border rounded-md min-w-0">
          <Table className="min-w-[650px] text-xs sm:text-sm">
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="py-2">Rep</TableHead>
                <TableHead className="py-2">Client</TableHead>
                <TableHead className="py-2">Check-in</TableHead>
                <TableHead className="py-2">Check-out</TableHead>
                <TableHead className="py-2">Location</TableHead>
                <TableHead className="py-2">Status</TableHead>
                <TableHead className="py-2">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.sfa.length === 0 && <TableRow><TableCell colSpan={7} className="py-6"><EmptyState label="No field visits logged" /></TableCell></TableRow>}
              {d.sfa.map((s, i) => (
                <TableRow key={i} data-testid={`sfa-row-${i}`}>
                  <TableCell className="font-medium whitespace-nowrap py-2">{s.rep}</TableCell>
                  <TableCell className="max-w-[130px] truncate py-2">{s.client}</TableCell>
                  <TableCell className="text-[11px] sm:text-xs whitespace-nowrap py-2">{s.checkin}</TableCell>
                  <TableCell className="text-[11px] sm:text-xs whitespace-nowrap py-2">{s.checkout}</TableCell>
                  <TableCell className="text-[11px] sm:text-xs font-mono py-2 whitespace-nowrap"><span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-blue-600 shrink-0" />{s.location}</span></TableCell>
                  <TableCell className="py-2"><Badge variant={s.status === "Completed" ? "secondary" : "default"} className="text-[10px] sm:text-xs py-0">{s.status}</Badge></TableCell>
                  <TableCell className="text-[11px] sm:text-xs text-muted-foreground max-w-[200px] truncate py-2">{s.notes}</TableCell>
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
