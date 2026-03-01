import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TemplateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId?: string | null;
  onSaved: () => void;
}

export function TemplateForm({ open, onOpenChange, templateId, onSaved }: TemplateFormProps) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("custom");
  const [descricao, setDescricao] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (templateId && open) {
      supabase.from("templates").select("*").eq("id", templateId).single().then(({ data }) => {
        if (data) {
          setNome(data.nome);
          setTipo(data.tipo);
          setDescricao(data.descricao || "");
          setConteudo(data.conteudo || "");
        }
      });
    } else if (!templateId) {
      setNome(""); setTipo("custom"); setDescricao(""); setConteudo("");
    }
  }, [templateId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { toast.error("Nome é obrigatório"); return; }
    setLoading(true);

    const payload = { nome, tipo, descricao, conteudo };
    const { error } = templateId
      ? await supabase.from("templates").update(payload).eq("id", templateId)
      : await supabase.from("templates").insert(payload);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success(templateId ? "Template atualizado!" : "Template criado!");
      onSaved();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{templateId ? "Editar Template" : "Novo Template"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Nome *</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputClass}>
              <option value="custom">Personalizado</option>
              <option value="proposta">Proposta</option>
              <option value="honorarios">Contrato de Honorários</option>
              <option value="procuracao">Procuração</option>
              <option value="hipossuficiencia">Declaração de Hipossuficiência</option>
              <option value="peticao">Petição</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Descrição</label>
            <input value={descricao} onChange={(e) => setDescricao(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Conteúdo</label>
            <p className="text-xs text-muted-foreground mb-1">
              Use variáveis como {"{{cliente.nome}}"}, {"{{contrato.valorFinanciado}}"}, etc.
            </p>
            <textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} className={inputClass + " min-h-[200px] font-mono text-xs"} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-lg border border-input bg-background text-foreground text-sm hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
