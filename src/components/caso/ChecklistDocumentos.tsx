import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CheckCircle2, Circle, Upload, Plus, Trash2, Save,
  FileCheck, Paperclip, X, Package,
} from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { exportToWordBlob } from "@/lib/exportWord";

interface ChecklistItem {
  id: string;
  nome: string;
  anexado: boolean;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  arquivo_path?: string | null;
  custom: boolean;
}

interface Props {
  caso: any;
  docs: { titulo: string; conteudo: string }[];
  onSave?: (field: string, value: any) => void;
  onRegisterSaveHandler?: (handler: (() => Promise<void>) | null) => void;
}

const DEFAULT_ITEMS: Omit<ChecklistItem, "id">[] = [
  { nome: "Documento de identidade (RG ou CNH)", anexado: false, arquivo_url: null, arquivo_nome: null, arquivo_path: null, custom: false },
  { nome: "CPF", anexado: false, arquivo_url: null, arquivo_nome: null, arquivo_path: null, custom: false },
  { nome: "Comprovante de endereço atualizado", anexado: false, arquivo_url: null, arquivo_nome: null, arquivo_path: null, custom: false },
  { nome: "Contrato bancário assinado", anexado: false, arquivo_url: null, arquivo_nome: null, arquivo_path: null, custom: false },
  { nome: "Cálculos ou planilha revisional", anexado: false, arquivo_url: null, arquivo_nome: null, arquivo_path: null, custom: false },
  { nome: "Holerite, extrato bancário ou comprovação de renda", anexado: false, arquivo_url: null, arquivo_nome: null, arquivo_path: null, custom: false },
  { nome: "Comprovantes de despesas mensais", anexado: false, arquivo_url: null, arquivo_nome: null, arquivo_path: null, custom: false },
  { nome: "Declaração de hipossuficiência", anexado: false, arquivo_url: null, arquivo_nome: null, arquivo_path: null, custom: false },
  { nome: "Procuração assinada", anexado: false, arquivo_url: null, arquivo_nome: null, arquivo_path: null, custom: false },
  { nome: "Contrato de honorários", anexado: false, arquivo_url: null, arquivo_nome: null, arquivo_path: null, custom: false },
];

function genId() {
  return crypto.randomUUID();
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "documento";
}

