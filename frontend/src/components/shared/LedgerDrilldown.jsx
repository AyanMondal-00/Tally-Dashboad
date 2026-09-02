import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLedger } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { fmtFull, fmtDate } from "@/lib/format";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const LedgerDrilldown = ({ ledgerId, name, onClose }) => {
  const { companyId } = useApp();
  const { data, isLoading } = useQuery({
    queryKey: ["ledger", ledgerId, companyId],
    queryFn: () => getLedger(ledgerId, companyId),
    enabled: !!ledgerId,
  });
  const stmt = data?.statement;

  return (
    <Dialog open={!!ledgerId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" data-testid="ledger-drilldown-dialog">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            {name}
            {stmt && <Badge variant="outline" className="font-normal">{stmt.group}</Badge>}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
        ) : stmt ? (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-muted/60 p-3">
                <p className="text-xs text-muted-foreground">Opening Balance</p>
                <p className="font-mono font-semibold">{fmtFull(stmt.opening)}</p>
              </div>
              <div className="rounded-md bg-muted/60 p-3">
                <p className="text-xs text-muted-foreground">Closing Balance</p>
                <p className="font-mono font-semibold">{fmtFull(stmt.closing)}</p>
              </div>
            </div>
            <div className="overflow-auto flex-1 border rounded-md mt-2">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Voucher</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stmt.transactions.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No transactions</TableCell></TableRow>
                  )}
                  {stmt.transactions.map((t, i) => (
                    <TableRow key={i} data-testid={`ledger-txn-row-${i}`}>
                      <TableCell className="whitespace-nowrap">{fmtDate(t.date)}</TableCell>
                      <TableCell className="font-mono text-xs">{t.voucher_no}</TableCell>
                      <TableCell>{t.voucher_type}</TableCell>
                      <TableCell className="text-right font-mono">{t.debit ? fmtFull(t.debit) : "—"}</TableCell>
                      <TableCell className="text-right font-mono">{t.credit ? fmtFull(t.credit) : "—"}</TableCell>
                      <TableCell className="text-right font-mono font-medium">{fmtFull(t.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
