import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, FileText } from "lucide-react";

interface Template {
  id: string;
  nome: string;
  tipo: string;
  descricao: string | null;
  atualizado_em: string | null;
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from("templates").select("id, nome, tipo, descricao, atualizado_em").order("nome");
      setTemplates(data ?? []);
      setLoading(false);
    }
    fetch();
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Templates</h1>
          <p className="text-muted-foreground mt-1">Modelos de documentos</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          Novo Template
        </button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : templates.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum template cadastrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-foreground truncate">{t.nome}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.tipo}</p>
                  {t.descricao && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{t.descricao}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
