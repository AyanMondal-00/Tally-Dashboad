import React, { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UploadCloud, RotateCcw, FileCode2, Loader2, Info, RefreshCw, Plug, PlugZap, CheckCircle2,
} from "lucide-react";
import { uploadTally, resetDemo, disconnectTally } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { toast } from "sonner";

export const UploadDialog = ({ open, onOpenChange }) => {
  const { companies, refreshCompanies, setCompanyId } = useApp();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();
  const modeRef = useRef("merge");

  const tally = companies.find((c) => c.source === "Tally Import");
  const connected = !!tally;

  const applyUpdate = async (companyId) => {
    await refreshCompanies();
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["ledger"] });
    setCompanyId(companyId);
  };

  const handleFile = async (file) => {
    if (!file) return;
    const mode = modeRef.current;
    const wasConnected = connected;
    setBusy(true);
    try {
      const res = await uploadTally(file, mode);
      await applyUpdate(res.company_id);
      let desc = "";
      if (res.total_vouchers > 0) {
        desc = mode === "merge" && wasConnected
          ? `${res.new_vouchers} new · ${res.total_vouchers} total vouchers. Dashboards updated.`
          : `${res.total_vouchers} vouchers loaded. Dashboards updated.`;
      } else {
        desc = `${res.total_ledgers || 0} ledger masters loaded. (Export Day Book for sales & transaction charts).`;
      }
      toast.success(wasConnected ? "Tally data refreshed" : "Tally connected", { description: desc });
    } catch (e) {
      toast.error("Sync failed", { description: e?.response?.data?.detail || "Invalid file" });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const pick = (mode) => {
    modeRef.current = mode;
    inputRef.current?.click();
  };

  const handleReset = async () => {
    setBusy(true);
    try {
      await resetDemo();
      const list = await refreshCompanies();
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (list && list[0]) setCompanyId(list[0].id);
      toast.success("Demo data restored");
      onOpenChange(false);
    } catch (e) {
      toast.error("Could not reset demo data");
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await disconnectTally();
      const list = await refreshCompanies();
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (list && list[0]) setCompanyId(list[0].id);
      toast.success("Tally company disconnected");
    } catch (e) {
      toast.error("Could not disconnect");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[520px] max-h-[90vh] overflow-y-auto p-4 sm:p-6" data-testid="upload-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-base sm:text-lg">
            <PlugZap className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-blue-600" /> Tally Sync Manager
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Load your data from a Tally XML export, then hit Refresh with the latest export any time to update every dashboard.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef} type="file" accept=".xml" className="hidden"
          data-testid="upload-file-input"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {connected ? (
          <div className="space-y-3 sm:space-y-4" data-testid="sync-connected-state">
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/20 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold truncate">{tally?.name}</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground truncate">Connected · updates on every refresh</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-[10px] sm:text-xs shrink-0" data-testid="sync-voucher-count">
                  {tally?.voucher_count > 0 ? `${tally.voucher_count} vouchers` : `${tally?.ledger_count || 0} ledgers`}
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-2.5">Last sync: <span className="font-mono">{tally?.last_sync}</span></p>
            </div>

            <Button
              className="w-full h-10 sm:h-11 text-sm sm:text-base font-medium" disabled={busy}
              data-testid="refresh-tally-button" onClick={() => pick("merge")}
            >
              {busy ? <Loader2 className="h-4.5 w-4.5 mr-2 animate-spin" /> : <RefreshCw className="h-4.5 w-4.5 mr-2" />}
              Refresh — Load Latest Tally XML
            </Button>
            <p className="text-[11px] sm:text-xs text-muted-foreground -mt-1 text-center">
              New & updated vouchers are merged automatically (deduped by voucher no).
            </p>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-9 sm:h-10 text-xs sm:text-sm" disabled={busy}
                data-testid="full-reload-button" onClick={() => pick("replace")}>
                <UploadCloud className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" /> Full Reload
              </Button>
              <Button variant="outline" className="flex-1 h-9 sm:h-10 text-xs sm:text-sm text-rose-600 hover:text-rose-700" disabled={busy}
                data-testid="disconnect-tally-button" onClick={handleDisconnect}>
                <Plug className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" /> Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); modeRef.current = "merge"; handleFile(e.dataTransfer.files[0]); }}
            onClick={() => pick("merge")}
            data-testid="upload-dropzone"
            className={`cursor-pointer rounded-lg border-2 border-dashed p-6 sm:p-8 text-center transition-colors ${
              dragOver ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-border hover:border-blue-400"
            }`}
          >
            {busy ? <Loader2 className="h-7 w-7 sm:h-8 sm:w-8 mx-auto text-blue-600 animate-spin" />
                  : <FileCode2 className="h-7 w-7 sm:h-8 sm:w-8 mx-auto text-blue-600" />}
            <p className="mt-2.5 text-xs sm:text-sm font-medium">Connect Tally — drop your XML export here</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">Daybook / Master export (.xml)</p>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
          <span>
            In Tally: <b>Gateway → Display → Daybook → Export (Alt+E) → format XML</b>. Export the latest period each
            time and hit Refresh — the app re-computes all 5 dashboards from your vouchers.
          </span>
        </div>

        <Button variant="ghost" className="w-full text-muted-foreground" disabled={busy}
          data-testid="reset-demo-data-button" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" /> Restore Sample Demo Data
        </Button>
      </DialogContent>
    </Dialog>
  );
};
