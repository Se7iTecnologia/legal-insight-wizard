import { useEffect, useState, useCallback } from "react";
import { Plus, FileSignature, Eye, Trash2, MessageCircle, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ContratoForm, type ContratoEdit } from "@/components/financeiro/ContratoForm";
import { ConfirmDelete } from "@/components/ConfirmDelete";

interface Contrato {
  id: string;
  descricao: string;
  cliente_id: string | null;
  caso_id: string | null;
  valor_total: number;
  valor_pago: number;
  saldo_devedor: number;
  numero_parcelas: number;
  valor_parcela: number;
  data_inicio: string;
  primeiro_vencimento: string;
  status: string;
  observacoes: string | null;
  criado_em: string;
}
interface Cliente { id: string; nome: string; telefone: string | null; }

const fmt = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_BADGE: Record<string, string> = {
  ativo: "bg-success/10 text-success border-success/20",
  quitado: "bg-muted text-muted-foreground border-border",
  cancelado: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function ContratosFinanceiros() {
  const navigate = useNavigate();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [clientes, setClientes] = useState<Record<string, Cliente>>({});
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "quitado" | "cancelado">("todos");
  const [busca, setBusca] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editContrato, setEditContrato] = useState<ContratoEdit | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("contratos_financeiros" as any).select("*").order("criado_em", { ascending: false });
    if (filtroStatus !== "todos") q = q.eq("status", filtroStatus);
    const { data, error } = await q;
    if (error) toast.error("Erro ao carregar contratos");
    const list = (data || []) as any as Contrato[];
    setContratos(list);

    const ids = Array.from(new Set(list.map((c) => c.cliente_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: cli } = await supabase.from("clientes").select("id, nome, telefone").in("id", ids);
      const map: Record<string, Cliente> = {};
      (cli || []).forEach((c: any) => { map[c.id] = c; });
      setClientes(map);
    } else {
      setClientes({});
    }
    setLoading(false);
  }, [filtroStatus]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase.channel("contratos-fin")
      .on("postgres_changes", { event: "*", schema: "public", table: "contratos_financeiros" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const filtrados = contratos.filter((c) => {
    if (!busca) return true;
    const cli = c.cliente_id ? clientes[c.cliente_id]?.nome || "" : "";
    return c.descricao.toLowerCase().includes(busca.toLowerCase()) || cli.toLowerCase().includes(busca.toLowerCase());
  });

  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from("contratos_financeiros" as any).delete().eq("id", deleteId);
    if (error) toast.error("Erro ao excluir");
    else toast.success("Contrato excluído");
    setDeleteId(null);
    load();
  }

  function cobrar(c: Contrato) {
    const cliente = c.cliente_id ? clientes[c.cliente_id] : null;
    if (!cliente?.telefone) {
      toast.error("Cliente sem telefone cadastrado");
      return;
    }
    const tel = cliente.telefone.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Olá, ${cliente.nome}!\n\nLembrete sobre o contrato "${c.descricao}".\nSaldo devedor: ${fmt(Number(c.saldo_devedor))}.\n\nQualquer dúvida, estou à disposição.`
    );
    window.open(`https://wa.me/55${tel}?text=${msg}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Contratos Financeiros</h1>
          <p className="text-sm text-muted-foreground">Gerencie contratos, parcelas e recebimentos</p>
        </div>
        <button onClick={() => setOpenForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-warning text-white text-sm font-medium hover:bg-warning/90">
          <Plus className="w-4 h-4" /> Novo Contrato
        </button>
      </header>

      {/* Filtros */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-[11px] text-muted-foreground block">Status</label>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as any)} className="px-2 py-1.5 rounded-md border border-input bg-background text-sm">
            <option value="todos">Todos</option>
            <option value="ativo">Ativos</option>
            <option value="quitado">Quitados</option>
            <option value="cancelado">Cancelados</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-[11px] text-muted-foreground block">Buscar</label>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Descrição ou cliente..."
            className="w-full px-3 py-1.5 rounded-md border border-input bg-background text-sm"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center">
            <FileSignature className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum contrato ainda. Clique em "Novo Contrato" para começar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Descrição</th>
                  <th className="text-left px-4 py-2">Cliente</th>
                  <th className="text-right px-4 py-2">Valor Total</th>
                  <th className="text-right px-4 py-2">Pago</th>
                  <th className="text-right px-4 py-2">Saldo</th>
                  <th className="text-center px-4 py-2">Parcelas</th>
                  <th className="text-center px-4 py-2">Status</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c) => {
                  const cliente = c.cliente_id ? clientes[c.cliente_id] : null;
                  return (
                    <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-medium text-foreground">{c.descricao}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{cliente?.nome || "—"}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">{fmt(Number(c.valor_total))}</td>
                      <td className="px-4 py-2.5 text-right text-success whitespace-nowrap">{fmt(Number(c.valor_pago))}</td>
                      <td className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">{fmt(Number(c.saldo_devedor))}</td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">{c.numero_parcelas}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase ${STATUS_BADGE[c.status] || ""}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => cobrar(c)} title="Cobrar via WhatsApp" className="p-1.5 rounded-md text-muted-foreground hover:text-success hover:bg-success/10">
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => navigate(`/financeiro/contratos/${c.id}`)} title="Detalhes" className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditContrato({
                              id: c.id, descricao: c.descricao, cliente_id: c.cliente_id, caso_id: c.caso_id,
                              valor_total: Number(c.valor_total), numero_parcelas: c.numero_parcelas,
                              valor_parcela: Number(c.valor_parcela), data_inicio: c.data_inicio,
                              primeiro_vencimento: c.primeiro_vencimento, observacoes: c.observacoes, status: c.status,
                            })}
                            title="Editar"
                            className="p-1.5 rounded-md text-muted-foreground hover:text-warning hover:bg-warning/10"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteId(c.id)} title="Excluir" className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ContratoForm open={openForm} onOpenChange={setOpenForm} onSaved={load} />
      <ContratoForm
        open={!!editContrato}
        onOpenChange={(v) => !v && setEditContrato(null)}
        onSaved={load}
        contratoEdit={editContrato}
      />
      <ConfirmDelete
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir contrato?"
        description="Todas as parcelas vinculadas serão excluídas. Lançamentos vinculados permanecerão, mas perderão o vínculo."
      />
    </div>
  );
}
