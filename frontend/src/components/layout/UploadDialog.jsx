import React, { useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, RotateCcw, FileCode2, CheckCircle2, Loader2, Info } from "lucide-react";
import { uploadTally, resetDemo } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { toast } from "sonner";

export const UploadDialog = ({ open, onOpenChange }) => {
  const { refreshCompanies, setCompanyId } = useApp();
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await uploadTally(file);
      await refreshCompanies();
      setCompanyId(res.company_id);
      toast.success(`Imported ${res.vouchers} vouchers from Tally`, {
        description: "Switched to the imported company view.",
      });
      onOpenChange(false);
    } catch (e) {
      toast.error("Upload failed", { description: e?.response?.data?.detail || "Invalid file" });
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setBusy(true);
    try {
      await resetDemo();
      const list = await refreshCompanies();
      if (list && list[0]) setCompanyId(list[0].id);
      toast.success("Demo data restored");
      onOpenChange(false);
    } catch (e) {
      toast.error("Could not reset demo data");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]" data-testid="upload-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <UploadCloud className="h-5 w-5 text-blue-600" /> Tally Sync Manager
          </DialogTitle>
          <DialogDescription>
            Upload a Tally ERP 9 / TallyPrime XML export, or restore the sample dataset.
          </DialogDescription>
        </DialogHeader>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current?.click()}
          data-testid="upload-dropzone"
          className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            dragOver ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-border hover:border-blue-400"
          }`}
        >
          <input
            ref={inputRef} type="file" accept=".xml" className="hidden"
            data-testid="upload-file-input"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {busy ? (
            <Loader2 className="h-8 w-8 mx-auto text-blue-600 animate-spin" />
          ) : (
            <FileCode2 className="h-8 w-8 mx-auto text-blue-600" />
          )}
          <p className="mt-3 text-sm font-medium">Drop your Tally XML here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">Daybook / Voucher export (.xml)</p>
        </div>

        <div className="flex items-start gap-2 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
          <span>
            In Tally: <b>Display → Daybook → Export (Alt+E) → XML</b>. The importer reads vouchers and
            rebuilds sales, purchase, collection & outstanding views automatically.
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Button
            data-testid="reset-demo-data-button"
            variant="outline" className="flex-1" disabled={busy} onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4 mr-2" /> Restore Demo Data
          </Button>
          <Button
            className="flex-1" disabled={busy} onClick={() => inputRef.current?.click()}
          >
            <UploadCloud className="h-4 w-4 mr-2" /> Choose File
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
