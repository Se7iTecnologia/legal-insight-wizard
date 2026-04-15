import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, FileText, Pencil, Trash2, ArrowLeft, Save,
  Scale, FileSignature, Shield, ScrollText, Receipt, BookCheck, File,
} from "lucide-react";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { DocumentEditor } from "@/components/caso/DocumentEditor";
import { toast } from "sonner";

interface Template {
  id: string;
  nome: string;
  tipo: string;
  descricao: string | null;
  conteudo: string;
  atualizado_em: string | null;
}

const tipoLabel: Record<string, string> = {
  custom: "Personalizado",
  proposta: "Proposta",
  honorarios: "Honorários",
  procuracao: "Procuração",
  hipossuficiencia: "Hipossuficiência",
  peticao: "Petição",
  autorizacao: "Termo de Autorização",
};

const tipoIcons: Record<string, any> = {
  peticao: Scale,
  honorarios: FileSignature,
  hipossuficiencia: Shield,
  procuracao: ScrollText,
  proposta: Receipt,
  autorizacao: BookCheck,
  custom: File,
};

const tipoColors: Record<string, string> = {
  peticao: "text-primary",
  honorarios: "text-[hsl(var(--info-purple))]",
  hipossuficiencia: "text-[hsl(var(--success))]",
  procuracao: "text-[hsl(var(--info-orange))]",
  proposta: "text-[hsl(var(--warning))]",
  autorizacao: "text-[hsl(var(--success))]",
  custom: "text-muted-foreground",
};

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Editor state
  const [view, setView] = useState<"list" | "editor">("list");
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("custom");
  const [descricao, setDescricao] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from("templates")
      .select("id, nome, tipo, descricao, conteudo, atualizado_em")
      .order("nome");
    setTemplates(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from("templates").delete().eq("id", deleteId);
    if (error) toast.error(mapDatabaseError(error));
    else {
      toast.success("Template excluído!");
      fetchTemplates();
    }
    setDeleteId(null);
    setDeleting(false);
  };

  const openNewTemplate = () => {
    setEditId(null);
    setNome("");
    setTipo("custom");
    setDescricao("");
    setConteudo("<p>Digite o conteúdo do template aqui...</p><p>Use variáveis como <strong>{{cliente.nome}}</strong>, <strong>{{contrato.valorFinanciado}}</strong>, etc.</p>");
    setView("editor");
  };

  const openEditTemplate = (t: Template) => {
    setEditId(t.id);
    setNome(t.nome);
    setTipo(t.tipo);
    setDescricao(t.descricao || "");
    setConteudo(t.conteudo || "");
    setView("editor");
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    const payload = { nome, tipo, descricao, conteudo };
    const { error } = editId
      ? await supabase.from("templates").update(payload).eq("id", editId)
      : await supabase.from("templates").insert(payload);

    if (error) {
      toast.error(mapDatabaseError(error));
    } else {
      toast.success(editId ? "Template atualizado!" : "Template criado!");
      fetchTemplates();
      setView("list");
    }
    setSaving(false);
  };

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  // Editor view
  if (view === "editor") {
    return (
      <div className="animate-fade-in space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={() => setView("list")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar aos Templates
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar Template"}
          </button>
        </div>

        {/* Template metadata */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Nome do Template *
              </label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={inputClass}
                placeholder="Ex: Petição Inicial Revisional"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Tipo
              </label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputClass}>
                <option value="custom">Personalizado</option>
                <option value="peticao">Petição</option>
                <option value="honorarios">Contrato de Honorários</option>
                <option value="procuracao">Procuração</option>
                <option value="hipossuficiencia">Declaração de Hipossuficiência</option>
                <option value="proposta">Proposta</option>
                <option value="autorizacao">Termo de Autorização</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Descrição
              </label>
              <input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className={inputClass}
                placeholder="Breve descrição do template"
              />
            </div>
          </div>
        </div>

        {/* Rich text editor */}
        <DocumentEditor content={conteudo} onChange={setConteudo} />
      </div>
    );
  }

  // List view
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Templates</h1>
          <p className="text-muted-foreground mt-1">
            Modelos de documentos — aparecerão na aba Documentos dos casos
          </p>
        </div>
        <button
          onClick={openNewTemplate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Template</span>
        </button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : templates.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum template cadastrado</p>
          <p className="text-xs text-muted-foreground mt-1">
            Crie templates personalizados que aparecerão na geração de documentos dos casos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => {
            const IconComp = tipoIcons[t.tipo] || FileText;
            const color = tipoColors[t.tipo] || "text-muted-foreground";
            return (
              <div
                key={t.id}
                className="bg-card rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/30 transition-all group cursor-pointer"
                onClick={() => openEditTemplate(t)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 ${color}`}
                  >
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-foreground truncate">{t.nome}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tipoLabel[t.tipo] || t.tipo}
                    </p>
                    {t.descricao && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {t.descricao}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditTemplate(t);
                      }}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(t.id);
                      }}
                      className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDelete
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
