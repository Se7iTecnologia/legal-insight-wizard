import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  HeadingLevel, Table, TableRow, TableCell, BorderStyle,
  WidthType, ShadingType,
  type IRunOptions,
  type IParagraphOptions,
} from "docx";
import { saveAs } from "file-saver";

// Parse inline styles from an element
function getRunStyle(el: HTMLElement): Record<string, any> {
  const style: Record<string, any> = {};
  const cs = el.style;

  if (cs.fontFamily) {
    const f = cs.fontFamily.replace(/['"]/g, "").split(",")[0].trim();
    style.font = f;
  }
  if (cs.fontSize) {
    const pt = parseFloat(cs.fontSize);
    if (!isNaN(pt)) style.size = Math.round(pt * 2); // half-points
  }
  if (cs.color && cs.color !== "rgb(0, 0, 0)") {
    style.color = rgbToHex(cs.color);
  }
  return style;
}

function rgbToHex(rgb: string): string {
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return "000000";
  return m.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, "0")).join("");
}

// Recursively extract text runs from an HTML element
function extractRuns(node: Node, inherited: Record<string, any> = {}): TextRun[] {
  const runs: TextRun[] = [];

  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || "";
      if (text) {
        runs.push(new TextRun({ text, ...inherited }));
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const style = { ...inherited, ...getRunStyle(el) };

      if (tag === "strong" || tag === "b") style.bold = true;
      if (tag === "em" || tag === "i") style.italics = true;
      if (tag === "u") style.underline = { type: "single" as any };
      if (tag === "s" || tag === "strike" || tag === "del") style.strike = true;
      if (tag === "br") {
        runs.push(new TextRun({ text: "", break: 1, ...inherited }));
        return;
      }

      runs.push(...extractRuns(el, style));
    }
  });

  return runs;
}

function getAlignment(el: HTMLElement): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  const ta = el.style.textAlign;
  if (ta === "center") return AlignmentType.CENTER;
  if (ta === "right") return AlignmentType.RIGHT;
  if (ta === "justify") return AlignmentType.JUSTIFIED;
  if (ta === "left") return AlignmentType.LEFT;
  return undefined;
}

// Parse a table element
function parseTable(tableEl: HTMLElement): Table {
  const rows: TableRow[] = [];
  const trs = tableEl.querySelectorAll("tr");
  const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

  // Determine column count
  let colCount = 0;
  if (trs.length > 0) {
    trs[0].querySelectorAll("td, th").forEach(() => colCount++);
  }
  if (colCount === 0) colCount = 1;
  const cellWidth = Math.floor(9360 / colCount);

  trs.forEach((tr) => {
    const cells: TableCell[] = [];
    tr.querySelectorAll("td, th").forEach((cell) => {
      const isHeader = cell.tagName.toLowerCase() === "th";
      const childRuns = extractRuns(cell, isHeader ? { bold: true } : {});
      cells.push(
        new TableCell({
          borders,
          width: { size: cellWidth, type: WidthType.DXA },
          shading: isHeader ? { fill: "F3F4F6", type: ShadingType.CLEAR } : undefined,
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [new Paragraph({ children: childRuns.length ? childRuns : [new TextRun("")] })],
        })
      );
    });
    if (cells.length) rows.push(new TableRow({ children: cells }));
  });

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: Array(colCount).fill(Math.floor(9360 / colCount)),
    rows,
  });
}

// Convert HTML string to docx paragraphs/tables
function htmlToDocxElements(html: string): (Paragraph | Table)[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const elements: (Paragraph | Table)[] = [];

  const processNode = (node: Element) => {
    const tag = node.tagName.toLowerCase();

    if (tag === "table") {
      elements.push(parseTable(node as HTMLElement));
      return;
    }

    if (tag === "ul" || tag === "ol") {
      node.querySelectorAll(":scope > li").forEach((li, idx) => {
        const runs = extractRuns(li);
        const opts: IParagraphOptions = {
          children: runs.length ? runs : [new TextRun("")],
          spacing: { after: 80 },
        };
        // Simple bullet/number prefix since numbering config is complex
        const prefix = tag === "ol" ? `${idx + 1}. ` : "• ";
        opts.children = [new TextRun({ text: prefix }), ...(opts.children as TextRun[])];
        elements.push(new Paragraph(opts));
      });
      return;
    }

    if (tag === "h1" || tag === "h2" || tag === "h3") {
      const level = tag === "h1" ? HeadingLevel.HEADING_1 : tag === "h2" ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
      const runs = extractRuns(node as HTMLElement);
      elements.push(
        new Paragraph({
          heading: level,
          alignment: getAlignment(node as HTMLElement),
          children: runs.length ? runs : [new TextRun("")],
          spacing: { before: 200, after: 120 },
        })
      );
      return;
    }

    if (tag === "hr") {
      elements.push(
        new Paragraph({
          children: [new TextRun("")],
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 1 } },
          spacing: { before: 120, after: 120 },
        })
      );
      return;
    }

    if (tag === "p" || tag === "div") {
      const runs = extractRuns(node as HTMLElement);
      elements.push(
        new Paragraph({
          alignment: getAlignment(node as HTMLElement),
          children: runs.length ? runs : [new TextRun("")],
          spacing: { after: 100 },
        })
      );
      return;
    }

    // Fallback: treat as paragraph
    if (node.textContent?.trim()) {
      elements.push(new Paragraph({ children: extractRuns(node as HTMLElement) }));
    }
  };

  doc.body.childNodes.forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      processNode(child as Element);
    } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
      elements.push(new Paragraph({ children: [new TextRun(child.textContent)] }));
    }
  });

  if (elements.length === 0) {
    elements.push(new Paragraph({ children: [new TextRun("")] }));
  }

  return elements;
}

export async function exportToWord(
  html: string,
  filename: string,
  margins = { top: 25, bottom: 25, left: 20, right: 20 }
) {
  const children = htmlToDocxElements(html);

  const mmToDxa = (mm: number) => Math.round(mm * 56.7); // 1mm ≈ 56.7 DXA

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Times New Roman", size: 24 } }, // 12pt
      },
      paragraphStyles: [
        {
          id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 28, bold: true, font: "Times New Roman" },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 },
        },
        {
          id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 26, bold: true, font: "Times New Roman" },
          paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 },
        },
        {
          id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 24, bold: true, font: "Times New Roman" },
          paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: {
              top: mmToDxa(margins.top),
              bottom: mmToDxa(margins.bottom),
              left: mmToDxa(margins.left),
              right: mmToDxa(margins.right),
            },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, `${filename}.docx`);
}
