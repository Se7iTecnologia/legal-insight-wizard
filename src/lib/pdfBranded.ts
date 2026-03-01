import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Brand colors ──
const NAVY: [number, number, number] = [26, 42, 74];
const GOLD: [number, number, number] = [212, 175, 55];
const DARK: [number, number, number] = [30, 30, 30];
const GRAY: [number, number, number] = [120, 130, 140];
const LIGHT_BG: [number, number, number] = [245, 247, 250];
const WHITE: [number, number, number] = [255, 255, 255];
const GREEN: [number, number, number] = [34, 139, 87];
const RED: [number, number, number] = [200, 50, 50];
const BLUE: [number, number, number] = [50, 120, 200];

interface BrandedPDFOptions {
  title: string;
  subtitle?: string;
  clienteNome?: string;
  clienteCPF?: string;
  banco?: string;
  codigo?: string;
  contrato?: string;
}

/** Create a branded jsPDF doc with header, ready to receive content */
export function createBrandedDoc(opts: BrandedPDFOptions): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();

  drawHeader(doc, pw, opts);
  return doc;
}

function drawHeader(doc: jsPDF, pw: number, opts: BrandedPDFOptions) {
  // Navy bar
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pw, 28, "F");

  // Gold accent line
  doc.setFillColor(...GOLD);
  doc.rect(0, 28, pw, 1.5, "F");

  // Logo text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...WHITE);
  doc.text("JUROS JUSTOS", 14, 14);

  // Tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(180, 190, 210);
  doc.text("Análise Revisional de Contratos Bancários", 14, 20);

  // Date top-right
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text(new Date().toLocaleDateString("pt-BR"), pw - 14, 14, { align: "right" });

  // Report title block
  let y = 36;
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.text(opts.title.toUpperCase(), 14, y);
  y += 6;

  if (opts.subtitle) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(opts.subtitle, 14, y);
    y += 5;
  }

  // Info bar
  if (opts.clienteNome || opts.codigo || opts.banco || opts.contrato) {
    y += 2;
    const infoItems: { label: string; value: string }[] = [];
    if (opts.clienteNome) infoItems.push({ label: "Cliente", value: opts.clienteNome });
    if (opts.banco) infoItems.push({ label: "Banco", value: opts.banco });
    if (opts.codigo) infoItems.push({ label: "Código", value: opts.codigo });
    if (opts.contrato) infoItems.push({ label: "Contrato", value: opts.contrato });

    const cols = infoItems.length;
    const colW = (pw - 28) / cols;

    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(14, y, pw - 28, 18, 2, 2, "F");
    doc.setFontSize(7.5);

    infoItems.forEach((item, i) => {
      const cx = 18 + i * colW;
      const labelY = y + 6;
      const valY = y + 12;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      doc.text(item.label, cx, labelY);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      // Truncate long values to fit column
      const maxW = colW - 6;
      let val = item.value;
      while (doc.getTextWidth(val) > maxW && val.length > 3) {
        val = val.slice(0, -1);
      }
      doc.text(val, cx, valY);
    });
  }
}

/** Draw footer on all pages */
export function finalizeBrandedDoc(doc: jsPDF, filename: string) {
  const totalPages = doc.getNumberOfPages();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Gold line
    doc.setFillColor(...GOLD);
    doc.rect(0, ph - 14, pw, 0.5, "F");

    // Footer text
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("Juros Justos — Análise Revisional de Contratos Bancários", 14, ph - 8);
    doc.text("Documento gerado automaticamente. Não possui valor jurídico sem assinatura.", 14, ph - 4);
    doc.text(`Página ${i} de ${totalPages}`, pw - 14, ph - 8, { align: "right" });
  }

  doc.save(`${filename}.pdf`);
}

/** Get the Y position to start content after header */
export function getContentStartY(opts: BrandedPDFOptions): number {
  let y = 42;
  if (opts.subtitle) y += 5;
  if (opts.clienteNome || opts.codigo || opts.banco) y += 24;
  return y;
}

// ── Section heading ──
export function drawSectionTitle(doc: jsPDF, title: string, y: number, stepNumber?: number): number {
  const pw = doc.internal.pageSize.getWidth();
  
  if (stepNumber !== undefined) {
    // Step circle
    doc.setFillColor(...NAVY);
    doc.circle(20, y - 1.5, 4, "F");
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.text(String(stepNumber), 20, y, { align: "center" });

    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(title, 28, y);
  } else {
    doc.setFillColor(...NAVY);
    doc.rect(14, y - 4, 3, 6, "F");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.text(title, 20, y);
  }

  // Separator line
  doc.setDrawColor(220, 225, 235);
  doc.setLineWidth(0.3);
  doc.line(14, y + 3, pw - 14, y + 3);

  return y + 8;
}

