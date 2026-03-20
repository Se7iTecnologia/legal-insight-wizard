import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FileText, Plus, Pencil, Trash2, Download, ArrowLeft,
  FileSignature, Scale, Shield, Receipt, ScrollText, File, BookCheck,
} from "lucide-react";
import { DocumentEditor } from "./DocumentEditor";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import {
  BUILTIN_TEMPLATES, buildVariableMap, replaceVariables,
} from "@/lib/documentTemplates";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Props {
  caso: any;
}

interface DocRecord {
  id: string;
  titulo: string;
  tipo: string;
  conteudo: string;
  criado_em: string;
  versao: number;
}

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

export function Etapa5Documentos({ caso }: Props) {
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDoc, setEditingDoc] = useState<DocRecord | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"list" | "editor">("list");

  const variableMap = buildVariableMap(caso);

  const fetchDocs = useCallback(async () => {
    const [dRes, tRes] = await Promise.all([
      supabase.from("documentos_caso").select("id, titulo, tipo, conteudo, criado_em, versao")
        .eq("caso_id", caso.id).order("criado_em", { ascending: false }),
      supabase.from("templates").select("id, nome, tipo, conteudo, descricao").order("nome"),
    ]);
    setDocs(dRes.data as DocRecord[] ?? []);
    setCustomTemplates(tRes.data ?? []);
    setLoading(false);
  }, [caso.id]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const generateFromTemplate = async (template: { nome: string; tipo: string; conteudo: string }) => {
    const processedContent = replaceVariables(template.conteudo, variableMap);

    const { data, error } = await supabase.from("documentos_caso").insert({
      caso_id: caso.id,
      titulo: template.nome,
      tipo: template.tipo || "custom",
      conteudo: processedContent,
    }).select("id, titulo, tipo, conteudo, criado_em, versao").single();

    if (error) {
      toast.error("Erro ao gerar documento");
      return;
    }
    toast.success("Documento gerado!");
    setEditingDoc(data as DocRecord);
    setEditorContent((data as DocRecord).conteudo);
    setView("editor");
    fetchDocs();
  };

  const saveDocument = async () => {
    if (!editingDoc) return;
    setSaving(true);
    const { error } = await supabase.from("documentos_caso")
      .update({ conteudo: editorContent, versao: (editingDoc.versao || 1) + 1 })
      .eq("id", editingDoc.id);
    if (error) toast.error("Erro ao salvar");
    else {
      toast.success("Documento salvo!");
      setEditingDoc({ ...editingDoc, conteudo: editorContent, versao: (editingDoc.versao || 1) + 1 });
      fetchDocs();
    }
    setSaving(false);
  };

  const openDoc = (doc: DocRecord) => {
    setEditingDoc(doc);
    setEditorContent(doc.conteudo);
    setView("editor");
  };

  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [deletingDoc, setDeletingDoc] = useState(false);

  const deleteDoc = async () => {
    if (!deleteDocId) return;
    setDeletingDoc(true);
    const { error } = await supabase.from("documentos_caso").delete().eq("id", deleteDocId);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Documento excluído"); fetchDocs(); }
    setDeleteDocId(null);
    setDeletingDoc(false);
  };

  const exportDocPDF = async () => {
    if (!editingDoc) return;
    toast.info("Gerando PDF...");

    // Create a temporary container matching editor styles
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "794px"; // A4 at 96dpi
    container.style.padding = "94px 76px"; // ~25mm/20mm margins
    container.style.backgroundColor = "white";
    container.style.fontFamily = "Times, serif";
    container.style.fontSize = "11pt";
    container.style.lineHeight = "1.6";
    container.style.color = "#1a1a1a";
    container.innerHTML = `<style>
      h1 { font-size: 14pt; font-weight: bold; margin-bottom: 12px; }
      h2 { font-size: 12pt; font-weight: bold; margin-bottom: 8px; margin-top: 16px; }
      p { margin-bottom: 8px; font-size: 11pt; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
      td, th { border: 1px solid #ccc; padding: 6px 8px; font-size: 10pt; }
      th { background: #f3f4f6; font-weight: 600; }
      ul { list-style: disc; padding-left: 20px; margin-bottom: 8px; }
      ol { list-style: decimal; padding-left: 20px; margin-bottom: 8px; }
      li { font-size: 11pt; margin-bottom: 4px; }
    </style>${editorContent}`;
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 794,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const contentWidth = pageWidth;
      const imgHeight = (canvas.height * contentWidth) / canvas.width;

      let y = 0;
      let remaining = imgHeight;

      while (remaining > 0) {
        if (y > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, -y, contentWidth, imgHeight);
        y += pageHeight;
        remaining -= pageHeight;
      }

      pdf.save(`${editingDoc.titulo}.pdf`);
      toast.success("PDF exportado!");
    } catch {
      toast.error("Erro ao gerar PDF");
    } finally {
      document.body.removeChild(container);
    }
  };

  if (loading) return <p className="text-muted-foreground">Carregando...</p>;

  // Editor view
  if (view === "editor" && editingDoc) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button onClick={() => setView("list")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar aos Documentos
          </button>
          <div className="flex items-center gap-2">
            <button onClick={exportDocPDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm hover:bg-muted transition-colors">
              <Download className="w-4 h-4" /> PDF
            </button>
            <button onClick={saveDocument} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar Documento"}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">{editingDoc.titulo}</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">v{editingDoc.versao || 1}</span>
        </div>
        <DocumentEditor content={editorContent} onChange={setEditorContent} />
      </div>
    );
  }

  // List view
  const allTemplates = customTemplates.map(t => ({ ...t, source: "custom" as const, conteudo: t.conteudo || "" }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-heading font-semibold text-foreground">Documentos do Caso</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Gere documentos jurídicos prontos com os dados do caso e do cliente preenchidos automaticamente.
      </p>

      {/* Templates grid */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Gerar Novo Documento
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {allTemplates.map((t) => {
            const IconComp = tipoIcons[t.tipo] || FileText;
            const color = tipoColors[t.tipo] || "text-muted-foreground";
            return (
              <button key={t.id} onClick={() => generateFromTemplate(t)}
                className="bg-card rounded-xl border border-border p-4 text-left hover:border-primary/40 hover:shadow-md transition-all group active:scale-[0.98]">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 ${color}`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm leading-tight">{t.nome}</p>
                    {t.source === "custom" && (
                      <span className="text-[10px] bg-warning/15 text-warning px-1.5 py-0.5 rounded-full mt-1 inline-block">Personalizado</span>
                    )}
                    {"descricao" in t && t.descricao && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.descricao}</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generated docs */}
      {docs.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground">
            Documentos Gerados ({docs.length})
          </h3>
          <div className="space-y-2">
            {docs.map((d) => {
              const IconComp = tipoIcons[d.tipo] || FileText;
              const color = tipoColors[d.tipo] || "text-muted-foreground";
              return (
                <div key={d.id} className="flex items-center gap-3 bg-muted/30 rounded-lg px-4 py-3 group hover:bg-muted/50 transition-colors">
                  <div className={`w-8 h-8 rounded-lg bg-card flex items-center justify-center shrink-0 ${color}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{d.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      v{d.versao || 1} · {new Date(d.criado_em).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openDoc(d)} title="Editar"
                      className="p-1.5 rounded-md hover:bg-background transition-colors">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => setDeleteDocId(d.id)} title="Excluir"
                      className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
