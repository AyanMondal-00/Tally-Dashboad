import React, { useState, useMemo } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { Panel, SectionHeader, KpiCard } from "@/components/shared/Widgets";
import { PageLoading, EmptyState } from "@/components/shared/States";
import { LedgerDrilldown } from "@/components/shared/LedgerDrilldown";
import { fmtMoney, fmtFull, fmtDate } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, ArrowDownToLine, ArrowUpFromLine, ChevronRight } from "lucide-react";

const typeColor = {
  Sales: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  Purchase: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  Receipt: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  Payment: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  Journal: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

export default function AccountsDashboard() {
  const { data, isLoading } = useDashboard("accounts");
  const [q, setQ] = useState("");
  const [ledger, setLedger] = useState(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const s = q.toLowerCase();
    return data.data.daybook.filter(
      (v) => !s || v.party.toLowerCase().includes(s) || v.voucher_no.toLowerCase().includes(s) || v.type.toLowerCase().includes(s)
    );
  }, [data, q]);

  if (isLoading || !data) return <PageLoading />;
  const d = data.data;
  const rp = d.rp_summary;

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0" data-testid="accounts-dashboard">
      <SectionHeader title="Accounts Dashboard" subtitle="Operational finance, daybook & ledgers" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <KpiCard label="Cash Receipts" value={rp.cash.receipts} tone="emerald" icon={ArrowDownToLine} />
        <KpiCard label="Cash Payments" value={rp.cash.payments} tone="rose" icon={ArrowUpFromLine} />
        <KpiCard label="Bank Receipts" value={rp.bank.receipts} tone="emerald" icon={ArrowDownToLine} />
        <KpiCard label="Bank Payments" value={rp.bank.payments} tone="rose" icon={ArrowUpFromLine} />
      </div>

      <Tabs defaultValue="daybook" className="w-full min-w-0">
        <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
          <TabsList className="h-8 sm:h-9">
            <TabsTrigger value="daybook" className="text-xs" data-testid="accounts-tab-daybook">Live Daybook</TabsTrigger>
            <TabsTrigger value="ledgers" className="text-xs" data-testid="accounts-tab-ledgers">Ledgers</TabsTrigger>
            <TabsTrigger value="collections" className="text-xs" data-testid="accounts-tab-collections">Pending Collections</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="daybook" className="mt-3 sm:mt-4 min-w-0">
          <Panel testId="daybook-panel" className="min-w-0">
            <div className="relative mb-3 w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input data-testid="daybook-search-input" placeholder="Search party, voucher no, type…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 h-8 sm:h-9 text-xs sm:text-sm w-full" />
            </div>
            <div className="max-h-[500px] overflow-auto border rounded-md min-w-0">
              <Table className="min-w-[550px] text-xs sm:text-sm">
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="py-2">Date</TableHead>
                    <TableHead className="py-2">Type</TableHead>
                    <TableHead className="py-2">Voucher</TableHead>
                    <TableHead className="py-2">Party</TableHead>
                    <TableHead className="py-2 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 200).map((v, i) => (
                    <TableRow key={i} data-testid={`daybook-row-${i}`}>
                      <TableCell className="whitespace-nowrap py-2">{fmtDate(v.date)}</TableCell>
                      <TableCell className="py-2"><Badge variant="secondary" className={`${typeColor[v.type]} text-[10px] sm:text-xs py-0`}>{v.type}</Badge></TableCell>
                      <TableCell className="font-mono text-[11px] sm:text-xs py-2">{v.voucher_no}</TableCell>
                      <TableCell className="max-w-[200px] truncate py-2 font-medium">{v.party}</TableCell>
                      <TableCell className="text-right font-mono py-2">{fmtFull(v.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="py-6"><EmptyState label="No vouchers match" /></TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="ledgers" className="mt-3 sm:mt-4 min-w-0">
          <Panel title="General Ledger & Party Statements" subtitle="Click a row to drill down to voucher level" className="min-w-0" testId="ledgers-panel">
            <div className="max-h-[500px] overflow-auto border rounded-md min-w-0">
              <Table className="min-w-[650px] text-xs sm:text-sm">
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="py-2">Ledger</TableHead>
                    <TableHead className="py-2">Group</TableHead>
                    <TableHead className="py-2 text-right">Opening</TableHead>
                    <TableHead className="py-2 text-right">Debit</TableHead>
                    <TableHead className="py-2 text-right">Credit</TableHead>
                    <TableHead className="py-2 text-right">Closing</TableHead>
                    <TableHead className="py-2 w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.ledgers.length === 0 && <TableRow><TableCell colSpan={7} className="py-6"><EmptyState label="No ledgers available" /></TableCell></TableRow>}
                  {d.ledgers.map((l, i) => (
                    <TableRow key={i} className="cursor-pointer hover:bg-accent/50" data-testid={`ledger-row-${i}`} onClick={() => setLedger(l)}>
                      <TableCell className="font-medium max-w-[220px] truncate py-2">{l.name}</TableCell>
                      <TableCell className="text-[11px] sm:text-xs text-muted-foreground py-2">{l.group}</TableCell>
                      <TableCell className="text-right font-mono py-2">{fmtMoney(l.opening)}</TableCell>
                      <TableCell className="text-right font-mono py-2">{fmtMoney(l.debit)}</TableCell>
                      <TableCell className="text-right font-mono py-2">{fmtMoney(l.credit)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold py-2">{fmtMoney(l.closing)}</TableCell>
                      <TableCell className="py-2 px-2 text-right"><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="collections" className="mt-3 sm:mt-4 min-w-0">
          <Panel title="Pending Collection Dashboard" subtitle="Bill-wise payment status" className="min-w-0" testId="collections-panel">
            <div className="max-h-[500px] overflow-auto border rounded-md min-w-0">
              <Table className="min-w-[550px] text-xs sm:text-sm">
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="py-2">Bill No</TableHead>
                    <TableHead className="py-2">Party</TableHead>
                    <TableHead className="py-2">Date</TableHead>
                    <TableHead className="py-2">Due</TableHead>
                    <TableHead className="py-2 text-right">Amount</TableHead>
                    <TableHead className="py-2">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.pending_collections.length === 0 && <TableRow><TableCell colSpan={6} className="py-6"><EmptyState /></TableCell></TableRow>}
                  {d.pending_collections.map((c, i) => (
                    <TableRow key={i} data-testid={`collection-row-${i}`}>
                      <TableCell className="font-mono text-[11px] sm:text-xs py-2">{c.bill_no}</TableCell>
                      <TableCell className="max-w-[180px] truncate py-2 font-medium">{c.party}</TableCell>
                      <TableCell className="py-2 whitespace-nowrap">{fmtDate(c.date)}</TableCell>
                      <TableCell className="py-2 whitespace-nowrap">{fmtDate(c.due_date)}</TableCell>
                      <TableCell className="text-right font-mono py-2">{fmtFull(c.amount)}</TableCell>
                      <TableCell className="py-2">
                        <Badge variant={c.status === "Overdue" ? "destructive" : "secondary"} className="text-[10px] sm:text-xs py-0">
                          {c.status}{c.overdue_days > 0 ? ` ${c.overdue_days}d` : ""}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>

      {ledger && <LedgerDrilldown ledgerId={ledger.id} name={ledger.name} onClose={() => setLedger(null)} />}
    </div>
  );
}
