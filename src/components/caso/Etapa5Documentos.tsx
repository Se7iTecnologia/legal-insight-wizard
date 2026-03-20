import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FileText, Plus, Pencil, Trash2, Download, ArrowLeft,
  FileSignature, Scale, Shield, Receipt, ScrollText, File, BookCheck,
  FileDown, FileType,
} from "lucide-react";
import { DocumentEditor } from "./DocumentEditor";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import {
  BUILTIN_TEMPLATES, buildVariableMap, replaceVariables,
} from "@/lib/documentTemplates";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { exportToWord } from "@/lib/exportWord";

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

  const doExportPDF = async (htmlContent: string, title: string) => {
    toast.info("Gerando PDF...");

    // A4 dimensions at 96dpi
    const pageW = 794;
    const pageH = 1123;
    const padX = 76;  // ~20mm
    const padY = 94;  // ~25mm
    const contentH = pageH - padY * 2;

    // Render the content off-screen to measure total height
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = `${pageW - padX * 2}px`;
    container.style.backgroundColor = "white";
    container.style.fontFamily = '"Times New Roman", Times, serif';
    container.style.fontSize = "12pt";
    container.style.lineHeight = "1.6";
    container.style.color = "#1a1a1a";
    container.innerHTML = `<style>
      h1 { font-size: 16pt; font-weight: bold; margin-bottom: 12px; }
      h2 { font-size: 13pt; font-weight: bold; margin-bottom: 8px; margin-top: 18px; }
      h3 { font-size: 12pt; font-weight: bold; margin-bottom: 6px; margin-top: 14px; }
      p { margin-bottom: 8px; font-size: 12pt; line-height: 1.6; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
      td, th { border: 1px solid #d1d5db; padding: 6px 10px; font-size: 10pt; }
      th { background: #f3f4f6; font-weight: 600; }
      ul { list-style: disc; padding-left: 24px; margin-bottom: 8px; }
      ol { list-style: decimal; padding-left: 24px; margin-bottom: 8px; }
      li { font-size: 12pt; margin-bottom: 4px; }
      hr { border: none; border-top: 1px solid #d1d5db; margin: 16px 0; }
    </style>${htmlContent}`;
    document.body.appendChild(container);

    try {
      // Capture full content as one tall image
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: pageW - padX * 2,
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfW = 210;
      const pdfH = 297;
      const marginXmm = 20;
      const marginYmm = 25;
      const contentWmm = pdfW - marginXmm * 2;
      const contentHmm = pdfH - marginYmm * 2;

      // Scale canvas to content area
      const scaledImgH = (canvas.height * contentWmm) / canvas.width;
      const totalPages = Math.ceil(scaledImgH / contentHmm);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();

        // Clip the image for this page
        const srcY = (page * contentHmm / scaledImgH) * canvas.height;
        const srcH = Math.min((contentHmm / scaledImgH) * canvas.height, canvas.height - srcY);

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.round(srcH);
        const ctx = pageCanvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, Math.round(srcY), canvas.width, Math.round(srcH), 0, 0, canvas.width, Math.round(srcH));

        const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.95);
        const thisPageHmm = (pageCanvas.height * contentWmm) / pageCanvas.width;
        pdf.addImage(pageImgData, "JPEG", marginXmm, marginYmm, contentWmm, thisPageHmm);
      }

      pdf.save(`${title}.pdf`);
      toast.success("PDF exportado!");
    } catch { toast.error("Erro ao gerar PDF"); }
    finally { document.body.removeChild(container); }
  };

  const doExportWord = async (htmlContent: string, title: string) => {
    toast.info("Gerando Word...");
    try {
      await exportToWord(htmlContent, title);
      toast.success("Word exportado!");
    } catch { toast.error("Erro ao gerar Word"); }
  };

  const exportDocPDF = () => {
    if (!editingDoc) return;
    doExportPDF(editorContent, editingDoc.titulo);
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
              <button onClick={() => { if (editingDoc) doExportWord(editorContent, editingDoc.titulo); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm hover:bg-muted transition-colors">
                <FileType className="w-4 h-4" /> Word
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
                    <button onClick={() => doExportPDF(d.conteudo, d.titulo)} title="Exportar PDF"
                      className="p-1.5 rounded-md hover:bg-background transition-colors">
                      <FileDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => doExportWord(d.conteudo, d.titulo)} title="Exportar Word"
                      className="p-1.5 rounded-md hover:bg-background transition-colors">
                      <FileType className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
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

      <ConfirmDelete
        open={!!deleteDocId}
        onOpenChange={(o) => !o && setDeleteDocId(null)}
        onConfirm={deleteDoc}
        loading={deletingDoc}
        description="Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita."
      />
    </div>
  );
}
