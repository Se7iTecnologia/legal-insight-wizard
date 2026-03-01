import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { ClienteForm } from "@/components/ClienteForm";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { toast } from "sonner";
import { exportPDF, exportCSV, exportExcel, exportJSON } from "@/lib/exports";

interface Cliente {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  uf: string | null;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchClientes = useCallback(async () => {
    const { data } = await supabase.from("clientes").select("id, nome, cpf_cnpj, email, telefone, cidade, uf").order("nome");
    setClientes(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from("clientes").delete().eq("id", deleteId);
    if (error) toast.error("Erro ao excluir: " + error.message);
    else { toast.success("Cliente excluído!"); fetchClientes(); }
    setDeleteId(null);
    setDeleting(false);
  };

  const filtered = clientes.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.cpf_cnpj?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = (format: string) => {
    const data = filtered.map(c => ({ Nome: c.nome, "CPF/CNPJ": c.cpf_cnpj || "", Email: c.email || "", Telefone: c.telefone || "", Cidade: c.cidade || "", UF: c.uf || "" }));
    if (format === "pdf") exportPDF("Clientes", data, "clientes");
    if (format === "csv") exportCSV(data, "clientes");
    if (format === "excel") exportExcel(data, "clientes");
    if (format === "json") exportJSON(data, "clientes");
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground mt-1 text-sm">{clientes.length} cadastrados</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1">
            <button onClick={() => handleExport("pdf")} className="px-2 py-1.5 rounded border border-input text-xs hover:bg-muted" title="PDF">📄</button>
            <button onClick={() => handleExport("excel")} className="px-2 py-1.5 rounded border border-input text-xs hover:bg-muted" title="Excel">📗</button>
            <button onClick={() => handleExport("csv")} className="px-2 py-1.5 rounded border border-input text-xs hover:bg-muted" title="CSV">📊</button>
          </div>
          <button onClick={() => { setEditId(null); setFormOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Cliente</span>
          </button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="Buscar por nome, CPF ou email..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? <p className="text-muted-foreground text-center py-8">Carregando...</p> : filtered.length === 0 ? <p className="text-muted-foreground text-center py-8">Nenhum cliente encontrado</p> : filtered.map((c) => (
          <div key={c.id} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-foreground">{c.nome}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.cpf_cnpj || "Sem CPF"}</p>
                {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                {c.telefone && <p className="text-xs text-muted-foreground">{c.telefone}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditId(c.id); setFormOpen(true); }} className="p-1.5 rounded-md hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
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
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">CPF/CNPJ</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Telefone</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cidade/UF</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum cliente encontrado</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{c.nome}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.cpf_cnpj ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.telefone ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.cidade && c.uf ? `${c.cidade}/${c.uf}` : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditId(c.id); setFormOpen(true); }} className="p-1.5 rounded-md hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ClienteForm open={formOpen} onOpenChange={setFormOpen} clienteId={editId} onSaved={fetchClientes} />
      <ConfirmDelete open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} onConfirm={handleDelete} loading={deleting} description="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita." />
    </div>
  );
}
