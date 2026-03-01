import { formatBRL, calcPMT } from "@/lib/calculations";
import { exportCSV, exportExcel, exportJSON } from "@/lib/exports";
import { createBrandedDoc, finalizeBrandedDoc, getContentStartY, drawSummaryCards, drawSectionTitle, drawKeyValueRows, drawHighlightBox, drawDisclaimer } from "@/lib/pdfBranded";
import { Download } from "lucide-react";

interface Props {
  caso: any;
}

export function Etapa4Valores({ caso }: Props) {
  const c = (caso.contrato as any) || {};
  const b = (caso.bacen as any) || {};
  const tarifas = Array.isArray(caso.tarifas) ? (caso.tarifas as any[]) : [];

  const pv = parseFloat(c.valorFinanciado) || 0;
  const taxaM = parseFloat(c.taxaMensal) / 100 || 0;
  const n = parseInt(c.prazoMeses) || 0;
  const parcela = parseFloat(c.parcela) || (pv && taxaM && n ? calcPMT(pv, taxaM, n) : 0);
  const totalTarifas = tarifas.reduce((sum: number, t: any) => sum + (parseFloat(t.valor) || 0), 0);
  const parcelasPagas = parseInt(c.parcelasPagas) || 0;

  const totalAbusos = totalTarifas;
  const pctSobrePV = pv > 0 ? (totalAbusos / pv * 100) : 0;
  const reducaoParcela = parcela * (pctSobrePV / 100);
  const valorRecuperar = reducaoParcela * n;
  const indebitoPago = reducaoParcela * parcelasPagas;
  const parcelaCorrigida = parcela - reducaoParcela;
  const devolucaoDobro = indebitoPago * 2;

  const pdfOpts = {
    title: "Relatório de Valores a Receber",
    subtitle: `Análise revisional — ${caso.codigo}`,
    clienteNome: caso.clientes?.nome || "",
    banco: c.banco || c.instituicao || "",
    codigo: caso.codigo,
    contrato: c.contratoN || "",
  };

  const handleExportPDF = () => {
    const doc = createBrandedDoc(pdfOpts);
    let y = getContentStartY(pdfOpts);

    y = drawSummaryCards(doc, [
      { label: "Valor Financiado", value: `R$ ${formatBRL(pv)}`, color: "navy" },
      { label: "Parcela Original", value: `R$ ${formatBRL(parcela)}`, color: "blue" },
      { label: "Total de Abusos", value: `R$ ${formatBRL(totalAbusos)}`, color: "red" },
      { label: "Parcela Corrigida", value: `R$ ${formatBRL(parcelaCorrigida)}`, color: "green" },
    ], y);

    y = drawSectionTitle(doc, "Taxas e Tarifas Abusivas/Irregulares", y, 1);
    const tarifaRows = tarifas.map((t: any) => ({
      label: t.descricao,
      value: `R$ ${formatBRL(parseFloat(t.valor))}`,
    }));
    tarifaRows.push({ label: "Total de Abusos (A)", value: `R$ ${formatBRL(totalAbusos)}` });
    y = drawKeyValueRows(doc, tarifaRows.map((r, i) => i === tarifaRows.length - 1 ? { ...r, bold: true, color: "red" as const } : r), y);

    y = drawSectionTitle(doc, "Porcentagem sobre a parcela", y, 2);
    y = drawKeyValueRows(doc, [
      { label: `R$ ${formatBRL(totalAbusos)} ÷ R$ ${formatBRL(pv)}`, value: `${pctSobrePV.toFixed(2)}%` },
      { label: `${pctSobrePV.toFixed(2)}% de R$ ${formatBRL(parcela)}`, value: `R$ ${formatBRL(reducaoParcela)}`, bold: true, color: "green" },
    ], y);

    y = drawSectionTitle(doc, `Indébito a Receber (${parcelasPagas} parcelas pagas)`, y, 3);
    y = drawKeyValueRows(doc, [
      { label: `R$ ${formatBRL(reducaoParcela)} × ${parcelasPagas} parcelas pagas`, value: `R$ ${formatBRL(indebitoPago)}`, bold: true, color: "green" },
    ], y);

    y = drawSectionTitle(doc, `Retorno Econômico Total (${n} parcelas)`, y, 4);
    y = drawKeyValueRows(doc, [
      { label: `R$ ${formatBRL(reducaoParcela)} × ${n} parcelas`, value: `R$ ${formatBRL(valorRecuperar)}`, bold: true, color: "green" },
    ], y);

    y = drawSectionTitle(doc, "Resultado Final Estimado", y, 5);
    y = drawHighlightBox(doc, [
      { label: "Redução da Parcela", value: `R$ ${formatBRL(parcelaCorrigida)}` },
      { label: `Indébito a Receber (${parcelasPagas} pagas)`, value: `R$ ${formatBRL(indebitoPago)}` },
      { label: `Retorno Econômico (${n} parcelas)`, value: `R$ ${formatBRL(valorRecuperar)}` },
      { label: "Devolução em Dobro (CDC)", value: `R$ ${formatBRL(devolucaoDobro)}`, big: true },
    ], y, "green");

    y = drawDisclaimer(doc, y);
    finalizeBrandedDoc(doc, `Valores_Receber_${(caso.clientes?.nome || "caso").replace(/\s+/g, "_")}`);
  };

  const handleExport = (format: string) => {
    if (format === "pdf") { handleExportPDF(); return; }
    const data = [{
      "Valor Financiado": `R$ ${formatBRL(pv)}`,
      "Parcela Original": `R$ ${formatBRL(parcela)}`,
      "Total de Abusos": `R$ ${formatBRL(totalAbusos)}`,
      "Parcela Corrigida": `R$ ${formatBRL(parcelaCorrigida)}`,
      "Valor a Recuperar": `R$ ${formatBRL(valorRecuperar)}`,
      "Devolução em Dobro": `R$ ${formatBRL(devolucaoDobro)}`,
    }];
    if (format === "csv") exportCSV(data, `valores-${caso.codigo}`);
    if (format === "excel") exportExcel(data, `valores-${caso.codigo}`);
    if (format === "json") exportJSON(data[0], `valores-${caso.codigo}`);
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard icon="💰" label="Valor Financiado" value={`R$ ${formatBRL(pv)}`} />
        <SummaryCard icon="📋" label="Parcela Original" value={`R$ ${formatBRL(parcela)}`} />
        <SummaryCard icon="⚠️" label="Total de Abusos" value={`R$ ${formatBRL(totalAbusos)}`} accent />
        <SummaryCard icon="✅" label="Parcela Corrigida" value={`R$ ${formatBRL(parcelaCorrigida)}`} success />
      </div>

      {/* Cálculo Passo a Passo */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">📊 Cálculo Passo a Passo</h3>
          <button onClick={() => handleExport("pdf")} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
        </div>

        <StepBox step={1} title="Identificar valores abusivos no principal" color="bg-info-purple">
          {tarifas.map((t: any, i: number) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">{t.descricao}</span>
              <span className="font-mono text-primary">R$ {formatBRL(parseFloat(t.valor))}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-medium pt-2 border-t border-border mt-2">
            <span>Total de Abusos (A)</span>
            <span className="font-mono text-primary">R$ {formatBRL(totalAbusos)}</span>
          </div>
        </StepBox>

        <StepBox step={2} title="Porcentagem sobre a parcela" color="bg-info-blue">
          <p className="text-sm text-muted-foreground">R$ {formatBRL(totalAbusos)} ÷ R$ {formatBRL(pv)} = <strong>{pctSobrePV.toFixed(2)}%</strong></p>
          <p className="text-sm text-muted-foreground">% {pctSobrePV.toFixed(2)} de R$ {formatBRL(parcela)} = <span className="text-success font-bold">R$ {formatBRL(reducaoParcela)}</span></p>
        </StepBox>

        <StepBox step={3} title={`Indébito a Receber (${parcelasPagas} parcelas pagas)`} color="bg-info-orange">
          <p className="text-sm text-muted-foreground">R$ {formatBRL(reducaoParcela)} × {parcelasPagas} parcelas = <span className="text-success font-bold">R$ {formatBRL(indebitoPago)}</span></p>
        </StepBox>

        <StepBox step={4} title={`Retorno Econômico Total (${n} parcelas)`} color="bg-warning">
          <p className="text-sm text-muted-foreground">R$ {formatBRL(reducaoParcela)} × {n} parcelas = <span className="text-success font-bold">R$ {formatBRL(valorRecuperar)}</span></p>
        </StepBox>

        <StepBox step={5} title="Resultado Final Estimado" color="bg-success" highlight>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Redução da parcela</span>
              <span><span className="text-muted-foreground line-through mr-2">R$ {formatBRL(parcela)}</span> <strong className="text-foreground">R$ {formatBRL(parcelaCorrigida)}</strong></span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Indébito a Receber ({parcelasPagas} pagas)</span>
              <span className="font-bold text-success font-mono">R$ {formatBRL(indebitoPago)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Retorno Econômico Total ({n} parcelas)</span>
              <span className="font-bold text-success font-mono">R$ {formatBRL(valorRecuperar)}</span>
            </div>
            <div className="flex justify-between items-center bg-success/10 rounded-lg px-3 py-2 mt-2">
              <span className="text-sm">↻ Devolução em Dobro (CDC)</span>
              <span className="text-lg font-bold text-success font-mono">R$ {formatBRL(devolucaoDobro)}</span>
            </div>
          </div>
        </StepBox>
      </div>

      {/* Export buttons */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => handleExport("pdf")} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium">📄 PDF</button>
        <button onClick={() => handleExport("csv")} className="px-3 py-2 rounded-lg border border-input text-xs font-medium hover:bg-muted">📊 CSV</button>
        <button onClick={() => handleExport("excel")} className="px-3 py-2 rounded-lg border border-input text-xs font-medium hover:bg-muted">📗 Excel</button>
        <button onClick={() => handleExport("json")} className="px-3 py-2 rounded-lg border border-input text-xs font-medium hover:bg-muted">🔧 JSON</button>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, accent, success }: { icon: string; label: string; value: string; accent?: boolean; success?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-destructive/20 bg-destructive/5" : success ? "border-success/20 bg-success/5" : "border-border bg-card"}`}>
      <p className="text-xs text-muted-foreground flex items-center gap-1">{icon} {label}</p>
      <p className="text-lg font-bold font-mono text-foreground mt-1">{value}</p>
    </div>
  );
}

function StepBox({ step, title, color, highlight, children }: { step: number; title: string; color: string; highlight?: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-success/30 bg-success/5" : "border-border"}`}>
      <div className="flex items-center gap-3 mb-3">
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${color}`}>{step}</span>
        <h4 className="font-semibold text-foreground text-sm">{title}</h4>
      </div>
      {children}
    </div>
  );
}
