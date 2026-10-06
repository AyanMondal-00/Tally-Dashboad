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
      <DialogContent className="w-[95vw] max-w-3xl max-h-[88vh] p-4 sm:p-6 overflow-hidden flex flex-col min-w-0" data-testid="ledger-drilldown-dialog">
        <DialogHeader className="pb-2">
          <DialogTitle className="font-display flex flex-wrap items-center gap-2 text-base sm:text-lg">
            <span className="truncate">{name}</span>
            {stmt && <Badge variant="outline" className="font-normal text-xs">{stmt.group}</Badge>}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
        ) : stmt ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
              <div className="rounded-md bg-muted/60 p-2.5 sm:p-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Opening Balance</p>
                <p className="font-mono font-semibold text-sm sm:text-base mt-0.5">{fmtFull(stmt.opening)}</p>
              </div>
              <div className="rounded-md bg-muted/60 p-2.5 sm:p-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Closing Balance</p>
                <p className="font-mono font-semibold text-sm sm:text-base mt-0.5">{fmtFull(stmt.closing)}</p>
              </div>
            </div>
            <div className="overflow-auto flex-1 border rounded-md mt-2 min-w-0">
              <Table className="min-w-[520px] text-xs sm:text-sm">
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="py-2">Date</TableHead>
                    <TableHead className="py-2">Voucher</TableHead>
                    <TableHead className="py-2">Type</TableHead>
                    <TableHead className="py-2 text-right">Debit</TableHead>
                    <TableHead className="py-2 text-right">Credit</TableHead>
                    <TableHead className="py-2 text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stmt.transactions.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No transactions found for this ledger</TableCell></TableRow>
                  )}
                  {stmt.transactions.map((t, i) => (
                    <TableRow key={i} data-testid={`ledger-txn-row-${i}`}>
                      <TableCell className="whitespace-nowrap py-2">{fmtDate(t.date)}</TableCell>
                      <TableCell className="font-mono text-[11px] sm:text-xs py-2">{t.voucher_no}</TableCell>
                      <TableCell className="py-2">{t.voucher_type}</TableCell>
                      <TableCell className="text-right font-mono py-2">{t.debit ? fmtFull(t.debit) : "—"}</TableCell>
                      <TableCell className="text-right font-mono py-2">{t.credit ? fmtFull(t.credit) : "—"}</TableCell>
                      <TableCell className="text-right font-mono font-semibold py-2">{fmtFull(t.balance)}</TableCell>
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