export function ChecklistDocumentos({ caso, docs, onSave, onRegisterSaveHandler }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const contrato = caso.contrato as Record<string, any> | null;
    const saved = contrato?.checklist;
    if (saved && Array.isArray(saved) && saved.length > 0) {
      setItems(saved as ChecklistItem[]);
    } else {
      setItems(DEFAULT_ITEMS.map((item) => ({ ...item, id: genId() })));
    }
  }, [caso.id, caso.contrato]);

  const completedCount = items.filter((i) => i.anexado).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const persistChecklist = useCallback(async () => {
    setSaving(true);
    const currentContrato = (caso.contrato as Record<string, any>) || {};
    const updatedContrato = {
      ...currentContrato,
      checklist: JSON.parse(JSON.stringify(items)),
    };

    const { error } = await supabase
      .from("casos")
      .update({ contrato: updatedContrato as any })
      .eq("id", caso.id);

    if (error) {
      toast.error("Erro ao salvar checklist");
      setSaving(false);
      return;
    }

    onSave?.("contrato", updatedContrato);
    toast.success("Checklist salva!");
    setSaving(false);
  }, [caso.contrato, caso.id, items, onSave]);

  useEffect(() => {
    onRegisterSaveHandler?.(persistChecklist);
    return () => onRegisterSaveHandler?.(null);
  }, [onRegisterSaveHandler, persistChecklist]);

  const handleFileUpload = async (itemId: string, file: File) => {
    setUploading(itemId);
    const ext = file.name.split(".").pop();
    const path = `checklist/${caso.id}/${itemId}.${ext}`;

    const { error } = await supabase.storage
      .from("contratos")
      .upload(path, file, { upsert: true });

    if (error) {
      toast.error("Erro ao enviar arquivo");
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("contratos")
      .getPublicUrl(path);

    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              anexado: true,
              arquivo_url: urlData.publicUrl,
              arquivo_nome: file.name,
              arquivo_path: path,
            }
          : item,
      ),
    );

    toast.success("Documento anexado! Agora clique em salvar.");
    setUploading(null);
  };

  const removeAttachment = async (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const fallbackExt = item.arquivo_nome?.split(".").pop() || "pdf";
    const path = item.arquivo_path || `checklist/${caso.id}/${itemId}.${fallbackExt}`;
    await supabase.storage.from("contratos").remove([path]);

    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, anexado: false, arquivo_url: null, arquivo_nome: null, arquivo_path: null }
          : i,
      ),
    );

    toast.success("Anexo removido");
  };

  const addCustomItem = () => {
    if (!newItemName.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        id: genId(),
        nome: newItemName.trim(),
        anexado: false,
        arquivo_url: null,
        arquivo_nome: null,
        arquivo_path: null,
        custom: true,
      },
    ]);
    setNewItemName("");
    setShowAddInput(false);
  };

  const removeCustomItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const downloadZip = async () => {
    setZipping(true);
    toast.info("Preparando ZIP...");

    try {
      const zip = new JSZip();
      const docsFolder = zip.folder("documentos-gerados-word");
      const anexosFolder = zip.folder("anexos-checklist");

      for (const doc of docs) {
        const wordBlob = await exportToWordBlob(doc.conteudo);
        docsFolder?.file(`${sanitizeFileName(doc.titulo)}.docx`, wordBlob);
      }

      for (const item of items) {
        if (!item.anexado) continue;

        try {
          let fileBlob: Blob | null = null;

          if (item.arquivo_path) {
            const { data } = await supabase.storage.from("contratos").download(item.arquivo_path);
            fileBlob = data ?? null;
          } else if (item.arquivo_url) {
            const response = await fetch(item.arquivo_url);
            fileBlob = await response.blob();
          }

          if (!fileBlob) continue;

          const fileName = sanitizeFileName(item.arquivo_nome || item.nome);
          anexosFolder?.file(fileName, fileBlob);
        } catch {
          console.warn(`Não foi possível baixar: ${item.nome}`);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${sanitizeFileName(caso.codigo || "caso")}-protocolo.zip`);
      toast.success("ZIP baixado com sucesso!");
    } catch {
      toast.error("Erro ao gerar ZIP");
    }

    setZipping(false);
  };

  return (
    <div className="space-y-4 pt-6 border-t border-border">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Checklist de Documentos — Ação de Juros Abusivos
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={persistChecklist} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            <Save className="w-3.5 h-3.5" />
            {saving ? "Salvando..." : "Salvar Checklist"}
          </button>
          <button onClick={downloadZip} disabled={zipping}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-warning text-white text-xs font-medium hover:bg-warning/90 transition-colors disabled:opacity-50">
            <Package className="w-3.5 h-3.5" />
            {zipping ? "Gerando..." : "Baixar ZIP Protocolo"}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{completedCount} de {totalCount} documentos anexados</span>
          <span className={`font-semibold ${progressPercent === 100 ? "text-[hsl(var(--success))]" : "text-primary"}`}>
            {progressPercent}%
          </span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressPercent === 100 ? "bg-[hsl(var(--success))]" : "bg-primary"}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {progressPercent === 100 && (
          <p className="text-xs text-[hsl(var(--success))] font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Todos os documentos foram anexados! Pronto para protocolo.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
              item.anexado ? "bg-[hsl(var(--success))]/5 border-[hsl(var(--success))]/20" : "bg-muted/30 border-border"
            }`}>
            {item.anexado ? (
              <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))] shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${item.anexado ? "text-foreground" : "text-muted-foreground"}`}>{item.nome}</p>
              {item.arquivo_nome && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Paperclip className="w-3 h-3" /> {item.arquivo_nome}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {item.anexado ? (
                <button onClick={() => removeAttachment(item.id)}
                  className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors" title="Remover anexo">
                  <X className="w-3.5 h-3.5 text-destructive" />
                </button>
              ) : (
                <>
                  <input type="file" ref={(el) => { fileRefs.current[item.id] = el; }} className="hidden"
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(item.id, file); }} />
                  <button onClick={() => fileRefs.current[item.id]?.click()} disabled={uploading === item.id}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50">
                    <Upload className="w-3 h-3" /> {uploading === item.id ? "Enviando..." : "Anexar"}
                  </button>
                </>
              )}
              {item.custom && !item.anexado && (
                <button onClick={() => removeCustomItem(item.id)}
                  className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors" title="Remover item">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAddInput ? (
        <div className="flex items-center gap-2">
          <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomItem()}
            placeholder="Nome do documento..."
            className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus />
          <button onClick={addCustomItem}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
            Adicionar
          </button>
          <button onClick={() => { setShowAddInput(false); setNewItemName(""); }}
            className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-xs hover:bg-muted transition-colors">
            Cancelar
          </button>
        </div>
      ) : (
        <button onClick={() => setShowAddInput(true)}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
          <Plus className="w-4 h-4" /> Adicionar documento personalizado
        </button>
      )}
    </div>
  );
}
