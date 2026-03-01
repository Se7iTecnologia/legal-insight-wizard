import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search } from "lucide-react";

interface Caso {
  id: string;
  codigo: string;
  status: string;
  etapa_atual: number;
  criado_em: string;
  clientes: { nome: string } | null;
}

const statusColors: Record<string, string> = {
  ativo: "bg-success/10 text-success",
  concluido: "bg-primary/10 text-primary",
  arquivado: "bg-muted text-muted-foreground",
};

export default function Casos() {
  const [casos, setCasos] = useState<Caso[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("casos")
        .select("id, codigo, status, etapa_atual, criado_em, clientes(nome)")
        .order("criado_em", { ascending: false });
      setCasos((data as any) ?? []);
      setLoading(false);
    }
    fetch();
  }, []);

  const filtered = casos.filter((c) =>
    c.codigo.toLowerCase().includes(search.toLowerCase()) ||
    c.clientes?.nome?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Casos</h1>
          <p className="text-muted-foreground mt-1">{casos.length} registrados</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          Novo Caso
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

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Código</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Etapa</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhum caso encontrado</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-mono font-medium text-foreground">{c.codigo}</td>
                  <td className="px-4 py-3 text-foreground">{c.clientes?.nome ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[c.status] ?? "bg-muted text-muted-foreground"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.etapa_atual}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(c.criado_em).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
