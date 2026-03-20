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
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Undo2, Redo2, Type, Palette,
  Table as TableIcon, Code, Minus, ChevronDown,
} from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { AVAILABLE_VARIABLES, type DocVariable } from "@/lib/documentTemplates";

interface Props {
  content: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
}

export function DocumentEditor({ content, onChange, readOnly }: Props) {
  const [showVars, setShowVars] = useState(false);
  const [varSearch, setVarSearch] = useState("");
  const varsRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
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

  const ToolBtn = ({ active, onClick, children, title }: any) => (
    <button type="button" onClick={onClick} title={title}
      className={`p-1.5 rounded transition-colors ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
      {children}
    </button>
  );

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30 overflow-visible">
          {/* Font Size */}
          <select
            onChange={(e) => {
              const val = e.target.value;
              if (val === "p") editor.chain().focus().setParagraph().run();
              else editor.chain().focus().toggleHeading({ level: parseInt(val) as 1 | 2 | 3 }).run();
            }}
            value={editor.isActive("heading", { level: 1 }) ? "1" : editor.isActive("heading", { level: 2 }) ? "2" : editor.isActive("heading", { level: 3 }) ? "3" : "p"}
            className="text-xs bg-transparent border border-input rounded px-1.5 py-1 text-foreground"
          >
            <option value="p">Normal</option>
            <option value="1">Título 1</option>
            <option value="2">Título 2</option>
            <option value="3">Título 3</option>
          </select>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Font */}
          <select
            onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
            className="text-xs bg-transparent border border-input rounded px-1.5 py-1 text-foreground max-w-[100px]"
            defaultValue="serif"
          >
            <option value="serif">Times</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="Calibri, sans-serif">Calibri</option>
            <option value="Courier New, monospace">Courier</option>
          </select>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito">
            <Bold className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Itálico">
            <Italic className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sublinhado">
            <UnderlineIcon className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Tachado">
            <Strikethrough className="w-3.5 h-3.5" />
          </ToolBtn>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Color */}
          <label className="relative cursor-pointer" title="Cor do texto">
            <Palette className="w-3.5 h-3.5 text-muted-foreground" />
            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-6 h-6"
              onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} />
          </label>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Esquerda">
            <AlignLeft className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Centro">
            <AlignCenter className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Direita">
            <AlignRight className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} title="Justificar">
            <AlignJustify className="w-3.5 h-3.5" />
          </ToolBtn>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista">
            <List className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolBtn>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Inserir tabela">
            <TableIcon className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha horizontal">
            <Minus className="w-3.5 h-3.5" />
          </ToolBtn>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Desfazer">
            <Undo2 className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Refazer">
            <Redo2 className="w-3.5 h-3.5" />
          </ToolBtn>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Variables dropdown */}
          <div className="relative" ref={varsRef}>
            <button type="button" onClick={() => setShowVars(!showVars)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-warning/15 text-warning hover:bg-warning/25 transition-colors">
              <Code className="w-3.5 h-3.5" />
              Variáveis
              <ChevronDown className="w-3 h-3" />
            </button>
            {showVars && (
              <div className="absolute top-full left-0 mt-1 w-72 max-h-80 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg z-50">
                <div className="sticky top-0 bg-popover p-2 border-b border-border">
                  <input
                    type="text"
                    placeholder="Buscar variável..."
                    value={varSearch}
                    onChange={(e) => setVarSearch(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded border border-input bg-background text-foreground"
                    autoFocus
                  />
                </div>
                {Object.entries(filteredGrouped).map(([cat, vars]) => (
                  <div key={cat}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase px-3 pt-2 pb-1">{cat}</p>
                    {vars.map((v) => (
                      <button key={v.key} onClick={() => insertVariable(v)}
                        className="w-full text-left px-3 py-1.5 hover:bg-muted transition-colors flex items-center justify-between">
                        <span className="text-xs text-foreground">{v.label}</span>
                        <code className="text-[10px] text-muted-foreground bg-muted px-1 rounded">{v.key}</code>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor content - A4 style with page breaks */}
      <div className="bg-muted/20 p-4 sm:p-8 overflow-y-auto" style={{ maxHeight: "70vh" }}>
        <div
          className="editor-a4-container mx-auto bg-white shadow-md border border-border/50 rounded"
          style={{
            maxWidth: "210mm",
            minHeight: "297mm",
            paddingLeft: "20mm",
            paddingRight: "20mm",
            paddingTop: "25mm",
            paddingBottom: "25mm",
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
          " />
        </div>
      </div>

      <style>{`
        .editor-a4-container {
          background-image: repeating-linear-gradient(
            to bottom,
            transparent 0px,
            transparent calc(297mm - 1px),
            #cbd5e1 calc(297mm - 1px),
            #cbd5e1 297mm
          );
          background-size: 100% 297mm;
          background-position: top;
        }
      `}</style>
    </div>
  );
}
