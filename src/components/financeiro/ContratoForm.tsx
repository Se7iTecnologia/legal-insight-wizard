import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const schema = z.object({
  descricao: z.string().trim().min(2, "Descrição obrigatória").max(200),
  cliente_id: z.string().uuid("Selecione um cliente"),
  caso_id: z.string().uuid().nullable().optional(),
  valor_total: z.number().positive("Valor deve ser maior que zero").max(99999999),
  numero_parcelas: z.number().int().min(1, "Mín. 1 parcela").max(360, "Máx. 360"),
  valor_parcela: z.number().positive().max(99999999),
  data_inicio: z.string().min(1),
  primeiro_vencimento: z.string().min(1),
  observacoes: z.string().max(500).optional(),
});

interface Cliente { id: string; nome: string; }
interface Caso { id: string; codigo: string; cliente_id: string | null; }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
  preClienteId?: string | null;
}

export function ContratoForm({ open, onOpenChange, onSaved, preClienteId }: Props) {
  const [descricao, setDescricao] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [casoId, setCasoId] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [numeroParcelas, setNumeroParcelas] = useState("1");
  const [valorParcela, setValorParcela] = useState("");
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [primeiroVenc, setPrimeiroVenc] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [casos, setCasos] = useState<Caso[]>([]);

  useEffect(() => {
    if (!open) return;
    setDescricao(""); setClienteId(preClienteId || ""); setCasoId(""); setValorTotal("");
    setNumeroParcelas("1"); setValorParcela("");
    setDataInicio(new Date().toISOString().slice(0, 10));
    const d = new Date(); d.setMonth(d.getMonth() + 1);
    setPrimeiroVenc(d.toISOString().slice(0, 10));
    setObservacoes("");

    (async () => {
      const [{ data: cli }, { data: cs }] = await Promise.all([
        supabase.from("clientes").select("id, nome").order("nome"),
        supabase.from("casos").select("id, codigo, cliente_id").order("criado_em", { ascending: false }),
      ]);
      setClientes((cli || []) as any);
      setCasos((cs || []) as any);
    })();
  }, [open, preClienteId]);

  // Auto valor parcela
  useEffect(() => {
    const vt = Number(valorTotal.replace(",", ".")) || 0;
    const np = Number(numeroParcelas) || 0;
    if (vt > 0 && np > 0) {
      setValorParcela((vt / np).toFixed(2));
    }
  }, [valorTotal, numeroParcelas]);

  const casosCliente = casos.filter((c) => !clienteId || c.cliente_id === clienteId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({
      descricao,
      cliente_id: clienteId,
      caso_id: casoId || null,
      valor_total: Number(valorTotal.replace(",", ".")),
      numero_parcelas: Number(numeroParcelas),
      valor_parcela: Number(valorParcela.replace(",", ".")),
      data_inicio: dataInicio,
      primeiro_vencimento: primeiroVenc,
      observacoes: observacoes || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Dados inválidos");
      return;
    }
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const user_id = u.user?.id;
      if (!user_id) throw new Error("Não autenticado");

      const { error } = await supabase.from("contratos_financeiros" as any).insert({
        ...parsed.data,
        user_id,
        status: "ativo",
      });
      if (error) throw error;
      toast.success("Contrato criado. Parcelas geradas automaticamente.");
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar contrato");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Contrato Financeiro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Cliente *</label>
            <select
              value={clienteId}
              onChange={(e) => { setClienteId(e.target.value); setCasoId(""); }}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
            >
              <option value="">— Selecione</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Caso vinculado (opcional)</label>
            <select
              value={casoId}
              onChange={(e) => setCasoId(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
              disabled={!clienteId}
            >
              <option value="">— Sem vínculo</option>
              {casosCliente.map((c) => <option key={c.id} value={c.id}>{c.codigo}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Descrição *</label>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={200}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
              placeholder="Ex: Honorários ação revisional"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Valor Total (R$) *</label>
              <input
                value={valorTotal}
                onChange={(e) => setValorTotal(e.target.value.replace(/[^\d.,]/g, ""))}
                inputMode="decimal"
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Parcelas *</label>
              <input
                type="number"
                min={1}
                max={360}
                value={numeroParcelas}
                onChange={(e) => setNumeroParcelas(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Valor parcela</label>
              <input
                value={valorParcela}
                onChange={(e) => setValorParcela(e.target.value.replace(/[^\d.,]/g, ""))}
                inputMode="decimal"
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
                placeholder="auto"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Data início *</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">1º vencimento *</label>
              <input
                type="date"
                value={primeiroVenc}
                onChange={(e) => setPrimeiroVenc(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
              />
            </div>
          </div>

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
            <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-lg border border-input text-sm font-medium hover:bg-muted">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-warning text-white text-sm font-medium hover:bg-warning/90 disabled:opacity-50">
              {loading ? "Criando..." : "Criar Contrato"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
