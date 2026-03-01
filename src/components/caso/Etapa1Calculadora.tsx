import { useState, useEffect } from "react";
import { Calculator, Download } from "lucide-react";
import { solvePrice, formatBRL, monthlyToAnnual, generateAmortTable } from "@/lib/calculations";
import { exportCSV, exportExcel, exportJSON } from "@/lib/exports";
import { createBrandedDoc, finalizeBrandedDoc, getContentStartY, drawSummaryCards, drawSectionTitle, drawKeyValueRows, drawBrandedTable } from "@/lib/pdfBranded";

interface Props {
  caso: any;
  onSave: (field: string, value: any) => void;
  saving: boolean;
}

export function Etapa1Calculadora({ caso, onSave, saving }: Props) {
  const c = (caso.contrato as any) || {};
  const sim = (caso.simulacao as any) || {};
  const [nMeses, setNMeses] = useState(c.prazoMeses || "");
  const [taxaMensal, setTaxaMensal] = useState(c.taxaMensal || "");
  const [pmt, setPmt] = useState(c.parcela || "");
  const [pv, setPv] = useState(c.valorFinanciado || "");
  const [result, setResult] = useState<any>(sim.resultado || null);

  const handleCalc = () => {
    const inputs = {
      pv: pv ? parseFloat(pv) : undefined,
      pmt: pmt ? parseFloat(pmt) : undefined,
      n: nMeses ? parseInt(nMeses) : undefined,
      j: taxaMensal ? parseFloat(taxaMensal) / 100 : undefined,
    };
    const r = solvePrice(inputs);
    if (r) {
      setResult(r);
      if (!pv) setPv(r.pv.toFixed(2));
      if (!pmt) setPmt(r.pmt.toFixed(2));
      if (!nMeses) setNMeses(String(r.n));
      if (!taxaMensal) setTaxaMensal((r.j * 100).toFixed(4));
    }
  };

  const handleClear = () => {
    setNMeses(""); setTaxaMensal(""); setPmt(""); setPv(""); setResult(null);
  };

  const handleSave = () => {
    onSave("contrato", {
      ...c,
      prazoMeses: nMeses,
      taxaMensal: taxaMensal,
      parcela: pmt,
      valorFinanciado: pv,
    });
    if (result) {
      onSave("simulacao", { resultado: result });
    }
  };

  const handleExport = (format: string) => {
    if (!result) return;
    const taxaA = monthlyToAnnual(result.j) * 100;
    const totalPago = result.pmt * result.n;
    const totalJuros = totalPago - result.pv;

    if (format === "pdf") {
      const opts = {
        title: "Simulação — Calculadora Price",
        subtitle: `Metodologia BCB — ${caso.codigo}`,
        clienteNome: caso.clientes?.nome || "",
        banco: c.banco || c.instituicao || "",
        codigo: caso.codigo,
      };
      const doc = createBrandedDoc(opts);
      let y = getContentStartY(opts);

      y = drawSummaryCards(doc, [
        { label: "Valor Financiado", value: `R$ ${formatBRL(result.pv)}`, color: "navy" },
        { label: "Prestação", value: `R$ ${formatBRL(result.pmt)}`, color: "blue" },
        { label: "Taxa Mensal", value: `${(result.j * 100).toFixed(4)}%`, color: "gold" },
        { label: "Prazo", value: `${result.n} meses`, color: "green" },
      ], y);

      y = drawSectionTitle(doc, "Resumo do Cálculo", y);
      y = drawKeyValueRows(doc, [
        { label: "Valor Financiado (PV)", value: `R$ ${formatBRL(result.pv)}` },
        { label: "Prestação Mensal (PMT)", value: `R$ ${formatBRL(result.pmt)}` },
        { label: "Taxa Mensal (j)", value: `${(result.j * 100).toFixed(4)}%` },
        { label: "Taxa Anual", value: `${taxaA.toFixed(4)}%` },
        { label: "Nº de Parcelas (n)", value: String(result.n) },
        { label: "Total Pago", value: `R$ ${formatBRL(totalPago)}`, bold: true, color: "navy" },
        { label: "Total de Juros", value: `R$ ${formatBRL(totalJuros)}`, bold: true, color: "red" },
      ], y);

      y = drawSectionTitle(doc, "Tabela de Amortização (Price)", y);
      const { rows } = generateAmortTable(result.pv, result.j, result.n);
      const head = ["Mês", "Prestação", "Juros", "Amortização", "Saldo Devedor"];
      const body = rows.map(r => [String(r.mes), `R$ ${formatBRL(r.pmt)}`, `R$ ${formatBRL(r.juros)}`, `R$ ${formatBRL(r.amort)}`, `R$ ${formatBRL(r.saldo)}`]);
      drawBrandedTable(doc, head, body, y);

      finalizeBrandedDoc(doc, `Calculadora_Price_${(caso.clientes?.nome || "caso").replace(/\s+/g, "_")}`);
      return;
    }

    const data = [{
      "Valor Financiado": `R$ ${formatBRL(result.pv)}`,
      "Prestação": `R$ ${formatBRL(result.pmt)}`,
      "Taxa Mensal": `${(result.j * 100).toFixed(4)}%`,
      "Taxa Anual": `${taxaA.toFixed(4)}%`,
      "Prazo": `${result.n} meses`,
      "Total Pago": `R$ ${formatBRL(totalPago)}`,
      "Total Juros": `R$ ${formatBRL(totalJuros)}`,
    }];
    if (format === "csv") exportCSV(data, `calculadora-${caso.codigo}`);
    if (format === "excel") exportExcel(data, `calculadora-${caso.codigo}`);
    if (format === "json") exportJSON(data[0], `calculadora-${caso.codigo}`);
  };

  const inputClass = "w-full px-3 py-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calculator className="w-5 h-5 text-warning" />
        <div>
          <h2 className="text-lg font-heading font-semibold text-foreground">Simulação — Prestações Fixas (Price / BCB)</h2>
          <p className="text-sm text-muted-foreground">Preencha 3 dos 4 campos e deixe vazio o que deseja calcular.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground block mb-1.5">Nº de meses (n)</label>
          <input type="number" value={nMeses} onChange={(e) => setNMeses(e.target.value)} placeholder="Ex: 48" className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1.5">Taxa de juros mensal (i)</label>
          <div className="relative">
            <input type="text" value={taxaMensal} onChange={(e) => setTaxaMensal(e.target.value)} placeholder="Ex: 2,3" className={inputClass + " pr-8"} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1.5">Valor da prestação (PMT)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
            <input type="number" step="0.01" value={pmt} onChange={(e) => setPmt(e.target.value)} placeholder="Ex: 1406,76" className={inputClass + " pl-10"} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1.5">Valor financiado (PV)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
            <input type="number" step="0.01" value={pv} onChange={(e) => setPv(e.target.value)} placeholder="Ex: 30000.00" className={inputClass + " pl-10"} />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={handleCalc} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Calculator className="w-4 h-4" />
          Calcular
        </button>
        <button onClick={handleClear} className="px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm hover:bg-muted transition-colors">
          Limpar
        </button>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <ResultCard label="Valor Financiado" value={`R$ ${formatBRL(result.pv)}`} />
            <ResultCard label="Prestação" value={`R$ ${formatBRL(result.pmt)}`} />
            <ResultCard label="Taxa Mensal" value={`${(result.j * 100).toFixed(4)}%`} />
            <ResultCard label="Nº Meses" value={String(result.n)} />
            <ResultCard label="Total Pago" value={`R$ ${formatBRL(result.pmt * result.n)}`} accent />
            <ResultCard label="Total de Juros" value={`R$ ${formatBRL(result.pmt * result.n - result.pv)}`} accent />
          </div>

          {/* Export buttons */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleExport("pdf")} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium">📄 PDF</button>
            <button onClick={() => handleExport("csv")} className="px-3 py-2 rounded-lg border border-input text-xs font-medium hover:bg-muted">📊 CSV</button>
            <button onClick={() => handleExport("excel")} className="px-3 py-2 rounded-lg border border-input text-xs font-medium hover:bg-muted">📗 Excel</button>
            <button onClick={() => handleExport("json")} className="px-3 py-2 rounded-lg border border-input text-xs font-medium hover:bg-muted">🔧 JSON</button>
          </div>
        </>
      )}

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-lg bg-warning text-white text-sm font-medium hover:bg-warning/90 transition-colors disabled:opacity-50">
          {saving ? "Salvando..." : "💾 Salvar"}
        </button>
      </div>
    </div>
  );
}

function ResultCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? "bg-warning/5 border-warning/30" : "bg-card border-border"}`}>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-base font-bold font-mono text-foreground">{value}</p>
    </div>
  );
}
