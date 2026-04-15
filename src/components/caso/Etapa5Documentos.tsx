import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FileText, Plus, Pencil, Trash2, Download, ArrowLeft,
  FileSignature, Scale, Shield, Receipt, ScrollText, File, BookCheck,
  FileDown, FileType,
} from "lucide-react";
import { DocumentEditor } from "./DocumentEditor";
import { ChecklistDocumentos } from "./ChecklistDocumentos";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import {
  BUILTIN_TEMPLATES, buildVariableMap, replaceVariables,
} from "@/lib/documentTemplates";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  A4_HEIGHT_PX,
  A4_WIDTH_PX,
  applyDocumentPageBreaks,
  MM_TO_PX,
  PAGE_GAP,
} from "@/lib/documentPagination";
import { exportToWord } from "@/lib/exportWord";

interface Props {
  caso: any;
  onSave?: (field: string, value: any) => void;
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

export function Etapa5Documentos({ caso, onSave }: Props) {
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

    const marginsPx = {
      top: Math.round(25 * MM_TO_PX),
      bottom: Math.round(25 * MM_TO_PX),
      left: Math.round(20 * MM_TO_PX),
      right: Math.round(20 * MM_TO_PX),
    };
    const contentHeightPerPage = A4_HEIGHT_PX - marginsPx.top - marginsPx.bottom;

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-10000px";
    container.style.top = "0";
    container.style.width = `${A4_WIDTH_PX}px`;
    container.style.background = "white";

    const style = document.createElement("style");
    style.textContent = `
      .export-doc-frame { position: relative; width: ${A4_WIDTH_PX}px; }
      .export-doc-page { position: absolute; left: 0; width: ${A4_WIDTH_PX}px; height: ${A4_HEIGHT_PX}px; background: white; }
      .export-doc-content { position: relative; z-index: 1; width: ${A4_WIDTH_PX}px; padding: ${marginsPx.top}px ${marginsPx.right}px ${marginsPx.bottom}px ${marginsPx.left}px; }
      .export-doc-content .ProseMirror,
      .export-doc-content .export-prosemirror {
        outline: none;
        min-height: ${contentHeightPerPage}px;
        font-family: "Times New Roman", serif;
        font-size: 12pt;
        line-height: 1.6;
        color: #1a1a1a;
      }
      .export-doc-content .export-prosemirror h1 { font-size: 16pt; font-weight: 700; margin-bottom: 12px; line-height: 1.3; }
      .export-doc-content .export-prosemirror h2 { font-size: 13pt; font-weight: 700; margin-bottom: 8px; margin-top: 18px; line-height: 1.3; }
      .export-doc-content .export-prosemirror h3 { font-size: 12pt; font-weight: 700; margin-bottom: 6px; margin-top: 14px; line-height: 1.3; }
      .export-doc-content .export-prosemirror p { margin-bottom: 8px; font-size: inherit; line-height: 1.6; color: #1a1a1a; }
      .export-doc-content .export-prosemirror table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
      .export-doc-content .export-prosemirror td,
      .export-doc-content .export-prosemirror th { border: 1px solid #d1d5db; padding: 6px 10px; font-size: 10pt; vertical-align: top; }
      .export-doc-content .export-prosemirror th { background: #f3f4f6; font-weight: 600; }
      .export-doc-content .export-prosemirror ul { list-style: disc; padding-left: 24px; margin-bottom: 8px; }
      .export-doc-content .export-prosemirror ol { list-style: decimal; padding-left: 24px; margin-bottom: 8px; }
      .export-doc-content .export-prosemirror li { font-size: inherit; margin-bottom: 4px; }
      .export-doc-content .export-prosemirror hr { border: none; border-top: 1px solid #d1d5db; margin: 16px 0; }
      .export-doc-content .export-prosemirror img { max-width: 100%; height: auto; }
      .export-doc-content .export-prosemirror .tableWrapper { overflow: hidden; }
    `;

    const frame = document.createElement("div");
    frame.className = "export-doc-frame";

    const contentLayer = document.createElement("div");
    contentLayer.className = "export-doc-content";

    const contentRoot = document.createElement("div");
    contentRoot.className = "export-prosemirror";
    contentRoot.innerHTML = htmlContent;

    contentLayer.appendChild(contentRoot);
    container.append(style, frame);
    frame.appendChild(contentLayer);
    document.body.appendChild(container);

    try {
      const pageCount = applyDocumentPageBreaks(contentRoot, {
        contentHeightPerPage,
        marginsPx,
        overflowThreshold: 0,
      });

      frame.style.height = `${pageCount * A4_HEIGHT_PX + (pageCount - 1) * PAGE_GAP}px`;

      Array.from({ length: pageCount }).forEach((_, index) => {
        const page = document.createElement("div");
        page.className = "export-doc-page";
        page.style.top = `${index * (A4_HEIGHT_PX + PAGE_GAP)}px`;
        frame.insertBefore(page, contentLayer);
      });

      const canvas = await html2canvas(frame, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: A4_WIDTH_PX,
        height: frame.offsetHeight,
        windowWidth: A4_WIDTH_PX,
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const scale = canvas.width / A4_WIDTH_PX;

      for (let page = 0; page < pageCount; page++) {
        if (page > 0) pdf.addPage();

        const srcY = Math.round(page * (A4_HEIGHT_PX + PAGE_GAP) * scale);
        const srcH = Math.min(Math.round(A4_HEIGHT_PX * scale), canvas.height - srcY);

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = srcH;
        const ctx = pageCanvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

        const pageImgData = pageCanvas.toDataURL("image/png");
        pdf.addImage(pageImgData, "PNG", 0, 0, 210, 297);
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

      {/* Checklist de Documentos */}
      <ChecklistDocumentos caso={caso} docs={docs.map(d => ({ titulo: d.titulo, conteudo: d.conteudo }))} onSave={onSave} />

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