// ── Summary cards row ──
export function drawSummaryCards(doc: jsPDF, cards: { label: string; value: string; color?: "navy" | "gold" | "green" | "red" | "blue" }[], y: number): number {
  const pw = doc.internal.pageSize.getWidth();
  const margin = 14;
  const gap = 3;
  const count = cards.length;
  const cardW = (pw - margin * 2 - gap * (count - 1)) / count;
  const cardH = 20;

  const colorMap = {
    navy: NAVY,
    gold: GOLD,
    green: GREEN,
    red: [180, 40, 40] as [number, number, number],
    blue: BLUE,
  };

  // Text color per card bg: use dark text on gold for contrast
  const textColorMap: Record<string, [number, number, number]> = {
    navy: WHITE,
    gold: DARK,
    green: WHITE,
    red: WHITE,
    blue: WHITE,
  };

  cards.forEach((card, i) => {
    const x = margin + i * (cardW + gap);
    const bgColor = card.color ? colorMap[card.color] : NAVY;
    const txtColor = card.color ? (textColorMap[card.color] || WHITE) : WHITE;

    doc.setFillColor(...bgColor);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, "F");

    // Label
    doc.setFontSize(6);
    doc.setTextColor(txtColor[0], txtColor[1], txtColor[2]);
    doc.setFont("helvetica", "normal");
    doc.text(card.label.toUpperCase(), x + cardW / 2, y + 7, { align: "center" });

    // Value - fit to card width
    doc.setFont("helvetica", "bold");
    let fontSize = 10;
    doc.setFontSize(fontSize);
    while (doc.getTextWidth(card.value) > cardW - 6 && fontSize > 6) {
      fontSize -= 0.5;
      doc.setFontSize(fontSize);
    }
    doc.setTextColor(txtColor[0], txtColor[1], txtColor[2]);
    doc.text(card.value, x + cardW / 2, y + 15, { align: "center" });
  });

  return y + cardH + 6;
}

// ── Key-value rows ──
export function drawKeyValueRows(doc: jsPDF, rows: { label: string; value: string; bold?: boolean; color?: "green" | "red" | "navy" }[], y: number): number {
  const pw = doc.internal.pageSize.getWidth();
  const colorMap = { green: GREEN, red: RED, navy: NAVY };

  rows.forEach((row, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 249, 252);
      doc.rect(14, y - 3.5, pw - 28, 7, "F");
    }

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);
    doc.text(row.label, 18, y);

    doc.setFont("helvetica", row.bold ? "bold" : "normal");
    if (row.color) doc.setTextColor(...colorMap[row.color]);
    else doc.setTextColor(...DARK);
    doc.text(row.value, pw - 18, y, { align: "right" });

    y += 7;
  });

  return y + 2;
}

// ── Styled autoTable ──
export function drawBrandedTable(doc: jsPDF, head: string[], body: string[][], startY: number): number {
  autoTable(doc, {
    startY,
    head: [head],
    body,
    margin: { left: 14, right: 14 },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      lineWidth: 0.1,
      lineColor: [220, 225, 235],
      textColor: [...DARK],
      font: "helvetica",
    },
    headStyles: {
      fillColor: [...NAVY],
      textColor: [...WHITE],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [248, 249, 252],
    },
    didDrawPage: () => {},
  });

  return (doc as any).lastAutoTable?.finalY || startY + 20;
}

// ── Highlight box ──
export function drawHighlightBox(doc: jsPDF, rows: { label: string; value: string; big?: boolean }[], y: number, color: "green" | "gold" | "navy" = "green"): number {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const colorMap = { green: GREEN, gold: GOLD, navy: NAVY };
  const bgMap: Record<string, [number, number, number]> = { green: [230, 245, 235], gold: [255, 248, 225], navy: [230, 235, 245] };
  const c = colorMap[color];
  const bg = bgMap[color];

  const rowH = 9;
  const boxH = 10 + rows.length * rowH;
  
  // Page break if needed
  if (y + boxH > ph - 30) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(bg[0], bg[1], bg[2]);
  doc.setDrawColor(...c);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, y, pw - 28, boxH, 2, 2, "FD");

  let ry = y + 7;
  rows.forEach((row) => {
    const labelSize = row.big ? 10 : 8;
    const valueSize = row.big ? 11 : 8.5;
    
    doc.setFontSize(labelSize);
    doc.setFont("helvetica", row.big ? "bold" : "normal");
    doc.setTextColor(...DARK);
    doc.text(row.label, 20, ry);

    doc.setFontSize(valueSize);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...c);
    // Ensure value fits
    const maxValW = (pw - 28) / 2 - 4;
    let val = row.value;
    while (doc.getTextWidth(val) > maxValW && val.length > 5) {
      val = val.slice(0, -1);
    }
    doc.text(val, pw - 20, ry, { align: "right" });
    ry += rowH;
  });

  return y + boxH + 6;
}

// ── Disclaimer ──
export function drawDisclaimer(doc: jsPDF, y: number): number {
  const pw = doc.internal.pageSize.getWidth();
  
  if (y > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(255, 250, 230);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, y, pw - 28, 16, 2, 2, "FD");

  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.setFont("helvetica", "italic");
  doc.text("Nota: Os cálculos acima são estimativas matemáticas baseadas nos dados do contrato. A restituição real depende de", 18, y + 5);
  doc.text("decisão judicial em ação revisional. Em caso de cobrança indevida já paga, é possível pleitear a devolução em dobro conforme o CDC.", 18, y + 10);

  return y + 20;
}
