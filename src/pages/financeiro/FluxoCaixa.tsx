import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

export default function FluxoCaixa() {
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Fluxo de Caixa</h1>
          <p className="text-sm text-muted-foreground">Lance receitas e despesas e acompanhe o saldo em tempo real</p>
        </div>
        <div className="flex gap-2">
          <button disabled className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success/90 text-white text-sm font-medium opacity-60 cursor-not-allowed">
            <ArrowUpCircle className="w-4 h-4" /> Lançar Receita
          </button>
          <button disabled className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/90 text-white text-sm font-medium opacity-60 cursor-not-allowed">
            <ArrowDownCircle className="w-4 h-4" /> Lançar Despesa
          </button>
        </div>
      </header>

      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Funcionalidade de lançamentos será habilitada na <strong>Fase 2</strong>.
        </p>
      </div>
    </div>
  );
}
