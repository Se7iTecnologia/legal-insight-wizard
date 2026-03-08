import { useState, useMemo, useCallback } from "react";
import { Save, FileDown, RotateCcw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PlanilhaData, Tarifa, defaultPlanilhaData, defaultTarifas, safeFloat, safeInt, totalTarifas, calcCarenciaDias, calcFatorNP, calcTaxaAnual, calcTaxaReal, gerarTabelaAmortizacao, fmtMoney, formatDate } from "./planilha/planilhaCalcs.tsx";
import { TabResumo } from "./planilha/TabResumo";
import { TabProjecaoSaldo } from "./planilha/TabProjecaoSaldo";
import { TabPrestacaoDevida } from "./planilha/TabPrestacaoDevida";
import { TabRenegProjecao } from "./planilha/TabRenegProjecao";
import { TabRenegPrestacao } from "./planilha/TabRenegPrestacao";
import { exportCSV, exportExcel, exportJSON } from "@/lib/exports";
import { createBrandedDoc, finalizeBrandedDoc, getContentStartY, drawSummaryCards, drawSectionTitle, drawBrandedTable, drawKeyValueRows, drawHighlightBox, drawDisclaimer } from "@/lib/pdfBranded";
import { formatBRL, calcPMT } from "@/lib/calculations";
import { toast } from "sonner";

interface Props {
  caso: any;
  onSave: (field: string, value: any) => void;
  onSaveBatch?: (updates: Record<string, any>) => Promise<void>;
  saving: boolean;
}

