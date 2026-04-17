import { Plus } from "lucide-react";

export default function ContratosFinanceiros() {
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Contratos Financeiros</h1>
          <p className="text-sm text-muted-foreground">Gerencie contratos, parcelas e recebimentos</p>
        </div>
        <button disabled className="flex items-center gap-2 px-4 py-2 rounded-lg bg-warning text-white text-sm font-medium opacity-60 cursor-not-allowed">
          <Plus className="w-4 h-4" /> Novo Contrato
        </button>
      </header>

      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-sm text-muted-foreground">
          CRUD de contratos, geração automática de parcelas e timeline serão entregues na <strong>Fase 3</strong>.
        </p>
      </div>
    </div>
  );
}
