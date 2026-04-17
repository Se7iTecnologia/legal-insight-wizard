import { Wallet, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

const cards = [
  { label: "Saldo em Caixa", value: "R$ 0,00", icon: Wallet, tone: "text-foreground" },
  { label: "A Receber", value: "R$ 0,00", icon: TrendingUp, tone: "text-success" },
  { label: "Despesas (mês)", value: "R$ 0,00", icon: TrendingDown, tone: "text-destructive" },
  { label: "Parcelas Vencidas", value: "0", icon: AlertCircle, tone: "text-warning" },
];

export default function DashboardFinanceiro() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-bold text-foreground">Dashboard Financeiro</h1>
        <p className="text-sm text-muted-foreground">Visão geral do fluxo de caixa, contratos e parcelas</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{c.label}</span>
              <c.icon className={`w-5 h-5 ${c.tone}`} />
            </div>
            <p className={`text-2xl font-bold ${c.tone}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Os gráficos de fluxo de caixa, receitas x despesas e contratos serão exibidos aqui na <strong>Fase 4</strong>.
        </p>
      </div>
    </div>
  );
}
