import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Wallet, TrendingUp, TrendingDown, AlertCircle, CalendarClock, PiggyBank,
  ArrowDownCircle, ArrowUpCircle, Trash2, Filter, Paperclip,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LancamentoForm, type LancamentoTipo } from "@/components/financeiro/LancamentoForm";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { ExportButtons } from "@/components/financeiro/ExportButtons";

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("pt-BR");

interface Lancamento {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  data: string;
  forma_pagamento: string | null;
  categoria: string | null;
  cliente_id: string | null;
  contrato_id: string | null;
  observacoes: string | null;
  comprovante_url: string | null;
}

interface Stats {
  saldoTotal: number;
  aReceber: number;
  parcelasVencidas: number;
  parcelasHoje: number;
}

export default function DashboardFinanceiro() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [stats, setStats] = useState<Stats>({ saldoTotal: 0, aReceber: 0, parcelasVencidas: 0, parcelasHoje: 0 });
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [tipoForm, setTipoForm] = useState<LancamentoTipo>("receita");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "receita" | "despesa">("todos");
  const [dataIni, setDataIni] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const hoje = new Date().toISOString().slice(0, 10);

    let q = supabase.from("lancamentos" as any).select("*").order("data", { ascending: false }).order("criado_em", { ascending: false });
    if (filtroTipo !== "todos") q = q.eq("tipo", filtroTipo);
    if (dataIni) q = q.gte("data", dataIni);
    if (dataFim) q = q.lte("data", dataFim);

    const [lancRes, lancAllRes, parcRes] = await Promise.all([
      q,
      supabase.from("lancamentos" as any).select("tipo, valor"),
      supabase.from("parcelas" as any).select("valor, valor_pago, data_vencimento, status").in("status", ["pendente", "vencido", "parcial"]),
    ]);

    if (lancRes.error) toast.error("Erro ao carregar lançamentos");
    setLancamentos((lancRes.data || []) as any);

    const all = (lancAllRes.data || []) as any[];
    const parc = (parcRes.data || []) as any[];

    const recAll = all.filter((l) => l.tipo === "receita").reduce((s, l) => s + Number(l.valor), 0);
    const despAll = all.filter((l) => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0);
    const aReceber = parc.reduce((s, p) => s + (Number(p.valor) - Number(p.valor_pago)), 0);
    const vencidas = parc.filter((p) => p.data_vencimento < hoje || p.status === "vencido").length;
    const hojeQt = parc.filter((p) => p.data_vencimento === hoje).length;

    setStats({ saldoTotal: recAll - despAll, aReceber, parcelasVencidas: vencidas, parcelasHoje: hojeQt });
    setLoading(false);
  }, [filtroTipo, dataIni, dataFim]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("dash-fin-unificado")
      .on("postgres_changes", { event: "*", schema: "public", table: "lancamentos" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "parcelas" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const totaisFiltro = useMemo(() => {
    const receitas = lancamentos.filter((l) => l.tipo === "receita").reduce((s, l) => s + Number(l.valor), 0);
    const despesas = lancamentos.filter((l) => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0);
    return { receitas, despesas };
  }, [lancamentos]);

  const lucroFiltro = totaisFiltro.receitas - totaisFiltro.despesas;

  function abrir(tipo: LancamentoTipo) { setTipoForm(tipo); setOpenForm(true); }

  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from("lancamentos" as any).delete().eq("id", deleteId);
    if (error) toast.error("Erro ao excluir");
    else toast.success("Lançamento excluído");
    setDeleteId(null);
    load();
  }

  const cards = [
    { label: "Saldo Total em Caixa", value: fmt(stats.saldoTotal), icon: Wallet, tone: stats.saldoTotal >= 0 ? "text-foreground" : "text-destructive" },
    { label: "A Receber", value: fmt(stats.aReceber), icon: TrendingUp, tone: "text-success" },
    { label: "Receitas (filtro)", value: fmt(totaisFiltro.receitas), icon: ArrowUpCircle, tone: "text-success" },
    { label: "Despesas (filtro)", value: fmt(totaisFiltro.despesas), icon: TrendingDown, tone: "text-destructive" },
    { label: "Lucro Líquido (filtro)", value: fmt(lucroFiltro), icon: PiggyBank, tone: lucroFiltro >= 0 ? "text-success" : "text-destructive" },
    { label: "Parcelas Vencidas", value: String(stats.parcelasVencidas), icon: AlertCircle, tone: "text-warning" },
    { label: "Vencendo Hoje", value: String(stats.parcelasHoje), icon: CalendarClock, tone: "text-foreground" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Dashboard e fluxo de caixa em tempo real</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <ExportButtons
            titulo="Fluxo de Caixa"
            filename="fluxo-caixa"
            rows={lancamentos.map((l) => ({
              Data: fmtDate(l.data),
              Tipo: l.tipo === "receita" ? "Receita" : "Despesa",
              Descrição: l.descricao,
              Categoria: l.categoria || "",
              "Forma Pagamento": l.forma_pagamento || "",
              Valor: fmt(Number(l.valor)),
              Observações: l.observacoes || "",
            }))}
          />
          <button
            onClick={() => abrir("receita")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success text-white text-sm font-medium hover:bg-success/90 transition-colors"
          >
            <ArrowUpCircle className="w-4 h-4" /> Receita
          </button>
          <button
            onClick={() => abrir("despesa")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors"
          >
            <ArrowDownCircle className="w-4 h-4" /> Despesa
          </button>
        </div>
      </header>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Filtros */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-2 text-muted-foreground"><Filter className="w-4 h-4" /><span className="text-xs font-medium">Filtros</span></div>
        <div>
          <label className="text-[11px] text-muted-foreground block">Tipo</label>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as any)} className="px-2 py-1.5 rounded-md border border-input bg-background text-sm">
            <option value="todos">Todos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground block">De</label>
          <input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} className="px-2 py-1.5 rounded-md border border-input bg-background text-sm" />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground block">Até</label>
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="px-2 py-1.5 rounded-md border border-input bg-background text-sm" />
        </div>
        {(dataIni || dataFim || filtroTipo !== "todos") && (
          <button onClick={() => { setDataIni(""); setDataFim(""); setFiltroTipo("todos"); }} className="text-xs text-muted-foreground hover:text-foreground underline">
            Limpar
          </button>
        )}
      </div>

      {/* Lista de lançamentos */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h2 className="text-sm font-semibold text-foreground">Lançamentos</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : lancamentos.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhum lançamento ainda. Clique em Receita ou Despesa para começar.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Data</th>
                  <th className="text-left px-4 py-2">Descrição</th>
                  <th className="text-left px-4 py-2">Categoria/Forma</th>
                  <th className="text-right px-4 py-2">Valor</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {lancamentos.map((l) => (
                  <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {new Date(l.data + "T00:00:00").toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-foreground">{l.descricao}</div>
                      {l.observacoes && <div className="text-xs text-muted-foreground">{l.observacoes}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {l.categoria || l.forma_pagamento || "—"}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-semibold whitespace-nowrap ${l.tipo === "receita" ? "text-success" : "text-destructive"}`}>
                      {l.tipo === "receita" ? "+" : "−"} {fmt(Number(l.valor))}
                    </td>
                    <td className="px-2 py-2.5">
                      <button onClick={() => setDeleteId(l.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <LancamentoForm open={openForm} onOpenChange={setOpenForm} tipo={tipoForm} onSaved={load} />
      <ConfirmDelete
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir lançamento?"
        description="Esta ação não pode ser desfeita. O abate de parcela vinculada não será revertido automaticamente."
      />
    </div>
  );
}
