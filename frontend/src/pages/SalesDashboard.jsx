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

const chartTip = {
  contentStyle: { borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 },
};
const soStatus = {
  Open: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  Partial: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  Backorder: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

const HBar = ({ rows, nameKey, color }) => (
  <ResponsiveChart height={280}>
    <BarChart data={rows.slice(0, 8)} layout="vertical" margin={{ left: 20, right: 12 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
      <XAxis type="number" tickFormatter={(v) => fmtMoney(v)} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
      <YAxis type="category" dataKey={nameKey} width={110} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
      <Tooltip {...chartTip} formatter={(v) => fmtFull(v)} />
      <Bar dataKey="value" name="Revenue" fill={color} radius={[0, 4, 4, 0]} isAnimationActive={false} />
    </BarChart>
  </ResponsiveChart>
);

export default function SalesDashboard() {
  const { data, isLoading } = useDashboard("sales");
  if (isLoading || !data) return <PageLoading />;
  const d = data.data;
  const openOrders = d.pending_orders.length;
  const repDeals = d.by_rep.reduce((a, b) => a + (b.deals || 0), 0);

  return (
    <div className="space-y-6" data-testid="sales-dashboard">
      <SectionHeader title="Sales Dashboard" subtitle="Revenue performance, pipelines & field force" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Net Sales" value={d.net_sales} tone="primary" icon={TrendingUp} />
        <KpiCard label="Open Orders" value={openOrders} tone="amber" icon={ClipboardList} isCurrency={false} />
        <KpiCard label="Sales Reps" value={d.by_rep.length} tone="violet" icon={MapPin} isCurrency={false} />
        <KpiCard label="Deals Closed" value={repDeals} tone="emerald" icon={Repeat} isCurrency={false} />
      </div>

      <Panel title="Sales Performance Analytics" subtitle="Revenue split across dimensions" testId="sales-performance-panel">
        <Tabs defaultValue="customer">
          <TabsList>
            <TabsTrigger value="customer" data-testid="sales-tab-customer">By Customer</TabsTrigger>
            <TabsTrigger value="item" data-testid="sales-tab-item">By Item</TabsTrigger>
            <TabsTrigger value="group" data-testid="sales-tab-group">By Group</TabsTrigger>
            <TabsTrigger value="region" data-testid="sales-tab-region">By Region</TabsTrigger>
            <TabsTrigger value="rep" data-testid="sales-tab-rep">By Rep</TabsTrigger>
          </TabsList>
          <TabsContent value="customer" className="mt-3">{d.by_customer.length ? <HBar rows={d.by_customer} nameKey="name" color={CHART.sales} /> : <EmptyState />}</TabsContent>
          <TabsContent value="item" className="mt-3">{d.by_item.length ? <HBar rows={d.by_item} nameKey="name" color={CHART.purchases} /> : <EmptyState label="No item data" />}</TabsContent>
          <TabsContent value="group" className="mt-3">
            {d.by_group.length ? (
              <ResponsiveChart height={280}>
                <PieChart>
                  <Pie data={d.by_group} dataKey="value" nameKey="name" outerRadius={100} label={(e) => e.name} isAnimationActive={false}>
                    {d.by_group.map((e, i) => <Cell key={i} fill={CHART.palette[i % CHART.palette.length]} />)}
                  </Pie>
                  <Tooltip {...chartTip} formatter={(v) => fmtFull(v)} />
                </PieChart>
              </ResponsiveChart>
            ) : <EmptyState label="No stock group data" />}
          </TabsContent>
          <TabsContent value="region" className="mt-3">
            {d.by_region.length ? (
              <ResponsiveChart height={280}>
                <BarChart data={d.by_region} margin={{ left: -10, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickFormatter={(v) => fmtMoney(v)} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={64} />
                  <Tooltip {...chartTip} formatter={(v) => fmtFull(v)} />
                  <Bar dataKey="value" name="Revenue" fill={CHART.receipts} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveChart>
            ) : <EmptyState label="No region data" />}
          </TabsContent>
          <TabsContent value="rep" className="mt-3">{d.by_rep.length ? <HBar rows={d.by_rep} nameKey="name" color={CHART.nwc} /> : <EmptyState label="No rep data" />}</TabsContent>
        </Tabs>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Pending Sales Orders" subtitle="Open, partial & backorders" testId="pending-orders-panel">
          <div className="max-h-80 overflow-auto border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow><TableHead>SO No</TableHead><TableHead>Customer</TableHead><TableHead>Delivery</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {d.pending_orders.length === 0 && <TableRow><TableCell colSpan={5}><EmptyState label="No pending orders" /></TableCell></TableRow>}
                {d.pending_orders.map((o, i) => (
                  <TableRow key={i} data-testid={`so-row-${i}`}>
                    <TableCell className="font-mono text-xs">{o.so_no}</TableCell>
                    <TableCell className="max-w-[140px] truncate">{o.customer}</TableCell>
                    <TableCell>{fmtDate(o.delivery_date)}</TableCell>
                    <TableCell className="text-right font-mono">{fmtFull(o.amount)}</TableCell>
                    <TableCell><Badge variant="secondary" className={soStatus[o.status]}>{o.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>

        <Panel title="Customer Buying Patterns" subtitle="Frequency & upsell opportunities" testId="buying-patterns-panel">
          <div className="max-h-80 overflow-auto space-y-2">
            {d.buying_patterns.length === 0 && <EmptyState />}
            {d.buying_patterns.map((b, i) => (
              <div key={i} className="rounded-md border border-border p-3" data-testid={`pattern-row-${i}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{b.customer}</span>
                  <Badge variant={b.flag === "Upsell" ? "default" : "secondary"}>{b.flag}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Buys <b>{b.top_item}</b> · {b.frequency}×/yr · last {fmtDate(b.last_purchase)}
                </p>
                <p className="text-xs text-blue-600 mt-0.5">→ Suggest: {b.upsell}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Sales Force Automation (SFA)" subtitle="Field rep GPS check-ins & visit logs" testId="sfa-panel">
        <div className="max-h-96 overflow-auto border rounded-md">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow><TableHead>Rep</TableHead><TableHead>Client</TableHead><TableHead>Check-in</TableHead><TableHead>Check-out</TableHead><TableHead>Location</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {d.sfa.length === 0 && <TableRow><TableCell colSpan={7}><EmptyState label="No field visits logged" /></TableCell></TableRow>}
              {d.sfa.map((s, i) => (
                <TableRow key={i} data-testid={`sfa-row-${i}`}>
                  <TableCell className="font-medium whitespace-nowrap">{s.rep}</TableCell>
                  <TableCell className="max-w-[130px] truncate">{s.client}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{s.checkin}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{s.checkout}</TableCell>
                  <TableCell className="text-xs font-mono flex items-center gap-1"><MapPin className="h-3 w-3 text-blue-600" />{s.location}</TableCell>
                  <TableCell><Badge variant={s.status === "Completed" ? "secondary" : "default"}>{s.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{s.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </div>
  );
}
