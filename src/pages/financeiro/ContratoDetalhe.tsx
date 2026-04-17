import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, MessageCircle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Contrato {
  id: string;
  descricao: string;
  cliente_id: string | null;
  caso_id: string | null;
  valor_total: number;
  valor_pago: number;
  saldo_devedor: number;
  numero_parcelas: number;
  data_inicio: string;
  primeiro_vencimento: string;
  status: string;
  observacoes: string | null;
  criado_em: string;
}
interface Parcela {
  id: string;
  numero: number;
  valor: number;
  valor_pago: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
}
interface Cliente { id: string; nome: string; telefone: string | null; }
interface Lancamento { id: string; descricao: string; valor: number; data: string; tipo: string; }

const fmt = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const today = () => new Date().toISOString().slice(0, 10);

export default function ContratoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [historico, setHistorico] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [marcandoId, setMarcandoId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: c }, { data: p }, { data: l }] = await Promise.all([
      supabase.from("contratos_financeiros" as any).select("*").eq("id", id).maybeSingle(),
      supabase.from("parcelas" as any).select("*").eq("contrato_id", id).order("numero"),
      supabase.from("lancamentos" as any).select("id, descricao, valor, data, tipo").eq("contrato_id", id).order("data", { ascending: false }),
    ]);
    setContrato(c as any);
    setParcelas((p || []) as any);
    setHistorico((l || []) as any);
    if ((c as any)?.cliente_id) {
      const { data: cli } = await supabase.from("clientes").select("id, nome, telefone").eq("id", (c as any).cliente_id).maybeSingle();
      setCliente(cli as any);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`contrato-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "parcelas", filter: `contrato_id=eq.${id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "contratos_financeiros", filter: `id=eq.${id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "lancamentos", filter: `contrato_id=eq.${id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, load]);

  async function marcarPago(parcela: Parcela) {
    if (!contrato) return;
    setMarcandoId(parcela.id);
    try {
      const { data: u } = await supabase.auth.getUser();
      const user_id = u.user?.id;
      if (!user_id) throw new Error("Não autenticado");

      const restante = Number(parcela.valor) - Number(parcela.valor_pago);
      if (restante <= 0) { toast.info("Parcela já está paga"); return; }

      // 1) Cria receita vinculada
      const { error: errLanc } = await supabase.from("lancamentos" as any).insert({
        user_id,
        tipo: "receita",
        descricao: `Pagamento parcela #${parcela.numero} — ${contrato.descricao}`,
        valor: restante,
        data: today(),
        cliente_id: contrato.cliente_id,
        contrato_id: contrato.id,
        parcela_id: parcela.id,
      });
      if (errLanc) throw errLanc;

      // 2) Atualiza parcela
      await supabase.from("parcelas" as any).update({
        valor_pago: Number(parcela.valor),
        data_pagamento: today(),
        status: "pago",
      }).eq("id", parcela.id);

      // 3) Atualiza contrato
      const novoPago = Number(contrato.valor_pago) + restante;
      const novoSaldo = Math.max(Number(contrato.valor_total) - novoPago, 0);
      await supabase.from("contratos_financeiros" as any).update({
        valor_pago: novoPago,
        saldo_devedor: novoSaldo,
        status: novoSaldo <= 0 ? "quitado" : "ativo",
      }).eq("id", contrato.id);

      toast.success(`Parcela #${parcela.numero} marcada como paga`);
      load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao marcar como paga");
    } finally {
      setMarcandoId(null);
    }
  }

  function cobrar(parcela?: Parcela) {
    if (!cliente?.telefone) { toast.error("Cliente sem telefone"); return; }
    const tel = cliente.telefone.replace(/\D/g, "");
    const msg = parcela
      ? `Olá, ${cliente.nome}! Lembrete da parcela #${parcela.numero} do contrato "${contrato?.descricao}", vencimento ${new Date(parcela.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")}, valor ${fmt(Number(parcela.valor) - Number(parcela.valor_pago))}.`
      : `Olá, ${cliente.nome}! Sobre o contrato "${contrato?.descricao}". Saldo devedor: ${fmt(Number(contrato?.saldo_devedor || 0))}.`;
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>;
  if (!contrato) return <div className="p-8 text-center text-sm text-muted-foreground">Contrato não encontrado.</div>;

  const progresso = Number(contrato.valor_total) > 0 ? (Number(contrato.valor_pago) / Number(contrato.valor_total)) * 100 : 0;
  const todayStr = today();

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/financeiro/contratos")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <header className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">{contrato.descricao}</h1>
            <p className="text-sm text-muted-foreground mt-1">{cliente?.nome || "Sem cliente"}</p>
          </div>
          <button onClick={() => cobrar()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 text-success border border-success/20 text-sm font-medium hover:bg-success/20">
            <MessageCircle className="w-4 h-4" /> Cobrar Cliente
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Valor Total</p>
            <p className="text-lg font-bold text-foreground">{fmt(Number(contrato.valor_total))}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Pago</p>
            <p className="text-lg font-bold text-success">{fmt(Number(contrato.valor_pago))}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Saldo</p>
            <p className="text-lg font-bold text-warning">{fmt(Number(contrato.saldo_devedor))}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Parcelas</p>
            <p className="text-lg font-bold text-foreground">{contrato.numero_parcelas}</p>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progresso</span>
            <span>{progresso.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-success transition-all" style={{ width: `${progresso}%` }} />
          </div>
        </div>
      </header>

      {/* Timeline parcelas */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" /> Parcelas
        </h2>
        <div className="space-y-2">
          {parcelas.map((p) => {
            const isPaid = p.status === "pago";
            const isVencido = !isPaid && p.data_vencimento < todayStr;
            const restante = Number(p.valor) - Number(p.valor_pago);
            const Icon = isPaid ? CheckCircle2 : isVencido ? AlertCircle : Clock;
            const tone = isPaid ? "text-success" : isVencido ? "text-destructive" : "text-muted-foreground";
            return (
              <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border ${isPaid ? "bg-success/5 border-success/20" : isVencido ? "bg-destructive/5 border-destructive/20" : "bg-muted/30 border-border"}`}>
                <Icon className={`w-5 h-5 shrink-0 ${tone}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">Parcela #{p.numero}</span>
                    <span className="text-xs text-muted-foreground">
                      Venc. {new Date(p.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                    </span>
                    {p.status === "parcial" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">parcial</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {fmt(Number(p.valor_pago))} / {fmt(Number(p.valor))}
                    {p.data_pagamento && <> — pago em {new Date(p.data_pagamento + "T00:00:00").toLocaleDateString("pt-BR")}</>}
                  </div>
                </div>
                {!isPaid && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => cobrar(p)}
                      title="Cobrar"
                      className="p-1.5 rounded-md text-muted-foreground hover:text-success hover:bg-success/10"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => marcarPago(p)}
                      disabled={marcandoId === p.id}
                      className="px-3 py-1.5 rounded-md bg-success text-white text-xs font-medium hover:bg-success/90 disabled:opacity-50"
                    >
                      {marcandoId === p.id ? "..." : `Pagar ${fmt(restante)}`}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {parcelas.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sem parcelas geradas.</p>}
        </div>
      </div>

      {/* Histórico de lançamentos */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-heading font-bold text-foreground mb-4">Histórico de pagamentos</h2>
        {historico.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum lançamento vinculado ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {historico.map((h) => (
              <li key={h.id} className="py-2.5 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-foreground">{h.descricao}</p>
                  <p className="text-xs text-muted-foreground">{new Date(h.data + "T00:00:00").toLocaleDateString("pt-BR")}</p>
                </div>
                <span className={`font-semibold ${h.tipo === "receita" ? "text-success" : "text-destructive"}`}>
                  {h.tipo === "receita" ? "+" : "−"} {fmt(Number(h.valor))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
