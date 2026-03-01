import { useState, useMemo, useCallback } from "react";
import { Save, FileDown, RotateCcw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PlanilhaData, Tarifa, defaultPlanilhaData, defaultTarifas, safeFloat, safeInt, totalTarifas, calcCarenciaDias, gerarTabelaAmortizacao, fmtMoney } from "./planilha/planilhaCalcs.tsx";
import { TabResumo } from "./planilha/TabResumo";
import { TabProjecaoSaldo } from "./planilha/TabProjecaoSaldo";
import { TabPrestacaoDevida } from "./planilha/TabPrestacaoDevida";
import { TabRenegProjecao } from "./planilha/TabRenegProjecao";
import { TabRenegPrestacao } from "./planilha/TabRenegPrestacao";
import { exportCSV, exportExcel, exportJSON } from "@/lib/exports";
import { createBrandedDoc, finalizeBrandedDoc, getContentStartY, drawSummaryCards, drawSectionTitle, drawBrandedTable, drawKeyValueRows } from "@/lib/pdfBranded";
import { formatBRL, calcPMT } from "@/lib/calculations";
import { toast } from "sonner";

interface Props {
  caso: any;
  onSave: (field: string, value: any) => void;
  saving: boolean;
}

export function Etapa3Planilha({ caso, onSave, saving }: Props) {
  const [data, setData] = useState<PlanilhaData>(() => {
    const p = caso.contrato?.planilha || {};
    const c = caso.contrato || {};
    return {
      ...defaultPlanilhaData,
      cliente: caso.clientes?.nome || p.cliente || "",
      banco: c.instituicao || c.banco || p.banco || "",
      contratoN: c.contratoN || p.contratoN || "",
      dataContratacao: c.dataContrato || c.dataContratacao || p.dataContratacao || "",
      primeiraParcela: c.primeiraParcela || p.primeiraParcela || "",
      taxaMensal: c.taxaMensal || p.taxaMensal || "",
      prestacao: c.parcela || p.prestacao || "",
      valorFinanciado: c.valorFinanciado || p.valorFinanciado || "",
      prazo: c.prazoMeses || p.prazo || "",
      parcelasPagas: c.parcelasPagas || p.parcelasPagas || "0",
      taxaMediaMercado: p.taxaMediaMercado || "",
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

  const handleChange = useCallback((partial: Partial<PlanilhaData>) => {
    setData(prev => ({ ...prev, ...partial }));
  }, []);

  const handleSave = () => {
    onSave("contrato", { ...caso.contrato, planilha: data });
    onSave("tarifas", tarifas);
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

    if (!valorTotal || !taxaProj || !prazo) { toast.error("Preencha os dados do Resumo"); return; }

    const tabela = gerarTabelaAmortizacao({
      valorBase: valorTotal, taxa: taxaProj, prazo,
      dataContratacao: data.dataContratacao, primeiraParcela: data.primeiraParcela,
      diasCarencia, prestacaoFixa: prestBanco,
    });

    const opts = {
      title: "Planilha Revisional",
      subtitle: `Sistema Price — ${caso.codigo}`,
      clienteNome: data.cliente,
      banco: data.banco,
      codigo: caso.codigo,
      contrato: data.contratoN,
    };
    const doc = createBrandedDoc(opts);
    let y = getContentStartY(opts);

    y = drawSummaryCards(doc, [
      { label: "Valor Financiado", value: `R$ ${formatBRL(vf)}`, color: "navy" },
      { label: "Valor Correto", value: `R$ ${formatBRL(valorTotal)}`, color: "blue" },
      { label: "Taxa Projeção", value: `${(taxaProj * 100).toFixed(4)}% a.m.`, color: "gold" },
      { label: "Prazo", value: `${prazo} meses`, color: "green" },
    ], y);

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
    drawBrandedTable(doc, head, body, y);

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
                  data-[state=active]:text-white data-[state=active]:shadow-none
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all
                  ${activeTab === tab.value
                    ? `${tab.color} text-white border-border`
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
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
