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
      const desc = mode === "merge" && wasConnected
        ? `${res.new_vouchers} new · ${res.total_vouchers} total vouchers. Dashboards updated.`
        : `${res.total_vouchers} vouchers loaded. Dashboards updated.`;
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
      <DialogContent className="sm:max-w-[540px]" data-testid="upload-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <PlugZap className="h-5 w-5 text-blue-600" /> Tally Sync Manager
          </DialogTitle>
          <DialogDescription>
            Load your data from a Tally XML export, then hit Refresh with the latest export any time to update every dashboard.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef} type="file" accept=".xml" className="hidden"
          data-testid="upload-file-input"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {connected ? (
          <div className="space-y-4" data-testid="sync-connected-state">
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold">{tally?.name}</p>
                    <p className="text-xs text-muted-foreground">Connected · updates on every refresh</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-emerald-300 text-emerald-700" data-testid="sync-voucher-count">
                  {tally?.voucher_count} vouchers
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Last sync: <span className="font-mono">{tally?.last_sync}</span></p>
            </div>

            <Button
              className="w-full h-11 text-base" disabled={busy}
              data-testid="refresh-tally-button" onClick={() => pick("merge")}
            >
              {busy ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <RefreshCw className="h-5 w-5 mr-2" />}
              Refresh — Load Latest Tally XML
            </Button>
            <p className="text-xs text-muted-foreground -mt-2 text-center">
              New & updated vouchers are merged automatically (deduped by voucher no).
            </p>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" disabled={busy}
                data-testid="full-reload-button" onClick={() => pick("replace")}>
                <UploadCloud className="h-4 w-4 mr-2" /> Full Reload
              </Button>
              <Button variant="outline" className="flex-1 text-rose-600 hover:text-rose-700" disabled={busy}
                data-testid="disconnect-tally-button" onClick={handleDisconnect}>
                <Plug className="h-4 w-4 mr-2" /> Disconnect
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
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              dragOver ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-border hover:border-blue-400"
            }`}
          >
            {busy ? <Loader2 className="h-8 w-8 mx-auto text-blue-600 animate-spin" />
                  : <FileCode2 className="h-8 w-8 mx-auto text-blue-600" />}
            <p className="mt-3 text-sm font-medium">Connect Tally — drop your first XML export here</p>
            <p className="text-xs text-muted-foreground mt-1">Daybook / Voucher export (.xml)</p>
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
