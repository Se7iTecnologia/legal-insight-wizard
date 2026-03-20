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
  Indent, Outdent, Settings2,
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

// A4 dimensions at 96 DPI
const A4_WIDTH_PX = 794;  // 210mm
const A4_HEIGHT_PX = 1123; // 297mm
const MM_TO_PX = 3.7795;  // 1mm = 3.7795px at 96dpi
const PAGE_GAP = 40;      // px visual gap between pages

export function DocumentEditor({ content, onChange, readOnly }: Props) {
  const [showVars, setShowVars] = useState(false);
  const [varSearch, setVarSearch] = useState("");
  const [showHighlight, setShowHighlight] = useState(false);
  const varsRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [showMargins, setShowMargins] = useState(false);
  const [margins, setMargins] = useState({ top: 25, bottom: 25, left: 20, right: 20 });
  const [pageCount, setPageCount] = useState(1);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const isRecalcRef = useRef(false);

  const marginsPx = {
    top: Math.round(margins.top * MM_TO_PX),
    bottom: Math.round(margins.bottom * MM_TO_PX),
    left: Math.round(margins.left * MM_TO_PX),
    right: Math.round(margins.right * MM_TO_PX),
  };

  const contentHeightPerPage = A4_HEIGHT_PX - marginsPx.top - marginsPx.bottom;

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

  // Automatic page break: push elements that cross page boundaries to the next page
  const recalcPageBreaks = useCallback(() => {
    if (isRecalcRef.current) return;
    const pm = editorContainerRef.current?.querySelector('.ProseMirror') as HTMLElement;
    if (!pm) return;

    isRecalcRef.current = true;

    const children = Array.from(pm.children) as HTMLElement[];
    if (!children.length) {
      setPageCount(1);
      isRecalcRef.current = false;
      return;
    }

    // 1. Clear all previously injected page-break margins
    children.forEach(c => {
      if (c.dataset.pageBreak) {
        c.style.marginTop = '';
        delete c.dataset.pageBreak;
      }
    });

    // 2. Force reflow so we measure natural positions
    void pm.offsetHeight;

    // 3. Measure all children in their natural positions
    const measures = children.map(c => ({
      el: c,
      top: c.offsetTop,
      height: c.offsetHeight,
    }));

    const pageH = contentHeightPerPage;
    const gapH = PAGE_GAP + marginsPx.top + marginsPx.bottom;

    // Tolerance: only push if most of the element overflows past the page boundary.
    // This allows content to flow naturally across page boundaries (like Word).
    // Only elements where >80% spills over get pushed to the next page.
    const OVERFLOW_THRESHOLD = 0;

    let shift = 0;
    let nextBreak = pageH;

    for (const m of measures) {
      const effTop = m.top + shift;

      // Advance break point if element is already past it
      while (nextBreak <= effTop) {
        nextBreak += pageH + gapH;
      }

      // Skip elements taller than a full page (can't split them)
      if (m.height >= pageH) continue;

      const effBottom = effTop + m.height;

      // Does this element cross the page boundary?
      if (effBottom > nextBreak && effTop < nextBreak) {
        const overflow = effBottom - nextBreak;
        const overflowRatio = overflow / m.height;

        // Only push to next page if significant portion overflows
        // Small overflows are allowed to stay (content flows naturally)
        if (overflowRatio > OVERFLOW_THRESHOLD) {
          const push = (nextBreak - effTop) + gapH;
          m.el.style.marginTop = `${push}px`;
          m.el.dataset.pageBreak = '1';
          shift += push;
          nextBreak += pageH + gapH;
        }
      }
    }

    // 4. Recalculate page count from actual rendered height
    void pm.offsetHeight;
    const totalH = pm.scrollHeight;
    const pages = Math.max(1, Math.ceil((totalH + gapH) / (pageH + gapH)));
    setPageCount(pages);

    requestAnimationFrame(() => {
      isRecalcRef.current = false;
    });
  }, [contentHeightPerPage, marginsPx]);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  // Recalc page breaks on content change and resize
  useEffect(() => {
    if (!editor) return;
    const handler = () => requestAnimationFrame(recalcPageBreaks);
    editor.on("update", handler);
    const timer = setTimeout(handler, 150);
    const resizeObs = new ResizeObserver(handler);
    if (editorContainerRef.current) {
      const pm = editorContainerRef.current.querySelector(".ProseMirror");
      if (pm) resizeObs.observe(pm);
    }
    return () => {
      editor.off("update", handler);
      clearTimeout(timer);
      resizeObs.disconnect();
    };
  }, [editor, recalcPageBreaks]);

  // Recalc on margin change
  useEffect(() => {
    requestAnimationFrame(recalcPageBreaks);
  }, [margins, recalcPageBreaks]);

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

  const currentFontSize = editor.getAttributes("textStyle").fontSize || "";

  const ToolBtn = ({ active, onClick, children, title, className: extra }: any) => (
    <button type="button" onClick={onClick} title={title}
      className={`p-1.5 rounded-md transition-all duration-150 active:scale-95 ${active ? "bg-primary/15 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"} ${extra || ""}`}>
      {children}
    </button>
  );

  const Divider = () => <div className="w-px h-6 bg-border mx-0.5 shrink-0" />;

  const totalHeight = pageCount * A4_HEIGHT_PX + (pageCount - 1) * PAGE_GAP;

  return (
    <div className="flex flex-col border border-border rounded-xl overflow-hidden bg-card shadow-sm" style={{ height: "80vh" }}>
      {/* STICKY Toolbar */}
      {!readOnly && (
        <div className="shrink-0 z-30 bg-card border-b border-border">
          {/* Row 1: Font, Size, Style */}
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

            {/* Page count indicator */}
            <div className="ml-auto text-[11px] text-muted-foreground tabular-nums">
              {pageCount} {pageCount === 1 ? "página" : "páginas"}
            </div>
          </div>

          {/* Row 2: Alignment, Lists, Table, Variables */}
          <div className="flex flex-wrap items-center gap-1 px-3 py-1.5 border-b border-border bg-muted/10 overflow-visible">
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

            <ToolBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista com marcadores">
              <List className="w-4 h-4" />
            </ToolBtn>
            <ToolBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
              <ListOrdered className="w-4 h-4" />
            </ToolBtn>

            <Divider />

            <ToolBtn onClick={() => editor.chain().focus().sinkListItem("listItem").run()} title="Aumentar recuo">
              <Indent className="w-4 h-4" />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().liftListItem("listItem").run()} title="Diminuir recuo">
              <Outdent className="w-4 h-4" />
            </ToolBtn>

            <Divider />

            <ToolBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Inserir tabela">
              <TableIcon className="w-4 h-4" />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha horizontal">
              <Minus className="w-4 h-4" />
            </ToolBtn>

            <Divider />

            <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Desfazer (Ctrl+Z)">
              <Undo2 className="w-4 h-4" />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Refazer (Ctrl+Y)">
              <Redo2 className="w-4 h-4" />
            </ToolBtn>

            <Divider />

            {/* Variables dropdown - PRESERVED */}
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
                <Settings2 className="w-3.5 h-3.5" />
                Margens
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
        </div>
      )}

      {/* Scrollable Page View - Google Docs style */}
      <div className="flex-1 overflow-y-auto doc-editor-scroll" style={{ backgroundColor: "#E8EAED" }}>
        <div className="py-8 flex justify-center">
          {/* Pages container */}
          <div
            ref={editorContainerRef}
            className="doc-pages-wrapper"
            style={{ width: A4_WIDTH_PX }}
          >
            {/* Visual page shells rendered behind the editor */}
            <div className="relative" style={{ minHeight: totalHeight }}>
              {/* Page background shells */}
              {Array.from({ length: pageCount }).map((_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 pointer-events-none"
                  style={{
                    top: i * (A4_HEIGHT_PX + PAGE_GAP),
                    height: A4_HEIGHT_PX,
                    width: A4_WIDTH_PX,
                  }}
                >
                  {/* Page paper */}
                  <div
                    className="bg-white rounded-sm"
                    style={{
                      width: "100%",
                      height: "100%",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)",
                    }}
                  />
                  {/* Page number label */}
                  <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[11px] text-gray-400 select-none tabular-nums">
                    Página {i + 1} de {pageCount}
                  </div>
                </div>
              ))}

              {/* Gap covers: opaque overlays that hide text between pages */}
              {Array.from({ length: Math.max(0, pageCount - 1) }).map((_, i) => (
                <div
                  key={`gap-${i}`}
                  className="absolute left-0 pointer-events-none"
                  style={{
                    top: (i + 1) * A4_HEIGHT_PX + i * PAGE_GAP,
                    height: PAGE_GAP,
                    width: A4_WIDTH_PX,
                    backgroundColor: "#E8EAED",
                    zIndex: 20,
                  }}
                />
              ))}

              {/* Editor content overlaid on top of pages */}
              <div
                className="relative z-10 doc-content-clipped"
                style={{
                  paddingLeft: marginsPx.left,
                  paddingRight: marginsPx.right,
                  paddingTop: marginsPx.top,
                  paddingBottom: marginsPx.bottom,
                  width: A4_WIDTH_PX,
                }}
              >
                <EditorContent
                  editor={editor}
                  className="doc-editor-content prose prose-sm max-w-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scoped styles for the editor */}
      <style>{`
        .doc-editor-content .ProseMirror {
          outline: none;
          min-height: ${contentHeightPerPage}px;
          font-family: "Times New Roman", serif;
          font-size: 12pt;
          line-height: 1.6;
          color: #1a1a1a;
        }
        .doc-editor-content .ProseMirror h1 {
          font-size: 16pt;
          font-weight: 700;
          margin-bottom: 12px;
          line-height: 1.3;
        }
        .doc-editor-content .ProseMirror h2 {
          font-size: 13pt;
          font-weight: 700;
          margin-bottom: 8px;
          margin-top: 18px;
          line-height: 1.3;
        }
        .doc-editor-content .ProseMirror h3 {
          font-size: 12pt;
          font-weight: 700;
          margin-bottom: 6px;
          margin-top: 14px;
          line-height: 1.3;
        }
        .doc-editor-content .ProseMirror p {
          font-size: inherit;
          line-height: 1.6;
          margin-bottom: 8px;
          color: #1a1a1a;
        }
        .doc-editor-content .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 12px;
        }
        .doc-editor-content .ProseMirror td,
        .doc-editor-content .ProseMirror th {
          border: 1px solid #d1d5db;
          padding: 6px 10px;
          font-size: 10pt;
          vertical-align: top;
        }
        .doc-editor-content .ProseMirror th {
          background: #f3f4f6;
          font-weight: 600;
        }
        .doc-editor-content .ProseMirror ul {
          list-style: disc;
          padding-left: 24px;
          margin-bottom: 8px;
        }
        .doc-editor-content .ProseMirror ol {
          list-style: decimal;
          padding-left: 24px;
          margin-bottom: 8px;
        }
        .doc-editor-content .ProseMirror li {
          font-size: inherit;
          margin-bottom: 4px;
        }
        .doc-editor-content .ProseMirror hr {
          border: none;
          border-top: 1px solid #d1d5db;
          margin: 16px 0;
        }
        .doc-editor-content .ProseMirror mark {
          border-radius: 2px;
          padding: 0 2px;
        }
        .doc-editor-content .ProseMirror img {
          max-width: 100%;
          height: auto;
        }
        .doc-editor-content .ProseMirror .tableWrapper {
          overflow-x: auto;
        }

        /* Custom scrollbar */
        .doc-editor-scroll::-webkit-scrollbar {
          width: 10px;
        }
        .doc-editor-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .doc-editor-scroll::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 5px;
          border: 2px solid #E8EAED;
        }
        .doc-editor-scroll::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </div>
  );
}
