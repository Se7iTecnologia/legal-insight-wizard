import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Trash2, ArrowRight } from "lucide-react";
import { CasoForm } from "@/components/CasoForm";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { toast } from "sonner";

interface Caso {
  id: string;
  codigo: string;
  status: string;
  etapa_atual: number;
  criado_em: string;
  clientes: { nome: string } | null;
}

const statusColors: Record<string, string> = {
  ativo: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  rascunho: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
  concluido: "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]",
  arquivado: "bg-muted text-muted-foreground",
};

const statusLabel: Record<string, string> = {
  ativo: "Ativo",
  rascunho: "Rascunho",
  concluido: "Concluído",
  arquivado: "Arquivado",
};

export default function Casos() {
  const [casos, setCasos] = useState<Caso[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const fetchCasos = useCallback(async () => {
    const { data } = await supabase
      .from("casos")
      .select("id, codigo, status, etapa_atual, criado_em, clientes(nome)")
      .order("criado_em", { ascending: false });
    setCasos((data as any) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCasos(); }, [fetchCasos]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    // Delete related documents first
    await supabase.from("documentos_caso").delete().eq("caso_id", deleteId);
    const { error } = await supabase.from("casos").delete().eq("id", deleteId);
    if (error) toast.error("Erro ao excluir: " + error.message);
    else { toast.success("Caso excluído!"); fetchCasos(); }
    setDeleteId(null);
    setDeleting(false);
  };

  const filtered = casos.filter((c) =>
    c.codigo.toLowerCase().includes(search.toLowerCase()) ||
    c.clientes?.nome?.toLowerCase().includes(search.toLowerCase())
  );

  const etapaLabel = (n: number) => {
    const labels: Record<number, string> = { 1: "Calculadora", 2: "BACEN", 3: "Planilha", 4: "Valores", 5: "Documentos" };
    return labels[n] || `Etapa ${n}`;
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Casos</h1>
          <p className="text-muted-foreground mt-1">{casos.length} registrados</p>
        </div>
        <button onClick={() => setFormOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Caso</span>
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por código ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? <p className="text-muted-foreground text-center py-8">Carregando...</p> : filtered.length === 0 ? <p className="text-muted-foreground text-center py-8">Nenhum caso encontrado</p> : filtered.map((c) => (
          <div key={c.id} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-mono font-medium text-foreground text-sm">{c.codigo}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status] ?? "bg-muted text-muted-foreground"}`}>
                    {statusLabel[c.status] || c.status}
                  </span>
                </div>
                <p className="text-sm text-foreground">{c.clientes?.nome ?? "—"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{etapaLabel(c.etapa_atual)} · {new Date(c.criado_em).toLocaleDateString("pt-BR")}</p>
              </div>
              <div className="flex gap-1 ml-2">
                <button onClick={() => navigate(`/casos/${c.id}`)} className="p-1.5 rounded-md hover:bg-muted transition-colors"><ArrowRight className="w-3.5 h-3.5 text-primary" /></button>
                <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Código</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Etapa</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum caso encontrado</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-foreground">{c.codigo}</td>
                  <td className="px-4 py-3 text-foreground">{c.clientes?.nome ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[c.status] ?? "bg-muted text-muted-foreground"}`}>
                      {statusLabel[c.status] || c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{etapaLabel(c.etapa_atual)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(c.criado_em).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => navigate(`/casos/${c.id}`)} className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Abrir análise"><ArrowRight className="w-3.5 h-3.5 text-primary" /></button>
                      <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CasoForm open={formOpen} onOpenChange={setFormOpen} onSaved={fetchCasos} />
      <ConfirmDelete open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} onConfirm={handleDelete} loading={deleting} description="Tem certeza que deseja excluir este caso e seus documentos? Esta ação não pode ser desfeita." />
    </div>
  );
}
