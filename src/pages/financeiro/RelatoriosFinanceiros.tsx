import { FileText, FileSpreadsheet } from "lucide-react";

export default function RelatoriosFinanceiros() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-bold text-foreground">Relatórios Financeiros</h1>
        <p className="text-sm text-muted-foreground">Exporte fluxo de caixa, contratos e inadimplência</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-3 opacity-60">
          <FileText className="w-6 h-6 text-destructive" />
          <div>
            <p className="font-medium text-foreground">Exportar PDF</p>
            <p className="text-xs text-muted-foreground">Disponível na Fase 4</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-3 opacity-60">
          <FileSpreadsheet className="w-6 h-6 text-success" />
          <div>
            <p className="font-medium text-foreground">Exportar Excel</p>
            <p className="text-xs text-muted-foreground">Disponível na Fase 4</p>
          </div>
        </div>
      </div>
    </div>
  );
}
