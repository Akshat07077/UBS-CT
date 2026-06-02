"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EXPORT_DATASETS, type ExportDataset } from "@/lib/admin/export-datasets";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

async function downloadDataset(dataset: ExportDataset) {
  const res = await fetch(`/api/admin/export?dataset=${dataset}`, { credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Download failed");
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `${dataset}.csv`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminExportPage() {
  const [loading, setLoading] = useState<ExportDataset | "all" | null>(null);

  const handleOne = async (id: ExportDataset) => {
    setLoading(id);
    try {
      await downloadDataset(id);
      toast({ title: "Download started", description: `Saved ${id} CSV.` });
    } catch (e) {
      toast({
        title: "Export failed",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleAll = async () => {
    setLoading("all");
    try {
      for (const { id } of EXPORT_DATASETS) {
        await downloadDataset(id);
        await new Promise((r) => setTimeout(r, 400));
      }
      toast({ title: "All exports complete", description: "Six CSV files downloaded." });
    } catch (e) {
      toast({
        title: "Export failed",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 w-full min-w-0 animate-in fade-in duration-500">
      <div className="bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-7 h-7 text-primary shrink-0" />
              Export data
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base max-w-xl">
              Download your CRM data as CSV files for Excel, Google Sheets, or backups. Files use
              today&apos;s date in the filename.
            </p>
          </div>
          <Button
            className="shrink-0 w-full sm:w-auto"
            onClick={handleAll}
            disabled={loading !== null}
          >
            {loading === "all" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download all
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 w-full [grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr))]">
        {EXPORT_DATASETS.map(({ id, label, description }) => (
          <div
            key={id}
            className="bg-card border border-border rounded-2xl p-4 sm:p-5 flex flex-col gap-3 min-w-0"
          >
            <div className="min-w-0 flex-1">
              <h2 className="font-display font-bold text-base">{label}</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOne(id)}
              disabled={loading !== null}
            >
              {loading === id ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download CSV
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
