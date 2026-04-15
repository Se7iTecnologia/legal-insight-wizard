import { useMemo } from "react";
import { formatBRL, calcPMT } from "@/lib/calculations";
import { exportCSV, exportExcel, exportJSON } from "@/lib/exports";
import { createBrandedDoc, finalizeBrandedDoc, getContentStartY, drawSummaryCards, drawSectionTitle, drawKeyValueRows, drawHighlightBox, drawDisclaimer } from "@/lib/pdfBranded";
import { Download, TrendingDown, TrendingUp, ArrowRight, Shield, AlertTriangle, CheckCircle2, Scale } from "lucide-react";
import { safeFloat, safeInt, totalTarifas as calcTotalTarifas, calcCarenciaDias, calcFatorNP } from "./planilha/planilhaCalcs";

interface Props {
  caso: any;
  onStatusChange?: (status: string) => void;
}

export function Etapa4Valores({ caso }: Props) {
  const c = (caso.contrato as any) || {};
  const p = c.planilha || {};
  const tarifas = Array.isArray(caso.tarifas) ? (caso.tarifas as any[]) : [];

  // === Dados do Resumo ===
  const vf = safeFloat(p.valorFinanciado || c.valorFinanciado);
  const taxaMensal = safeFloat(p.taxaMensal || c.taxaMensal);
  const prazo = safeInt(p.prazo || c.prazoMeses);
  const prestacaoBanco = safeFloat(p.prestacao || c.parcela);
  const parcelasPagas = safeInt(p.parcelasPagas || c.parcelasPagas);
  const tt = tarifas.reduce((s: number, t: any) => s + (parseFloat(t.valor) || 0), 0);
  const taxaMediaMercado = safeFloat(p.taxaMediaMercado);
  const taxaAnual = safeFloat(p.taxaAnual);

  // === Projeção de Saldo Devedor ===
  const valorSemTarifas = Math.max(0, vf - tt);
  const diasCarencia = calcCarenciaDias(p.dataContratacao || c.dataContrato, p.primeiraParcela || c.primeiraParcela);
  const taxaProj = safeFloat(p.taxaProjecao || p.taxaMediaMercado) / 100;

  // === Cálculo da Prestação Devida ===
  const fatorNP = calcFatorNP(taxaProj, diasCarencia);
  const jurosCarencia = valorSemTarifas * fatorNP;
  const saldoComCarencia = valorSemTarifas + jurosCarencia;

  // Recalculate saldo at parcelas pagas point
  const saldoRefinanciado = useMemo(() => {
    if (!valorSemTarifas || !taxaProj || !prazo) return 0;
    let saldo = saldoComCarencia;
    const pmt = prestacaoBanco || calcPMT(saldo, taxaProj, prazo);
    for (let i = 1; i <= parcelasPagas; i++) {
      const juros = saldo * taxaProj;
      const amort = pmt - juros;
      saldo = saldo - amort;
    }
    return Math.max(0, saldo);
  }, [valorSemTarifas, taxaProj, prazo, saldoComCarencia, prestacaoBanco, parcelasPagas]);

  const prazoRestante = prazo - parcelasPagas;
  const novaPrestacao = saldoRefinanciado && taxaProj && prazoRestante > 0
    ? calcPMT(saldoRefinanciado, taxaProj, prazoRestante) : 0;

  // === Valores Corrigidos ===
  const diferencaParcela = prestacaoBanco - novaPrestacao;
  const valoresReceber = diferencaParcela * parcelasPagas; // parcelas pagas × diferença
  const economiaTotalRestante = novaPrestacao * prazoRestante; // nova prestação × prazo restante
  const totalPagoBanco = prestacaoBanco * prazo;
  const totalComRevisao = (prestacaoBanco * parcelasPagas) + (novaPrestacao * prazoRestante);
  const economiaTotal = totalPagoBanco - totalComRevisao;
  const devolucaoDobro = valoresReceber * 2;
  const reducaoPct = prestacaoBanco > 0 ? (diferencaParcela / prestacaoBanco * 100) : 0;

  // PDF export
  const pdfOpts = {
    title: "Resumo Final — Valores a Receber",
    subtitle: `Análise revisional — ${caso.codigo}`,
    clienteNome: caso.clientes?.nome || "",
    banco: c.banco || c.instituicao || p.banco || "",
    codigo: caso.codigo,
    contrato: p.contratoN || c.contratoN || "",
  };

  const handleExportPDF = () => {
    const doc = createBrandedDoc(pdfOpts);
    let y = getContentStartY(pdfOpts);

    y = drawSummaryCards(doc, [
      { label: "Prestação Original", value: `R$ ${formatBRL(prestacaoBanco)}`, color: "red" },
      { label: "Nova Prestação", value: `R$ ${formatBRL(novaPrestacao)}`, color: "green" },
      { label: "Redução", value: `${reducaoPct.toFixed(1)}%`, color: "blue" },
      { label: "Valores a Receber", value: `R$ ${formatBRL(valoresReceber)}`, color: "green" },
    ], y);

    y = drawSectionTitle(doc, "Como Era vs. Como Ficou", y, 1);
    y = drawKeyValueRows(doc, [
      { label: "Valor Financiado", value: `R$ ${formatBRL(vf)}` },
      { label: "Tarifas Abusivas Excluídas", value: `R$ ${formatBRL(tt)}`, bold: true, color: "red" as const },
      { label: "Base Corrigida", value: `R$ ${formatBRL(valorSemTarifas)}` },
      { label: "Prestação Banco", value: `R$ ${formatBRL(prestacaoBanco)}` },
      { label: "Nova Prestação (Corrigida)", value: `R$ ${formatBRL(novaPrestacao)}`, bold: true, color: "green" as const },
      { label: `Diferença por Parcela`, value: `R$ ${formatBRL(diferencaParcela)}`, bold: true, color: "green" as const },
    ], y);

    y = drawSectionTitle(doc, "Valores a Receber", y, 2);
    y = drawKeyValueRows(doc, [
      { label: `${parcelasPagas} parcelas pagas × R$ ${formatBRL(diferencaParcela)}`, value: `R$ ${formatBRL(valoresReceber)}`, bold: true, color: "green" as const },
      { label: `Devolução em Dobro (CDC art.42)`, value: `R$ ${formatBRL(devolucaoDobro)}`, bold: true, color: "green" as const },
    ], y);

    y = drawSectionTitle(doc, "Economia Total", y, 3);
    y = drawHighlightBox(doc, [
      { label: "Economia nas parcelas restantes", value: `R$ ${formatBRL(diferencaParcela * prazoRestante)}` },
      { label: "Valores pagos a mais (indébito)", value: `R$ ${formatBRL(valoresReceber)}` },
      { label: "Economia Total Estimada", value: `R$ ${formatBRL(economiaTotal)}`, big: true },
    ], y, "green");

    y = drawDisclaimer(doc, y);
    finalizeBrandedDoc(doc, `Resumo_Final_${(caso.clientes?.nome || "caso").replace(/\s+/g, "_")}`);
  };

  const handleExport = (format: string) => {
    if (format === "pdf") { handleExportPDF(); return; }
    const data = [{
      "Prestação Original": `R$ ${formatBRL(prestacaoBanco)}`,
      "Nova Prestação": `R$ ${formatBRL(novaPrestacao)}`,
      "Diferença por Parcela": `R$ ${formatBRL(diferencaParcela)}`,
      "Parcelas Pagas": parcelasPagas,
      "Valores a Receber": `R$ ${formatBRL(valoresReceber)}`,
      "Devolução em Dobro": `R$ ${formatBRL(devolucaoDobro)}`,
      "Economia Total": `R$ ${formatBRL(economiaTotal)}`,
    }];
    if (format === "csv") exportCSV(data, `resumo-final-${caso.codigo}`);
    if (format === "excel") exportExcel(data, `resumo-final-${caso.codigo}`);
    if (format === "json") exportJSON(data[0], `resumo-final-${caso.codigo}`);
  };

  const hasData = novaPrestacao > 0 && prestacaoBanco > 0;

  return (
    <div className="space-y-6">
      {!hasData && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="font-semibold text-foreground">Dados insuficientes</p>
          <p className="text-sm text-muted-foreground mt-1">Preencha a Planilha Revisional (Etapa 3) para gerar o resumo final.</p>
        </div>
      )}

      {hasData && (
        <>
          {/* Hero — Como Era vs Como Ficou */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-muted/30 p-6">
            <div className="absolute top-4 right-4">
              <button onClick={() => handleExport("pdf")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
                <Download className="w-3.5 h-3.5" /> Exportar PDF
              </button>
            </div>

            <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2 mb-6">
              <Scale className="w-5 h-5 text-primary" /> Resumo Final — Revisão Contratual
            </h2>

            {/* Comparativo visual */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center mb-6">
              {/* ANTES */}
              <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-5 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-md bg-destructive/10 text-destructive text-xs font-bold uppercase tracking-wider">Antes</span>
                  <span className="text-xs text-muted-foreground">Contrato original</span>
                </div>
                <CompareRow label="Valor Financiado" value={fmtR$(vf)} />
                <CompareRow label="Tarifas incluídas" value={fmtR$(tt)} highlight="destructive" />
                <CompareRow label="Taxa a.m." value={`${taxaMensal.toFixed(4)}%`} />
                {taxaAnual > 0 && <CompareRow label="Taxa a.a." value={`${taxaAnual.toFixed(2)}%`} />}
                <CompareRow label="Prazo" value={`${prazo} meses`} />
                <div className="pt-3 border-t border-destructive/20">
                  <CompareRow label="Prestação" value={fmtR$(prestacaoBanco)} big highlight="destructive" />
                </div>
                <CompareRow label="Total pago" value={fmtR$(totalPagoBanco)} sub />
              </div>

              {/* Arrow */}
              <div className="hidden md:flex flex-col items-center gap-2 py-4">
                <ArrowRight className="w-8 h-8 text-primary animate-pulse" />
                <span className="text-xs font-bold text-primary">REVISÃO</span>
              </div>
              <div className="flex md:hidden justify-center py-2">
                <ArrowRight className="w-6 h-6 text-primary rotate-90" />
              </div>

              {/* DEPOIS */}
              <div className="rounded-xl border-2 border-emerald-400/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider">Depois</span>
                  <span className="text-xs text-muted-foreground">Contrato revisado</span>
                </div>
                <CompareRow label="Base corrigida" value={fmtR$(valorSemTarifas)} />
                <CompareRow label="Tarifas excluídas" value={`- ${fmtR$(tt)}`} highlight="success" />
                <CompareRow label="Taxa aplicada (a.m.)" value={taxaProj > 0 ? `${(taxaProj * 100).toFixed(4)}%` : "—"} />
                <CompareRow label="Prazo restante" value={`${prazoRestante} meses`} />
                <div className="pt-3 border-t border-emerald-300/40">
                  <CompareRow label="Nova Prestação" value={fmtR$(novaPrestacao)} big highlight="success" />
                </div>
                <CompareRow label="Total revisado" value={fmtR$(totalComRevisao)} sub />
              </div>
            </div>

            {/* Diferença highlight */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <TrendingDown className="w-6 h-6 text-emerald-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Redução por parcela</p>
                  <p className="text-2xl font-bold font-mono text-emerald-600">{fmtR$(diferencaParcela)}</p>
                </div>
              </div>
              <div className="w-px h-10 bg-border hidden sm:block" />
              <div className="text-center sm:text-right">
                <p className="text-sm text-muted-foreground">Redução percentual</p>
                <p className="text-2xl font-bold font-mono text-primary">{reducaoPct.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Cards de resultado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Valores a Receber */}
            <ResultCard
              icon={<TrendingUp className="w-5 h-5" />}
              title="Valores a Receber"
              subtitle={`${parcelasPagas} parcelas pagas × ${fmtR$(diferencaParcela)}`}
              value={fmtR$(valoresReceber)}
              color="emerald"
            />

            {/* Economia Restante */}
            <ResultCard
              icon={<Shield className="w-5 h-5" />}
              title="Economia Restante"
              subtitle={`${prazoRestante} parcelas × ${fmtR$(diferencaParcela)}`}
              value={fmtR$(diferencaParcela * prazoRestante)}
              color="blue"
            />

            {/* Devolução em Dobro */}
            <ResultCard
              icon={<Scale className="w-5 h-5" />}
              title="Devolução em Dobro"
              subtitle="Art. 42 CDC — Repetição do indébito"
              value={fmtR$(devolucaoDobro)}
              color="amber"
            />
          </div>

          {/* Economia Total - Grande destaque */}
          <div className="rounded-2xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Economia Total Estimada</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Indébito recuperável + economia nas parcelas futuras</p>
                </div>
              </div>
              <p className="text-3xl sm:text-4xl font-bold font-mono text-emerald-600">{fmtR$(economiaTotal)}</p>
            </div>

            <div className="mt-4 pt-4 border-t border-emerald-300/40 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <SummaryLine label="Pago a mais (indébito)" value={fmtR$(valoresReceber)} />
              <SummaryLine label="Economia futura" value={fmtR$(diferencaParcela * prazoRestante)} />
              <SummaryLine label="Em dobro (CDC)" value={fmtR$(devolucaoDobro)} highlight />
            </div>
          </div>

          {/* Detalhamento passo a passo */}
          <details className="group rounded-xl border border-border">
            <summary className="px-5 py-4 cursor-pointer flex items-center justify-between text-sm font-semibold text-foreground hover:bg-muted/50 rounded-xl transition-colors">
              <span>📊 Detalhamento do Cálculo</span>
              <span className="text-xs text-muted-foreground group-open:hidden">Clique para expandir</span>
            </summary>
            <div className="px-5 pb-5 space-y-4">
              <StepDetail step={1} title="Tarifas abusivas excluídas do principal">
                {tarifas.map((t: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span className="text-muted-foreground">{t.descricao}</span>
                    <span className="font-mono text-destructive">R$ {formatBRL(parseFloat(t.valor) || 0)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border mt-2">
                  <span>Total excluído</span>
                  <span className="font-mono text-destructive">R$ {formatBRL(tt)}</span>
                </div>
              </StepDetail>

              <StepDetail step={2} title="Recálculo da prestação com taxa de mercado">
                <Row label="Base corrigida (s/ tarifas)" value={fmtR$(valorSemTarifas)} />
                <Row label="Taxa aplicada" value={taxaProj > 0 ? `${(taxaProj * 100).toFixed(4)}% a.m.` : "—"} />
                <Row label="Saldo na parcela " value={fmtR$(saldoRefinanciado)} sub={`${parcelasPagas}ª`} />
                <Row label="Prazo restante" value={`${prazoRestante} meses`} />
                <Row label="Nova prestação (PMT)" value={fmtR$(novaPrestacao)} bold green />
              </StepDetail>

              <StepDetail step={3} title="Valores a receber (indébito)">
                <Row label={`Diferença por parcela`} value={fmtR$(diferencaParcela)} />
                <Row label={`× ${parcelasPagas} parcelas já pagas`} value={fmtR$(valoresReceber)} bold green />
              </StepDetail>

              <StepDetail step={4} title="Economia total projetada">
                <Row label="Total que pagaria (original)" value={fmtR$(totalPagoBanco)} />
                <Row label="Total com revisão" value={fmtR$(totalComRevisao)} />
                <Row label="Economia total" value={fmtR$(economiaTotal)} bold green />
              </StepDetail>
            </div>
          </details>

          {/* Export buttons */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleExport("pdf")} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">📄 PDF</button>
            <button onClick={() => handleExport("csv")} className="px-3 py-2 rounded-lg border border-input text-xs font-medium hover:bg-muted transition-colors">📊 CSV</button>
            <button onClick={() => handleExport("excel")} className="px-3 py-2 rounded-lg border border-input text-xs font-medium hover:bg-muted transition-colors">📗 Excel</button>
            <button onClick={() => handleExport("json")} className="px-3 py-2 rounded-lg border border-input text-xs font-medium hover:bg-muted transition-colors">🔧 JSON</button>
          </div>
        </>
      )}
    </div>
  );
}

// === Sub-components ===

function fmtR$(v: number): string {
  return `R$ ${formatBRL(v)}`;
}

function CompareRow({ label, value, big, highlight, sub }: { label: string; value: string; big?: boolean; highlight?: "destructive" | "success"; sub?: boolean }) {
  const textColor = highlight === "destructive"
    ? "text-destructive"
    : highlight === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-foreground";
  return (
    <div className={`flex justify-between items-baseline ${sub ? "opacity-60" : ""}`}>
      <span className={`${big ? "text-sm font-semibold" : "text-xs"} text-muted-foreground`}>{label}</span>
      <span className={`${big ? "text-xl font-bold" : "text-sm font-medium"} font-mono ${textColor}`}>{value}</span>
    </div>
  );
}

function ResultCard({ icon, title, subtitle, value, color }: { icon: React.ReactNode; title: string; subtitle: string; value: string; color: "emerald" | "blue" | "amber" }) {
  const styles = {
    emerald: "border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-600",
    blue: "border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20 text-blue-600",
    amber: "border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 text-amber-600",
  };
  return (
    <div className={`rounded-xl border p-4 ${styles[color]} transition-shadow hover:shadow-md`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-sm font-semibold text-foreground">{title}</span></div>
      <p className="text-2xl font-bold font-mono mb-1">{value}</p>
      <p className="text-[11px] text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function SummaryLine({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono font-semibold ${highlight ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function StepDetail({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{step}</span>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      </div>
      <div className="pl-8 space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value, bold, green, sub }: { label: string; value: string; bold?: boolean; green?: boolean; sub?: string }) {
  return (
    <div className="flex justify-between text-sm py-0.5">
      <span className="text-muted-foreground">{label}{sub && <sup className="text-xs ml-0.5">{sub}</sup>}</span>
      <span className={`font-mono ${bold ? "font-bold" : ""} ${green ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
