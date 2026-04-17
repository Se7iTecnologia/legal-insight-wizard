import { useEffect, useMemo, useState, useCallback } from "react";
import { ArrowDownCircle, ArrowUpCircle, Trash2, Wallet, TrendingUp, TrendingDown, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LancamentoForm, type LancamentoTipo } from "@/components/financeiro/LancamentoForm";
import { ConfirmDelete } from "@/components/ConfirmDelete";

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
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function FluxoCaixa() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [tipoForm, setTipoForm] = useState<LancamentoTipo>("receita");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "receita" | "despesa">("todos");
  const [dataIni, setDataIni] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("lancamentos" as any).select("*").order("data", { ascending: false }).order("criado_em", { ascending: false });
    if (filtroTipo !== "todos") q = q.eq("tipo", filtroTipo);
    if (dataIni) q = q.gte("data", dataIni);
    if (dataFim) q = q.lte("data", dataFim);
    const { data, error } = await q;
    if (error) toast.error("Erro ao carregar lançamentos");
    setLancamentos((data || []) as any);
    setLoading(false);
  }, [filtroTipo, dataIni, dataFim]);

  useEffect(() => { load(); }, [load]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("lancamentos-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "lancamentos" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const totals = useMemo(() => {
    const receitas = lancamentos.filter((l) => l.tipo === "receita").reduce((s, l) => s + Number(l.valor), 0);
    const despesas = lancamentos.filter((l) => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0);
    return { receitas, despesas, saldo: receitas - despesas };
  }, [lancamentos]);

  function abrir(tipo: LancamentoTipo) {
    setTipoForm(tipo);
    setOpenForm(true);
  }

  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from("lancamentos" as any).delete().eq("id", deleteId);
    if (error) toast.error("Erro ao excluir");
    else toast.success("Lançamento excluído");
    setDeleteId(null);
    load();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Fluxo de Caixa</h1>
          <p className="text-sm text-muted-foreground">Receitas, despesas e saldo em tempo real</p>
        </div>
        <div className="flex gap-2">
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card label="Saldo" value={fmt(totals.saldo)} icon={Wallet} tone={totals.saldo >= 0 ? "text-foreground" : "text-destructive"} />
        <Card label="Receitas" value={fmt(totals.receitas)} icon={TrendingUp} tone="text-success" />
        <Card label="Despesas" value={fmt(totals.despesas)} icon={TrendingDown} tone="text-destructive" />
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

      {/* Lista */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
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

function Card({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <Icon className={`w-5 h-5 ${tone}`} />
      </div>
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
