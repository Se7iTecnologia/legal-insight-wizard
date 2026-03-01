import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText } from "lucide-react";

interface Props {
  caso: any;
}

export function Etapa5Documentos({ caso }: Props) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("templates").select("id, nome, tipo, conteudo").order("nome"),
      supabase.from("documentos_caso").select("id, titulo, tipo, criado_em").eq("caso_id", caso.id).order("criado_em", { ascending: false }),
    ]).then(([tRes, dRes]) => {
      setTemplates(tRes.data ?? []);
      setDocs(dRes.data ?? []);
      setLoading(false);
    });
  }, [caso.id]);

  const generateDoc = async (template: any) => {
    const c = (caso.contrato as any) || {};
    let content = template.conteudo || "";
    // Replace variables
    const vars: Record<string, string> = {
      "{{cliente.nome}}": caso.clientes?.nome || "",
      "{{cliente.cpf_cnpj}}": caso.clientes?.cpf_cnpj || "",
      "{{contrato.valorFinanciado}}": c.valorFinanciado || "",
      "{{contrato.parcela}}": c.parcela || "",
      "{{contrato.taxaMensal}}": c.taxaMensal || "",
      "{{contrato.prazoMeses}}": c.prazoMeses || "",
      "{{contrato.banco}}": c.banco || c.instituicao || "",
      "{{caso.codigo}}": caso.codigo || "",
    };
    for (const [k, v] of Object.entries(vars)) {
      content = content.replaceAll(k, v);
    }

    const { error } = await supabase.from("documentos_caso").insert({
      caso_id: caso.id,
      titulo: template.nome,
      tipo: template.tipo || "custom",
      conteudo: content,
    });

    if (!error) {
      const { data } = await supabase.from("documentos_caso").select("id, titulo, tipo, criado_em").eq("caso_id", caso.id).order("criado_em", { ascending: false });
      setDocs(data ?? []);
    }
  };

  if (loading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-heading font-semibold text-foreground">Meus Templates</h2>
      </div>
      <p className="text-sm text-muted-foreground">Templates personalizados com variáveis preenchidas automaticamente.</p>

      {templates.length === 0 ? (
        <div className="bg-muted/30 rounded-xl p-8 text-center">
          <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum template cadastrado</p>
          <p className="text-xs text-muted-foreground mt-1">Cadastre templates na seção de Templates</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((t) => (
            <button key={t.id} onClick={() => generateDoc(t)}
              className="bg-card rounded-xl border-2 border-warning/30 p-5 text-left hover:border-warning hover:shadow-md transition-all group">
              <FileText className="w-8 h-8 text-warning/60 mb-3" />
              <p className="font-medium text-foreground text-sm uppercase leading-tight">{t.nome}</p>
            </button>
          ))}
        </div>
      )}

      {docs.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border">
          <h3 className="text-sm font-medium text-foreground">Documentos Gerados ({docs.length})</h3>
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-3 bg-muted/30 rounded-lg px-4 py-3">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{d.titulo}</p>
                <p className="text-xs text-muted-foreground">{d.tipo} · {new Date(d.criado_em).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