export function Etapa3Planilha({ caso, onSave, onSaveBatch, saving }: Props) {
  const [data, setData] = useState<PlanilhaData>(() => {
    const p = caso.contrato?.planilha || {};
    const c = caso.contrato || {};
    const bacen = (caso.bacen as any) || {};
    return {
      ...defaultPlanilhaData,
      cliente: caso.clientes?.nome || p.cliente || "",
      banco: p.banco || c.instituicao || c.banco || "",
      contratoN: p.contratoN || c.contratoN || "",
      dataContratacao: p.dataContratacao || c.dataContrato || c.dataContratacao || "",
      primeiraParcela: p.primeiraParcela || c.primeiraParcela || "",
      taxaMensal: p.taxaMensal || c.taxaMensal || "",
      prestacao: p.prestacao || c.parcela || "",
      valorFinanciado: p.valorFinanciado || c.valorFinanciado || "",
      prazo: p.prazo || c.prazoMeses || "",
      parcelasPagas: p.parcelasPagas || c.parcelasPagas || "0",
      taxaMediaMercado: p.taxaMediaMercado || bacen.mediaBacen || "",
      houveRenegociacao: p.houveRenegociacao || false,
      taxaProjecao: p.taxaProjecao || "",
      saldoRefinanciadoIdx: p.saldoRefinanciadoIdx ?? -1,
      reneg: { ...defaultPlanilhaData.reneg, ...(p.reneg || {}) },
    };
  });

  const [tarifas, setTarifas] = useState<Tarifa[]>(() => {
    const t = caso.tarifas;
    if (Array.isArray(t) && t.length > 0) return t;
    return defaultTarifas;
  });

  const [activeTab, setActiveTab] = useState("resumo");
  const [pdfSections, setPdfSections] = useState({
    resumo: true,
    projecao: true,
    prestacao: true,
    renegProj: true,
    renegPrest: true,
  });
  const [showPdfOptions, setShowPdfOptions] = useState(false);

  const handleChange = useCallback((partial: Partial<PlanilhaData>) => {
    setData(prev => ({ ...prev, ...partial }));
  }, []);

  const handleSave = async () => {
    const contratoAtualizado = {
      ...caso.contrato,
      planilha: data,
      valorFinanciado: data.valorFinanciado,
      taxaMensal: data.taxaMensal,
      parcela: data.prestacao,
      prazoMeses: data.prazo,
      dataContrato: data.dataContratacao,
      primeiraParcela: data.primeiraParcela,
      contratoN: data.contratoN,
      instituicao: data.banco,
      parcelasPagas: data.parcelasPagas,
    };
    if (onSaveBatch) {
      await onSaveBatch({ contrato: contratoAtualizado, tarifas });
    } else {
      await onSave("contrato", contratoAtualizado);
      await onSave("tarifas", tarifas);
    }
    toast.success("Planilha salva!");
  };

  const handleReset = () => {
    if (!confirm("Limpar todos os dados da planilha?")) return;
    setData({ ...defaultPlanilhaData });
    setTarifas(defaultTarifas);
    toast.info("Dados limpos");
  };

  // Calculate saldo from Tab 3 for renegociação tabs
  const saldoCorretoTab3 = useMemo(() => {
    const vf = safeFloat(data.valorFinanciado);
    const tt = totalTarifas(tarifas);
    const valorTotal = Math.max(0, vf - tt);
    const taxaProj = safeFloat(data.taxaProjecao || data.taxaMediaMercado) / 100;
    const prazo = safeInt(data.prazo);
    const prestBanco = safeFloat(data.prestacao);
    const diasCarencia = calcCarenciaDias(data.dataContratacao, data.primeiraParcela);
    const parcelasPagas = safeInt(data.parcelasPagas);

    if (!valorTotal || !taxaProj || !prazo) return 0;
    const tabela = gerarTabelaAmortizacao({
      valorBase: valorTotal, taxa: taxaProj, prazo,
      dataContratacao: data.dataContratacao, primeiraParcela: data.primeiraParcela,
      diasCarencia, prestacaoFixa: prestBanco,
    });
    const idx = data.saldoRefinanciadoIdx >= 0 ? data.saldoRefinanciadoIdx : parcelasPagas + (diasCarencia > 0 ? 1 : 0);
    return idx >= 0 && idx < tabela.rows.length ? tabela.rows[idx].saldo : 0;
  }, [data, tarifas]);

  const handleExportPDF = () => {
    const vf = safeFloat(data.valorFinanciado);
    const tt = totalTarifas(tarifas);
    const taxaProj = safeFloat(data.taxaProjecao || data.taxaMediaMercado) / 100;
    const prazo = safeInt(data.prazo);
    const prestBanco = safeFloat(data.prestacao);
    const diasCarencia = calcCarenciaDias(data.dataContratacao, data.primeiraParcela);
    const valorTotal = Math.max(0, vf - tt);
    const taxaM = safeFloat(data.taxaMensal) / 100;
    const parcelasPagas = safeInt(data.parcelasPagas);

    if (!valorTotal && !prazo) { toast.error("Preencha ao menos alguns dados"); return; }

    const opts = {
      title: "Relatório Planilha Revisional",
      subtitle: `Sistema Price — ${caso.codigo}`,
      clienteNome: data.cliente,
      banco: data.banco,
      codigo: caso.codigo,
      contrato: data.contratoN,
    };
    const doc = createBrandedDoc(opts);
    let y = getContentStartY(opts);
    const ph = doc.internal.pageSize.getHeight();

    const checkPage = (needed: number) => {
      if (y + needed > ph - 30) { doc.addPage(); y = 20; }
    };

    // ═══════════════════════════════════════
    // SEÇÃO 1: RESUMO
    // ═══════════════════════════════════════
    if (pdfSections.resumo) {
    y = drawSectionTitle(doc, "1. RESUMO DO CONTRATO", y, 1);

    y = drawSummaryCards(doc, [
      { label: "Valor Financiado", value: `R$ ${formatBRL(vf)}`, color: "navy" },
      { label: "Total Tarifas", value: `R$ ${formatBRL(tt)}`, color: "red" },
      { label: "Valor Correto", value: `R$ ${formatBRL(valorTotal)}`, color: "green" },
      { label: "Prazo", value: `${prazo} meses`, color: "blue" },
    ], y);

    // Dados do contrato
    y = drawKeyValueRows(doc, [
      { label: "Cliente", value: data.cliente || "—" },
      { label: "Banco", value: data.banco || "—" },
      { label: "Contrato Nº", value: data.contratoN || "—" },
      { label: "Data Contratação", value: formatDate(data.dataContratacao) },
      { label: "Primeira Parcela", value: formatDate(data.primeiraParcela) },
      { label: "Carência (dias)", value: String(diasCarencia) },
      { label: "Taxa Pactuada (a.m.)", value: `${data.taxaMensal}%` },
      { label: "Taxa Pactuada (a.a.)", value: taxaM ? `${(calcTaxaAnual(taxaM)).toFixed(4)}%` : "—" },
      { label: "Prestação", value: `R$ ${formatBRL(prestBanco)}` },
      { label: "Parcelas Pagas", value: data.parcelasPagas },
    ], y);

    // Tarifas table
    if (tarifas.some(t => safeFloat(t.valor) > 0)) {
      checkPage(40);
      y = drawSectionTitle(doc, "Taxas e Tarifas Abusivas/Irregulares", y);
      const tHead = ["Descrição", "Valor (R$)"];
      const tBody = tarifas.filter(t => t.descricao || safeFloat(t.valor) > 0).map(t => [t.descricao, `R$ ${formatBRL(safeFloat(t.valor))}`]);
      tBody.push(["TOTAL", `R$ ${formatBRL(tt)}`]);
      y = drawBrandedTable(doc, tHead, tBody, y);
    }

    // Comparativo de taxas
    const taxaReal = calcTaxaReal(vf, prestBanco, prazo);
    const taxaMedia = safeFloat(data.taxaMediaMercado);
    const variacao = taxaMedia ? ((taxaReal / taxaMedia) - 1) * 100 : 0;
    if (taxaM > 0) {
      checkPage(30);
      y = drawSectionTitle(doc, "Comparativo de Taxas", y);
      y = drawKeyValueRows(doc, [
        { label: "Taxa Pactuada", value: `${data.taxaMensal}%`, color: "navy" },
        { label: "Taxa Real Aplicada (RATE)", value: `${taxaReal.toFixed(4)}%`, color: variacao > 20 ? "red" : "navy" },
        { label: "Taxa Média Mercado (BACEN)", value: taxaMedia ? `${taxaMedia}%` : "Não informada" },
        { label: "Variação", value: variacao ? `${variacao.toFixed(2)}%` : "—", bold: true, color: variacao > 20 ? "red" : "green" },
      ], y);
    }
    } // end pdfSections.resumo

    // ═══════════════════════════════════════
    // SEÇÃO 2: PROJEÇÃO DO SALDO DEVEDOR
    // ═══════════════════════════════════════
    if (pdfSections.projecao && taxaProj > 0) {
      doc.addPage();
      y = 20;
      y = drawSectionTitle(doc, "2. PROJEÇÃO DO SALDO DEVEDOR", y, 2);

      const fatorNP = calcFatorNP(taxaProj, diasCarencia);
      const jurosCarencia = valorTotal * fatorNP;

      y = drawSummaryCards(doc, [
        { label: "Valor Total Financiado", value: `R$ ${formatBRL(valorTotal)}`, color: "blue" },
        { label: "Taxa Projeção", value: `${(taxaProj * 100).toFixed(4)}% a.m.`, color: "gold" },
        { label: "Fator NP", value: fatorNP.toFixed(8), color: "navy" },
        { label: "Juros Carência", value: `R$ ${formatBRL(jurosCarencia)}`, color: "navy" },
      ], y);

      const tabela = gerarTabelaAmortizacao({
        valorBase: valorTotal, taxa: taxaProj, prazo,
        dataContratacao: data.dataContratacao, primeiraParcela: data.primeiraParcela,
        diasCarencia, prestacaoFixa: prestBanco,
      });

      y = drawSectionTitle(doc, "Tabela de Amortização — Projeção", y);
      const head = ["Prazo", "Data", "Amortização", "Juros", "Prestação", "Saldo Devedor"];
      const body = tabela.rows.map(r => [
        r.label || String(r.prazo),
        r.data,
        r.label === "CONTRATAÇÃO" ? "—" : fmtMoney(r.amortizacao),
        r.label === "CONTRATAÇÃO" ? "—" : fmtMoney(r.juros),
        r.label === "CONTRATAÇÃO" ? "—" : fmtMoney(r.prestacao),
        fmtMoney(r.saldo),
      ]);
      y = drawBrandedTable(doc, head, body, y);

      // ═══════════════════════════════════════
      // SEÇÃO 3: CÁLCULO PRESTAÇÃO DEVIDA
      // ═══════════════════════════════════════
      if (pdfSections.prestacao) {
      doc.addPage();
      y = 20;
      y = drawSectionTitle(doc, "3. CÁLCULO PRESTAÇÃO DEVIDA", y, 3);

      const selectedIdx = data.saldoRefinanciadoIdx >= 0 ? data.saldoRefinanciadoIdx : parcelasPagas + (diasCarencia > 0 ? 1 : 0);
      const saldoRef = selectedIdx >= 0 && selectedIdx < tabela.rows.length ? tabela.rows[selectedIdx].saldo : 0;
      const prazoRestante = prazo - parcelasPagas;
      const novaPrest = saldoRef && prazoRestante > 0 ? calcPMT(saldoRef, taxaProj, prazoRestante) : 0;

      y = drawSummaryCards(doc, [
        { label: "Saldo Refinanciado", value: `R$ ${formatBRL(saldoRef)}`, color: "gold" },
        { label: "Prazo Restante", value: `${prazoRestante} meses`, color: "blue" },
        { label: "Nova Prestação", value: `R$ ${formatBRL(novaPrest)}`, color: "green" },
        { label: "Diferença/Parcela", value: `R$ ${formatBRL(prestBanco - novaPrest)}`, color: "red" },
      ], y);

      y = drawHighlightBox(doc, [
        { label: "Prestação cobrada pelo banco", value: `R$ ${formatBRL(prestBanco)}` },
        { label: "Prestação correta (calculada)", value: `R$ ${formatBRL(novaPrest)}`, big: true },
        { label: "Diferença por parcela", value: `R$ ${formatBRL(prestBanco - novaPrest)}` },
        { label: `Diferença total (${prazoRestante} parcelas)`, value: `R$ ${formatBRL((prestBanco - novaPrest) * prazoRestante)}`, big: true },
      ], y, "green");

      // Table with substitution
      if (novaPrest > 0) {
        const tabelaPrest = gerarTabelaAmortizacao({
          valorBase: valorTotal, taxa: taxaProj, prazo,
          dataContratacao: data.dataContratacao, primeiraParcela: data.primeiraParcela,
          diasCarencia, prestacaoFixa: prestBanco,
          substituirApos: parcelasPagas, novaPrestacao: novaPrest,
        });
        checkPage(30);
        y = drawSectionTitle(doc, "Tabela de Amortização — Prestação Devida", y);
        const body3 = tabelaPrest.rows.map(r => [
          r.label || String(r.prazo), r.data,
          r.label === "CONTRATAÇÃO" ? "—" : fmtMoney(r.amortizacao),
          r.label === "CONTRATAÇÃO" ? "—" : fmtMoney(r.juros),
          r.label === "CONTRATAÇÃO" ? "—" : fmtMoney(r.prestacao),
          fmtMoney(r.saldo),
        ]);
        y = drawBrandedTable(doc, head, body3, y);
      }
      } // end pdfSections.prestacao

      // ═══════════════════════════════════════
      // SEÇÕES 4 & 5: RENEGOCIAÇÃO (se ativo)
      // ═══════════════════════════════════════
      if (data.houveRenegociacao && pdfSections.renegProj) {
        const r = data.reneg;
        const rTaxa = safeFloat(r.taxaAplicada) / 100;
        const rPrazo = safeInt(r.prazo);
        const rExclusao = safeFloat(r.exclusaoTarifas);
        const rSaldoBase = saldoCorretoTab3 > 0 ? saldoCorretoTab3 - rExclusao : 0;
        const rDiasCarencia = calcCarenciaDias(r.dataContrato, r.primeiraParcela);
        const rFatorNP = calcFatorNP(rTaxa, rDiasCarencia);
        const rJurosCarencia = rSaldoBase * rFatorNP;
        const rPrestCobrada = safeFloat(r.prestacaoCobrada);
        const rNovaPrest = rSaldoBase && rTaxa && rPrazo ? calcPMT(rSaldoBase + rJurosCarencia, rTaxa, rPrazo) : 0;

        if (rSaldoBase > 0 && rTaxa > 0 && rPrazo > 0) {
          doc.addPage();
          y = 20;
          y = drawSectionTitle(doc, "4. PROJEÇÃO SALDO DEV. — RENEGOCIAÇÃO", y, 4);

          y = drawSummaryCards(doc, [
            { label: "Saldo Correto", value: `R$ ${formatBRL(rSaldoBase)}`, color: "blue" },
            { label: "Taxa Reneg.", value: `${r.taxaAplicada}% a.m.`, color: "gold" },
            { label: "Nova Prestação", value: `R$ ${formatBRL(rNovaPrest)}`, color: "green" },
            { label: "Novo Total", value: `R$ ${formatBRL(rNovaPrest * rPrazo)}`, color: "navy" },
          ], y);

          if (rPrestCobrada > 0 && rNovaPrest > 0) {
            y = drawHighlightBox(doc, [
              { label: "Prestação cobrada (Reneg.)", value: `R$ ${formatBRL(rPrestCobrada)}` },
              { label: "Prestação correta", value: `R$ ${formatBRL(rNovaPrest)}`, big: true },
              { label: "Diferença por parcela", value: `R$ ${formatBRL(rPrestCobrada - rNovaPrest)}` },
              { label: `Total cobrado a mais (${rPrazo}x)`, value: `R$ ${formatBRL((rPrestCobrada - rNovaPrest) * rPrazo)}`, big: true },
            ], y, "green");
          }

          const tabelaReneg = gerarTabelaAmortizacao({
            valorBase: rSaldoBase, taxa: rTaxa, prazo: rPrazo,
            dataContratacao: r.dataContrato, primeiraParcela: r.primeiraParcela,
            diasCarencia: rDiasCarencia, prestacaoFixa: rPrestCobrada || rNovaPrest,
          });
          checkPage(30);
          y = drawSectionTitle(doc, "Tabela de Amortização — Renegociação", y);
          const bodyR = tabelaReneg.rows.map(row => [
            row.label || String(row.prazo), row.data,
            row.label === "CONTRATAÇÃO" ? "—" : fmtMoney(row.amortizacao),
            row.label === "CONTRATAÇÃO" ? "—" : fmtMoney(row.juros),
            row.label === "CONTRATAÇÃO" ? "—" : fmtMoney(row.prestacao),
            fmtMoney(row.saldo),
          ]);
          y = drawBrandedTable(doc, head, bodyR, y);

          // Seção 5: Cálculo Prestação Renegociação
          const rParcelasPagas = safeInt(r.parcelasPagas);
          if (rParcelasPagas > 0 && pdfSections.renegPrest) {
            const rSelectedIdx = r.saldoIdx >= 0 ? r.saldoIdx : rParcelasPagas + (rDiasCarencia > 0 ? 1 : 0);
            const rSaldoAtual = rSelectedIdx >= 0 && rSelectedIdx < tabelaReneg.rows.length ? tabelaReneg.rows[rSelectedIdx].saldo : 0;
            const rPrazoRest = rPrazo - rParcelasPagas;
            const rPrestCorreta = rSaldoAtual && rTaxa && rPrazoRest > 0 ? calcPMT(rSaldoAtual, rTaxa, rPrazoRest) : 0;

            if (rPrestCorreta > 0) {
              doc.addPage();
              y = 20;
              y = drawSectionTitle(doc, "5. CÁLC. PRESTAÇÃO — RENEGOCIAÇÃO", y, 5);

              y = drawSummaryCards(doc, [
                { label: "Saldo Devedor", value: `R$ ${formatBRL(rSaldoAtual)}`, color: "gold" },
                { label: "Prazo Restante", value: `${rPrazoRest} meses`, color: "blue" },
                { label: "Prestação Correta", value: `R$ ${formatBRL(rPrestCorreta)}`, color: "green" },
              ], y);

              y = drawHighlightBox(doc, [
                { label: "Prestação cobrada", value: `R$ ${formatBRL(rPrestCobrada)}` },
                { label: "Prestação correta", value: `R$ ${formatBRL(rPrestCorreta)}`, big: true },
                { label: `Diferença total (${rPrazoRest}x)`, value: `R$ ${formatBRL((rPrestCobrada - rPrestCorreta) * rPrazoRest)}`, big: true },
              ], y, "green");
            }
          }
        }
      }
    }

    // Disclaimer
    checkPage(30);
    y = drawDisclaimer(doc, y);

    finalizeBrandedDoc(doc, `Planilha_Revisional_${(data.cliente || "caso").replace(/\s+/g, "_")}`);
  };

  const handleExportData = (format: string) => {
    const vf = safeFloat(data.valorFinanciado);
    const tt = totalTarifas(tarifas);
    const taxaProj = safeFloat(data.taxaProjecao || data.taxaMediaMercado) / 100;
    const prazo = safeInt(data.prazo);
    const prestBanco = safeFloat(data.prestacao);
    const diasCarencia = calcCarenciaDias(data.dataContratacao, data.primeiraParcela);
    const valorTotal = Math.max(0, vf - tt);

    if (!valorTotal || !taxaProj || !prazo) { toast.error("Preencha os dados"); return; }

    const tabela = gerarTabelaAmortizacao({
      valorBase: valorTotal, taxa: taxaProj, prazo,
      dataContratacao: data.dataContratacao, primeiraParcela: data.primeiraParcela,
      diasCarencia, prestacaoFixa: prestBanco,
    });

    const rows = tabela.rows.map(r => ({
      Prazo: r.label || r.prazo,
      Data: r.data,
      Amortização: r.amortizacao.toFixed(2),
      Juros: r.juros.toFixed(2),
      Prestação: r.prestacao.toFixed(2),
      "Saldo Devedor": r.saldo.toFixed(2),
    }));

    const name = `planilha-${caso.codigo}`;
    if (format === "csv") exportCSV(rows, name);
    if (format === "excel") exportExcel(rows, name);
    if (format === "json") exportJSON({ resumo: data, tarifas, amortizacao: tabela.rows }, name);
  };

  const tabConfig = [
    { value: "resumo", label: "RESUMO", color: "bg-emerald-500", enabled: true },
    { value: "projecao", label: "PROJEÇÃO SALDO DEV.", color: "bg-orange-500", enabled: true },
    { value: "prestacao", label: "CALC PRESTAÇÃO DEVIDA", color: "bg-orange-500", enabled: true },
    { value: "reneg-proj", label: "PROJ. RENEG. 1", color: "bg-lime-500", enabled: data.houveRenegociacao },
    { value: "reneg-prest", label: "CALC PREST. RENEG. 1", color: "bg-lime-500", enabled: data.houveRenegociacao },
  ];

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="h-auto bg-transparent gap-1 flex-wrap justify-start p-0">
            {tabConfig.map((tab, i) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                disabled={!tab.enabled}
                className={`
                  text-[10px] sm:text-xs font-bold px-2.5 sm:px-4 py-2 rounded-t-lg rounded-b-none border border-b-0
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all
                  ${activeTab === tab.value
                    ? `${tab.color} text-foreground border-border shadow-sm`
                    : "bg-muted/50 text-foreground border-border hover:bg-muted"
                  }
                `}
              >
                <span className="mr-1 font-mono text-[9px] opacity-70">{i + 1}</span>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="border border-border rounded-b-lg rounded-tr-lg p-4 sm:p-5 bg-card">
          <TabsContent value="resumo" className="mt-0">
            <TabResumo data={data} tarifas={tarifas} onChange={handleChange} onTarifasChange={setTarifas} />
          </TabsContent>
          <TabsContent value="projecao" className="mt-0">
            <TabProjecaoSaldo data={data} tarifas={tarifas} onChange={handleChange} />
          </TabsContent>
          <TabsContent value="prestacao" className="mt-0">
            <TabPrestacaoDevida data={data} tarifas={tarifas} onChange={handleChange} />
          </TabsContent>
          <TabsContent value="reneg-proj" className="mt-0">
            <TabRenegProjecao data={data} tarifas={tarifas} onChange={handleChange} saldoCorretoTab3={saldoCorretoTab3} />
          </TabsContent>
          <TabsContent value="reneg-prest" className="mt-0">
            <TabRenegPrestacao data={data} tarifas={tarifas} onChange={handleChange} saldoCorretoTab3={saldoCorretoTab3} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
            <FileDown className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={() => handleExportData("excel")} className="px-3 py-2 rounded-lg border border-input text-xs font-medium hover:bg-muted">📗 Excel</button>
          <button onClick={() => handleExportData("csv")} className="px-3 py-2 rounded-lg border border-input text-xs font-medium hover:bg-muted">📊 CSV</button>
          <button onClick={() => handleExportData("json")} className="px-3 py-2 rounded-lg border border-input text-xs font-medium hover:bg-muted">🔧 JSON</button>
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/10">
            <RotateCcw className="w-3.5 h-3.5" /> Limpar
          </button>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-warning text-white text-sm font-medium hover:bg-warning/90 transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}
