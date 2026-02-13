import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, FileText } from "lucide-react";
import { Finding, PageResult, Asset } from "@/lib/types";
import { exportJSON, exportCSV, exportPDF } from "@/lib/export-utils";

interface ExportMenuProps {
  projectName: string;
  findings: Finding[];
  pages: PageResult[];
  assets: Asset[];
}

export const ExportMenu = ({ projectName, findings, pages, assets }: ExportMenuProps) => {
  const [open, setOpen] = useState(false);

  const data = { projectName, findings, pages, assets };

  const handleExport = (format: "json" | "csv" | "pdf") => {
    if (format === "json") exportJSON(data);
    if (format === "csv") exportCSV(data);
    if (format === "pdf") exportPDF(data);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm text-foreground hover:bg-muted transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Export
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border border-border bg-card shadow-lg py-1">
            <button
              onClick={() => handleExport("json")}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <FileJson className="w-4 h-4 text-primary" /> JSON
            </button>
            <button
              onClick={() => handleExport("csv")}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-primary" /> CSV
            </button>
            <button
              onClick={() => handleExport("pdf")}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <FileText className="w-4 h-4 text-primary" /> PDF (Text)
            </button>
          </div>
        </>
      )}
    </div>
  );
};
