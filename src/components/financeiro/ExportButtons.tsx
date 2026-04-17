import { useState } from "react";
import { FileText, FileSpreadsheet, FileDown, Loader2, Download } from "lucide-react";
import { exportPDF, exportExcel, exportCSV } from "@/lib/exports";
import { toast } from "sonner";

interface Props {
  titulo: string;
  filename: string;
  rows: Record<string, any>[];
  disabled?: boolean;
}

export function ExportButtons({ titulo, filename, rows, disabled }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  function run(formato: "pdf" | "excel" | "csv") {
    if (!rows.length) { toast.warning("Nenhum dado para exportar"); return; }
    setBusy(formato);
    try {
      const fname = `${filename}-${new Date().toISOString().slice(0, 10)}`;
      if (formato === "pdf") exportPDF(titulo, rows, fname);
      else if (formato === "excel") exportExcel(rows, fname);
      else exportCSV(rows, fname);
      toast.success("Exportação concluída");
    } catch (e: any) {
      toast.error(e.message || "Erro ao exportar");
    } finally {
      setBusy(null);
    }
  }

  const btn = "flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
        <Download className="w-3.5 h-3.5" /> Exportar:
      </span>
      <button onClick={() => run("pdf")} disabled={disabled || !!busy} className={btn} title="Exportar PDF">
        {busy === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-destructive" />} PDF
      </button>
      <button onClick={() => run("excel")} disabled={disabled || !!busy} className={btn} title="Exportar Excel">
        {busy === "excel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-success" />} Excel
      </button>
      <button onClick={() => run("csv")} disabled={disabled || !!busy} className={btn} title="Exportar CSV">
        {busy === "csv" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} CSV
      </button>
    </div>
  );
}
