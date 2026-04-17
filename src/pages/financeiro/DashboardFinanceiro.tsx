import { useEffect, useState, useCallback } from "react";
import { Wallet, TrendingUp, TrendingDown, AlertCircle, CalendarClock, PiggyBank } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NavLink } from "react-router-dom";

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Stats {
  saldo: number;
  receitas: number;
  despesas: number;
  aReceber: number;
  parcelasVencidas: number;
  parcelasHoje: number;
}

export default function DashboardFinanceiro() {
  const [stats, setStats] = useState<Stats>({
    saldo: 0, receitas: 0, despesas: 0, aReceber: 0, parcelasVencidas: 0, parcelasHoje: 0,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const hoje = new Date().toISOString().slice(0, 10);
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const inicioMesStr = inicioMes.toISOString().slice(0, 10);

    const [lancAll, lancMes, parcelas] = await Promise.all([
      supabase.from("lancamentos" as any).select("tipo, valor"),
      supabase.from("lancamentos" as any).select("tipo, valor").gte("data", inicioMesStr),
      supabase.from("parcelas" as any).select("valor, valor_pago, data_vencimento, status").in("status", ["pendente", "vencido", "parcial"]),
    ]);

    const all = (lancAll.data || []) as any[];
    const mes = (lancMes.data || []) as any[];
    const parc = (parcelas.data || []) as any[];

    const recAll = all.filter((l) => l.tipo === "receita").reduce((s, l) => s + Number(l.valor), 0);
    const despAll = all.filter((l) => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0);
    const recMes = mes.filter((l) => l.tipo === "receita").reduce((s, l) => s + Number(l.valor), 0);
    const despMes = mes.filter((l) => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0);

    const aReceber = parc.reduce((s, p) => s + (Number(p.valor) - Number(p.valor_pago)), 0);
    const vencidas = parc.filter((p) => p.data_vencimento < hoje || p.status === "vencido").length;
    const hojeQt = parc.filter((p) => p.data_vencimento === hoje).length;

    setStats({
      saldo: recAll - despAll,
      receitas: recMes,
      despesas: despMes,
      aReceber,
      parcelasVencidas: vencidas,
      parcelasHoje: hojeQt,
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("dash-fin")
      .on("postgres_changes", { event: "*", schema: "public", table: "lancamentos" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "parcelas" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const lucro = stats.receitas - stats.despesas;

  const cards = [
    { label: "Saldo em Caixa", value: fmt(stats.saldo), icon: Wallet, tone: stats.saldo >= 0 ? "text-foreground" : "text-destructive" },
    { label: "A Receber", value: fmt(stats.aReceber), icon: TrendingUp, tone: "text-success" },
    { label: "Despesas (mês)", value: fmt(stats.despesas), icon: TrendingDown, tone: "text-destructive" },
    { label: "Lucro Líquido (mês)", value: fmt(lucro), icon: PiggyBank, tone: lucro >= 0 ? "text-success" : "text-destructive" },
    { label: "Parcelas Vencidas", value: String(stats.parcelasVencidas), icon: AlertCircle, tone: "text-warning" },
    { label: "Vencendo Hoje", value: String(stats.parcelasHoje), icon: CalendarClock, tone: "text-foreground" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Dashboard Financeiro</h1>
          <p className="text-sm text-muted-foreground">Visão geral em tempo real</p>
        </div>
        <NavLink to="/financeiro/fluxo-caixa" className="text-sm text-warning hover:underline font-medium">
          Ir para Fluxo de Caixa →
        </NavLink>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{c.label}</span>
              <c.icon className={`w-5 h-5 ${c.tone}`} />
            </div>
            <p className={`text-2xl font-bold ${c.tone}`}>{loading ? "—" : c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Gráficos de fluxo mensal, receitas x despesas e ranking de clientes serão exibidos aqui na <strong>Fase 4</strong>.
        </p>
      </div>
    </div>
  );
}
