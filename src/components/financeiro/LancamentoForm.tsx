import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

export type LancamentoTipo = "receita" | "despesa";

const FORMAS = ["Dinheiro", "PIX", "Cartão Crédito", "Cartão Débito", "Boleto", "Transferência"];
const CATEGORIAS_DESPESA = ["Aluguel", "Salário", "Marketing", "Software", "Tributos", "Material", "Outros"];

const schema = z.object({
  descricao: z.string().trim().min(2, "Descrição obrigatória").max(200, "Máx. 200 caracteres"),
  valor: z.number().positive("Valor deve ser maior que zero").max(99999999, "Valor muito alto"),
  data: z.string().min(1, "Data obrigatória"),
  forma_pagamento: z.string().max(50).optional(),
  categoria: z.string().max(50).optional(),
  cliente_id: z.string().uuid().nullable().optional(),
  contrato_id: z.string().uuid().nullable().optional(),
  parcela_id: z.string().uuid().nullable().optional(),
  observacoes: z.string().max(500).optional(),
});

interface Cliente { id: string; nome: string; }
interface Contrato { id: string; descricao: string; cliente_id: string | null; saldo_devedor: number; }
interface Parcela { id: string; numero: number; valor: number; valor_pago: number; data_vencimento: string; status: string; }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipo: LancamentoTipo;
  onSaved?: () => void;
}

export function LancamentoForm({ open, onOpenChange, tipo, onSaved }: Props) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [formaPagamento, setFormaPagamento] = useState("");
  const [categoria, setCategoria] = useState("");
  const [clienteId, setClienteId] = useState<string>("");
  const [contratoId, setContratoId] = useState<string>("");
  const [parcelaId, setParcelaId] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);

  useEffect(() => {
    if (!open) return;
    // reset
    setDescricao(""); setValor(""); setData(new Date().toISOString().slice(0, 10));
    setFormaPagamento(""); setCategoria(""); setClienteId(""); setContratoId(""); setParcelaId(""); setObservacoes("");

    (async () => {
      const [{ data: cli }, { data: ctr }] = await Promise.all([
        supabase.from("clientes").select("id, nome").order("nome"),
        supabase.from("contratos_financeiros" as any).select("id, descricao, cliente_id, saldo_devedor").eq("status", "ativo").order("criado_em", { ascending: false }),
      ]);
      setClientes((cli || []) as Cliente[]);
      setContratos((ctr || []) as any);
    })();
  }, [open]);

  // Carregar parcelas quando contrato é selecionado (apenas receitas)
  useEffect(() => {
    if (!contratoId || tipo !== "receita") { setParcelas([]); setParcelaId(""); return; }
    (async () => {
      const { data } = await supabase
        .from("parcelas" as any)
        .select("id, numero, valor, valor_pago, data_vencimento, status")
        .eq("contrato_id", contratoId)
        .in("status", ["pendente", "vencido", "parcial"])
        .order("numero");
      setParcelas((data || []) as any);
    })();
  }, [contratoId, tipo]);

  // Auto-vincular cliente do contrato
  useEffect(() => {
    if (!contratoId) return;
    const c = contratos.find((x) => x.id === contratoId);
    if (c?.cliente_id) setClienteId(c.cliente_id);
  }, [contratoId, contratos]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({
      descricao,
      valor: Number(valor.replace(",", ".")),
      data,
      forma_pagamento: formaPagamento || undefined,
      categoria: categoria || undefined,
      cliente_id: clienteId || null,
      contrato_id: contratoId || null,
      parcela_id: parcelaId || null,
      observacoes: observacoes || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Dados inválidos");
      return;
    }
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData.user?.id;
      if (!user_id) throw new Error("Não autenticado");

      // 1) Insere lançamento
      const { error: errIns } = await supabase.from("lancamentos" as any).insert({
        ...parsed.data,
        tipo,
        user_id,
      });
      if (errIns) throw errIns;

      // 2) Se receita vinculada a contrato → abater parcela e atualizar contrato
      if (tipo === "receita" && parsed.data.contrato_id) {
        const valorPagamento = parsed.data.valor;
        const contrato = contratos.find((c) => c.id === parsed.data.contrato_id);

        // Abater parcela específica (se selecionada) ou a mais próxima pendente
        let parcelaAlvo: Parcela | undefined;
        if (parsed.data.parcela_id) {
          parcelaAlvo = parcelas.find((p) => p.id === parsed.data.parcela_id);
        } else {
          parcelaAlvo = parcelas[0];
        }

        if (parcelaAlvo) {
          const novoPago = Number(parcelaAlvo.valor_pago) + valorPagamento;
          const totalParcela = Number(parcelaAlvo.valor);
          const novoStatus = novoPago >= totalParcela ? "pago" : "parcial";
          await supabase.from("parcelas" as any).update({
            valor_pago: Math.min(novoPago, totalParcela),
            data_pagamento: novoPago >= totalParcela ? parsed.data.data : null,
            status: novoStatus,
          }).eq("id", parcelaAlvo.id);
        }

        if (contrato) {
          const novoValorPago = Number(contrato.saldo_devedor != null ? 0 : 0); // recompute via fetch
          const { data: ctrNow } = await supabase
            .from("contratos_financeiros" as any)
            .select("valor_total, valor_pago")
            .eq("id", contrato.id)
            .maybeSingle();
          if (ctrNow) {
            const vp = Number((ctrNow as any).valor_pago) + valorPagamento;
            const vt = Number((ctrNow as any).valor_total);
            const sd = Math.max(vt - vp, 0);
            await supabase.from("contratos_financeiros" as any).update({
              valor_pago: vp,
              saldo_devedor: sd,
              status: sd <= 0 ? "quitado" : "ativo",
            }).eq("id", contrato.id);
          }
        }
      }

      toast.success(tipo === "receita" ? "Receita registrada" : "Despesa registrada");
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar lançamento");
    } finally {
      setLoading(false);
    }
  }

  const isReceita = tipo === "receita";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={isReceita ? "text-success" : "text-destructive"}>
            {isReceita ? "Lançar Receita" : "Lançar Despesa"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Descrição *</label>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={200}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
              placeholder={isReceita ? "Ex: Honorários processo XYZ" : "Ex: Aluguel escritório"}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Valor (R$) *</label>
              <input
                value={valor}
                onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))}
                inputMode="decimal"
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Data *</label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Forma de Pagamento</label>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
              >
                <option value="">—</option>
                {FORMAS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            {!isReceita ? (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
                >
                  <option value="">—</option>
                  {CATEGORIAS_DESPESA.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Cliente</label>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
                >
                  <option value="">—</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            )}
          </div>

          {isReceita && (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Contrato (opcional)</label>
                <select
                  value={contratoId}
                  onChange={(e) => setContratoId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
                >
                  <option value="">— Sem vínculo</option>
                  {contratos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.descricao} — Saldo R$ {Number(c.saldo_devedor).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {contratoId && parcelas.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Parcela a abater (vazio = mais próxima)
                  </label>
                  <select
                    value={parcelaId}
                    onChange={(e) => setParcelaId(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
                  >
                    <option value="">— Automática (próxima pendente)</option>
                    {parcelas.map((p) => (
                      <option key={p.id} value={p.id}>
                        Parcela #{p.numero} — Venc. {new Date(p.data_vencimento).toLocaleDateString("pt-BR")} — R$ {Number(p.valor).toFixed(2)} [{p.status}]
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              maxLength={500}
              rows={2}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg border border-input text-sm font-medium hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 ${
                isReceita ? "bg-success hover:bg-success/90" : "bg-destructive hover:bg-destructive/90"
              }`}
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
