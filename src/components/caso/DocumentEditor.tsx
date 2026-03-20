import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import FontFamily from "@tiptap/extension-font-family";
import Image from "@tiptap/extension-image";
import { FontSize } from "@/lib/fontSize";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Undo2, Redo2, Palette,
  Table as TableIcon, Code, Minus, ChevronDown, Highlighter,
  Indent, Outdent,
} from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { AVAILABLE_VARIABLES, type DocVariable } from "@/lib/documentTemplates";

interface Props {
  content: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
}

const FONTS = [
  { value: "Times New Roman, serif", label: "Times New Roman" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Calibri, sans-serif", label: "Calibri" },
  { value: "Verdana, sans-serif", label: "Verdana" },
  { value: "Tahoma, sans-serif", label: "Tahoma" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Garamond, serif", label: "Garamond" },
  { value: "Trebuchet MS, sans-serif", label: "Trebuchet MS" },
  { value: "Courier New, monospace", label: "Courier New" },
  { value: "Lucida Console, monospace", label: "Lucida Console" },
];

const FONT_SIZES = [
  "8pt", "9pt", "10pt", "10.5pt", "11pt", "12pt", "13pt", "14pt",
  "16pt", "18pt", "20pt", "22pt", "24pt", "28pt", "32pt", "36pt", "48pt", "72pt",
];

const HIGHLIGHT_COLORS = [
  { color: "#fef08a", label: "Amarelo" },
  { color: "#bbf7d0", label: "Verde" },
  { color: "#bfdbfe", label: "Azul" },
  { color: "#fecaca", label: "Vermelho" },
  { color: "#e9d5ff", label: "Roxo" },
  { color: "#fed7aa", label: "Laranja" },
];

export function DocumentEditor({ content, onChange, readOnly }: Props) {
  const [showVars, setShowVars] = useState(false);
  const [varSearch, setVarSearch] = useState("");
  const [showHighlight, setShowHighlight] = useState(false);
  const varsRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [showMargins, setShowMargins] = useState(false);
  const [margins, setMargins] = useState({ top: 25, bottom: 25, left: 20, right: 20 });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      FontSize,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (varsRef.current && !varsRef.current.contains(e.target as Node)) setShowVars(false);
      if (highlightRef.current && !highlightRef.current.contains(e.target as Node)) setShowHighlight(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const insertVariable = useCallback((v: DocVariable) => {
    if (!editor) return;
    editor.chain().focus().insertContent(v.key).run();
    setShowVars(false);
  }, [editor]);

  if (!editor) return null;

  const grouped = AVAILABLE_VARIABLES.reduce((acc, v) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {} as Record<string, DocVariable[]>);

  const filteredGrouped = Object.entries(grouped).reduce((acc, [cat, vars]) => {
    const filtered = vars.filter(v =>
      v.label.toLowerCase().includes(varSearch.toLowerCase()) ||
      v.key.toLowerCase().includes(varSearch.toLowerCase())
    );
    if (filtered.length) acc[cat] = filtered;
    return acc;
  }, {} as Record<string, DocVariable[]>);

  // Detect current font size
  const currentFontSize = editor.getAttributes("textStyle").fontSize || "";

  const ToolBtn = ({ active, onClick, children, title, className: extra }: any) => (
    <button type="button" onClick={onClick} title={title}
      className={`p-1.5 rounded-md transition-all duration-150 active:scale-95 ${active ? "bg-primary/15 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"} ${extra || ""}`}>
      {children}
    </button>
  );

  const Divider = () => <div className="w-px h-6 bg-border mx-0.5 shrink-0" />;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
      {/* Toolbar Row 1: Font, Size, Style */}
      {!readOnly && (
        <>
          <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-border bg-muted/20 overflow-visible">
            {/* Heading level */}
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (val === "p") editor.chain().focus().setParagraph().run();
                else editor.chain().focus().toggleHeading({ level: parseInt(val) as 1 | 2 | 3 }).run();
              }}
              value={editor.isActive("heading", { level: 1 }) ? "1" : editor.isActive("heading", { level: 2 }) ? "2" : editor.isActive("heading", { level: 3 }) ? "3" : "p"}
              className="text-xs bg-background border border-input rounded-md px-2 py-1.5 text-foreground cursor-pointer hover:border-primary/50 transition-colors min-w-[90px]"
            >
              <option value="p">Normal</option>
              <option value="1">Título 1</option>
              <option value="2">Título 2</option>
              <option value="3">Título 3</option>
            </select>

            <Divider />

            {/* Font family */}
            <select
              onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
              className="text-xs bg-background border border-input rounded-md px-2 py-1.5 text-foreground cursor-pointer hover:border-primary/50 transition-colors min-w-[120px]"
              value={editor.getAttributes("textStyle").fontFamily || "Times New Roman, serif"}
            >
              {FONTS.map((f) => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
              ))}
            </select>

            <Divider />

            {/* Font size */}
            <select
              onChange={(e) => {
                if (e.target.value === "") editor.chain().focus().unsetFontSize().run();
                else editor.chain().focus().setFontSize(e.target.value).run();
              }}
              value={currentFontSize}
              className="text-xs bg-background border border-input rounded-md px-2 py-1.5 text-foreground cursor-pointer hover:border-primary/50 transition-colors w-[70px]"
            >
              <option value="">Auto</option>
              {FONT_SIZES.map((s) => (
                <option key={s} value={s}>{s.replace("pt", "")}</option>
              ))}
            </select>

            <Divider />

            {/* Bold, Italic, Underline, Strike */}
            <ToolBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito (Ctrl+B)">
              <Bold className="w-4 h-4" />
            </ToolBtn>
            <ToolBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Itálico (Ctrl+I)">
              <Italic className="w-4 h-4" />
            </ToolBtn>
            <ToolBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sublinhado (Ctrl+U)">
              <UnderlineIcon className="w-4 h-4" />
            </ToolBtn>
            <ToolBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Tachado">
              <Strikethrough className="w-4 h-4" />
            </ToolBtn>

            <Divider />

            {/* Text Color */}
            <label className="relative cursor-pointer p-1.5 rounded-md hover:bg-muted transition-colors" title="Cor do texto">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} />
            </label>

            {/* Highlight */}
            <div className="relative" ref={highlightRef}>
              <ToolBtn active={editor.isActive("highlight")} onClick={() => setShowHighlight(!showHighlight)} title="Realçar texto">
                <Highlighter className="w-4 h-4" />
              </ToolBtn>
              {showHighlight && (
                <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 p-2 flex gap-1.5">
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button key={c.color} title={c.label}
                      onClick={() => { editor.chain().focus().toggleHighlight({ color: c.color }).run(); setShowHighlight(false); }}
                      className="w-6 h-6 rounded-md border border-border hover:scale-110 transition-transform active:scale-95"
                      style={{ backgroundColor: c.color }} />
                  ))}
                  <button title="Remover realce"
                    onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlight(false); }}
                    className="w-6 h-6 rounded-md border border-border hover:bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Toolbar Row 2: Alignment, Lists, Table, etc */}
          <div className="flex flex-wrap items-center gap-1 px-3 py-1.5 border-b border-border bg-muted/10 overflow-visible">
            {/* Alignment */}
            <ToolBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Alinhar à esquerda">
              <AlignLeft className="w-4 h-4" />
            </ToolBtn>
            <ToolBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Centralizar">
              <AlignCenter className="w-4 h-4" />
            </ToolBtn>
            <ToolBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Alinhar à direita">
              <AlignRight className="w-4 h-4" />
            </ToolBtn>
            <ToolBtn active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} title="Justificar">
              <AlignJustify className="w-4 h-4" />
            </ToolBtn>

            <Divider />

            {/* Lists */}
            <ToolBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista com marcadores">
              <List className="w-4 h-4" />
            </ToolBtn>
            <ToolBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
              <ListOrdered className="w-4 h-4" />
            </ToolBtn>

            <Divider />

            {/* Indent */}
            <ToolBtn onClick={() => editor.chain().focus().sinkListItem("listItem").run()} title="Aumentar recuo">
              <Indent className="w-4 h-4" />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().liftListItem("listItem").run()} title="Diminuir recuo">
              <Outdent className="w-4 h-4" />
            </ToolBtn>

            <Divider />

            {/* Table & HR */}
            <ToolBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Inserir tabela">
              <TableIcon className="w-4 h-4" />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha horizontal">
              <Minus className="w-4 h-4" />
            </ToolBtn>

            <Divider />

            {/* Undo / Redo */}
            <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Desfazer (Ctrl+Z)">
              <Undo2 className="w-4 h-4" />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Refazer (Ctrl+Y)">
              <Redo2 className="w-4 h-4" />
            </ToolBtn>

            <Divider />

            {/* Variables dropdown */}
            <div className="relative" ref={varsRef}>
              <button type="button" onClick={() => setShowVars(!showVars)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20 transition-colors">
                <Code className="w-3.5 h-3.5" />
                Variáveis
                <ChevronDown className={`w-3 h-3 transition-transform ${showVars ? "rotate-180" : ""}`} />
              </button>
              {showVars && (
                <div className="absolute top-full left-0 mt-1 w-72 max-h-80 overflow-y-auto bg-popover border border-border rounded-lg shadow-xl z-50">
                  <div className="sticky top-0 bg-popover p-2 border-b border-border">
                    <input
                      type="text"
                      placeholder="Buscar variável..."
                      value={varSearch}
                      onChange={(e) => setVarSearch(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-md border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                      autoFocus
                    />
                  </div>
                  {Object.entries(filteredGrouped).map(([cat, vars]) => (
                    <div key={cat}>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-2.5 pb-1">{cat}</p>
                      {vars.map((v) => (
                        <button key={v.key} onClick={() => insertVariable(v)}
                          className="w-full text-left px-3 py-1.5 hover:bg-muted transition-colors flex items-center justify-between group">
                          <span className="text-xs text-foreground">{v.label}</span>
                          <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono group-hover:bg-background">{v.key}</code>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Margins toggle */}
            <div className="ml-auto">
              <button type="button" onClick={() => setShowMargins(!showMargins)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border transition-all">
                📐 Margens
                <ChevronDown className={`w-3 h-3 transition-transform ${showMargins ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>

          {/* Margin controls */}
          {showMargins && (
            <div className="flex items-center gap-4 px-3 py-2 border-b border-border bg-muted/5 text-xs flex-wrap">
              {([
                { key: "top" as const, label: "Topo" },
                { key: "bottom" as const, label: "Inferior" },
                { key: "left" as const, label: "Esquerda" },
                { key: "right" as const, label: "Direita" },
              ]).map(({ key, label }) => (
                <label key={key} className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="text-xs font-medium">{label}</span>
                  <input type="number" min={5} max={50} value={margins[key]}
                    onChange={(e) => setMargins(m => ({ ...m, [key]: Number(e.target.value) }))}
                    className="w-14 px-1.5 py-1 rounded-md border border-input bg-background text-foreground text-xs text-center focus:ring-2 focus:ring-ring focus:outline-none" />
                  <span className="text-muted-foreground/60">mm</span>
                </label>
              ))}
            </div>
          )}
        </>
      )}

      {/* Editor content - A4 style with page breaks */}
      <div className="bg-muted/20 p-4 sm:p-8 overflow-y-auto" style={{ maxHeight: "70vh" }}>
        <div
          className="editor-a4-container mx-auto bg-white shadow-md border border-border/50 rounded"
          style={{
            maxWidth: "210mm",
            minHeight: "297mm",
            paddingLeft: `${margins.left}mm`,
            paddingRight: `${margins.right}mm`,
            paddingTop: `${margins.top}mm`,
            paddingBottom: `${margins.bottom}mm`,
          }}
        >
          <EditorContent editor={editor} className="prose prose-sm max-w-none
            [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[800px]
            [&_.ProseMirror_h1]:text-base [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mb-3
            [&_.ProseMirror_h2]:text-sm [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:mt-4
            [&_.ProseMirror_p]:text-sm [&_.ProseMirror_p]:leading-relaxed [&_.ProseMirror_p]:mb-2 [&_.ProseMirror_p]:text-gray-800
            [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:mb-3
            [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-gray-300 [&_.ProseMirror_td]:px-2 [&_.ProseMirror_td]:py-1.5 [&_.ProseMirror_td]:text-xs
            [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-gray-300 [&_.ProseMirror_th]:px-2 [&_.ProseMirror_th]:py-1.5 [&_.ProseMirror_th]:text-xs [&_.ProseMirror_th]:bg-gray-100 [&_.ProseMirror_th]:font-semibold
            [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ul]:mb-2
            [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_ol]:mb-2
            [&_.ProseMirror_li]:text-sm [&_.ProseMirror_li]:mb-1
            [&_.ProseMirror_hr]:border-t [&_.ProseMirror_hr]:border-border [&_.ProseMirror_hr]:my-4
            [&_.ProseMirror_mark]:rounded [&_.ProseMirror_mark]:px-0.5
          " />
        </div>
      </div>

      <style>{`
        .editor-a4-container {
          background-image: repeating-linear-gradient(
            to bottom,
            transparent 0px,
            transparent calc(297mm - 1px),
            hsl(var(--border)) calc(297mm - 1px),
            hsl(var(--border)) 297mm
          );
          background-size: 100% 297mm;
          background-position: top;
        }
      `}</style>
    </div>
  );
}
