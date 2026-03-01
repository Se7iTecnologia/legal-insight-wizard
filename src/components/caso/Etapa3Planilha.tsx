import { useState } from "react";
import { DollarSign, Trash2, Plus } from "lucide-react";
import { formatBRL, monthlyToAnnual, monthlyToDaily, generateAmortTable } from "@/lib/calculations";
import { exportCSV, exportExcel, exportJSON } from "@/lib/exports";
import { createBrandedDoc, finalizeBrandedDoc, getContentStartY, drawSummaryCards, drawSectionTitle, drawBrandedTable, drawKeyValueRows } from "@/lib/pdfBranded";

interface Props {
  caso: any;
  onSave: (field: string, value: any) => void;
  saving: boolean;
}

export function Etapa3Planilha({ caso, onSave, saving }: Props) {
  const c = (caso.contrato as any) || {};
  const b = (caso.bacen as any) || {};
  const tarifas = Array.isArray(caso.tarifas) ? (caso.tarifas as any[]) : [];

  const [form, setForm] = useState({
    cliente: caso.clientes?.nome || "",
    banco: c.instituicao || c.banco || "",
    contratoN: c.contratoN || "",
    dataContratacao: c.dataContrato || c.dataContratacao || "",
    primeiraParcela: c.primeiraParcela || "",
    carencia: c.carencia || "30",
    taxaMensal: c.taxaMensal || "",
    taxaAnual: "",
    parcela: c.parcela || "",
    valorFinanciado: c.valorFinanciado || "",
    prazoMeses: c.prazoMeses || "",
    parcelasPagas: c.parcelasPagas || "0",
  });

  const [novaTarifa, setNovaTarifa] = useState({ descricao: "", valor: "" });

  const taxaM = parseFloat(form.taxaMensal) / 100 || 0;
  const taxaA = taxaM ? monthlyToAnnual(taxaM) * 100 : 0;
  const taxaD = taxaM ? monthlyToDaily(taxaM) * 100 : 0;
  const mediaBacen = parseFloat(b.mediaBacen) || 0;
  const variacao = mediaBacen && taxaM ? ((parseFloat(form.taxaMensal) - mediaBacen) / mediaBacen * 100) : 0;

  const totalTarifas = tarifas.reduce((sum: number, t: any) => sum + (parseFloat(t.valor) || 0), 0);

  const addTarifa = () => {
    if (!novaTarifa.descricao || !novaTarifa.valor) return;
    const updated = [...tarifas, { ...novaTarifa, id: Date.now().toString() }];
    onSave("tarifas", updated);
    setNovaTarifa({ descricao: "", valor: "" });
  };

  const removeTarifa = (idx: number) => {
    onSave("tarifas", tarifas.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    onSave("contrato", { ...c, ...form });
  };

  const handleExport = (format: string) => {
    const pv = parseFloat(form.valorFinanciado) || 0;
    const n = parseInt(form.prazoMeses) || 0;
    if (!pv || !taxaM || !n) return;
    const { rows } = generateAmortTable(pv, taxaM, n);
    const data = rows.map(r => ({
      Mês: r.mes, Prestação: formatBRL(r.pmt), Juros: formatBRL(r.juros),
      Amortização: formatBRL(r.amort), Saldo: formatBRL(r.saldo),
    }));

    if (format === "pdf") {
      const opts = {
        title: "Planilha Revisional",
        subtitle: `Sistema Price — ${caso.codigo}`,
        clienteNome: caso.clientes?.nome || "",
        banco: form.banco,
        codigo: caso.codigo,
        contrato: form.contratoN,
      };
      const doc = createBrandedDoc(opts);
      let y = getContentStartY(opts);

      y = drawSummaryCards(doc, [
        { label: "Valor Financiado", value: `R$ ${formatBRL(pv)}`, color: "navy" },
        { label: "Parcela", value: `R$ ${formatBRL(parseFloat(form.parcela))}`, color: "blue" },
        { label: "Taxa Mensal", value: `${parseFloat(form.taxaMensal).toFixed(4)}%`, color: "gold" },
        { label: "Prazo", value: `${n} meses`, color: "green" },
      ], y);

      y = drawSectionTitle(doc, "Dados do Contrato", y);
      y = drawKeyValueRows(doc, [
        { label: "Cliente", value: form.cliente },
        { label: "Banco", value: form.banco },
        { label: "Taxa a.a.", value: `${taxaA.toFixed(4)}%` },
        { label: "Média BACEN", value: mediaBacen ? `${mediaBacen.toFixed(4)}%` : "—" },
        { label: "Variação", value: variacao ? `${variacao.toFixed(2)}%` : "—", color: variacao > 10 ? "red" : "green" },
      ], y);

      y = drawSectionTitle(doc, "Tabela de Amortização (Price)", y);
      const head = ["Mês", "Prestação", "Juros", "Amortização", "Saldo Devedor"];
      const body = rows.map(r => [String(r.mes), `R$ ${formatBRL(r.pmt)}`, `R$ ${formatBRL(r.juros)}`, `R$ ${formatBRL(r.amort)}`, `R$ ${formatBRL(r.saldo)}`]);
      drawBrandedTable(doc, head, body, y);

      finalizeBrandedDoc(doc, `Planilha_Revisional_${(caso.clientes?.nome || "caso").replace(/\s+/g, "_")}`);
      return;
    }

    if (format === "csv") exportCSV(data, `planilha-${caso.codigo}`);
    if (format === "excel") exportExcel(data, `planilha-${caso.codigo}`);
    if (format === "json") exportJSON({ contrato: form, tarifas, amortizacao: rows }, `planilha-${caso.codigo}`);
  };

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const autoClass = "w-full px-3 py-2.5 rounded-lg border border-warning/30 bg-warning/5 text-foreground text-sm font-medium";

  return (
    <div className="space-y-6">
      {/* Dados do contrato */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-warning">📋</span>
          <h3 className="font-heading font-semibold text-foreground">Dados do Contrato</h3>
        </div>
        <p className="text-xs text-muted-foreground">🔒 Campos com fundo destacado são calculados automaticamente.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div><label className="text-xs font-medium text-foreground block mb-1">Cliente *</label>
            <input value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} className={inputClass} /></div>
          <div><label className="text-xs font-medium text-foreground block mb-1">Banco *</label>
            <input value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} className={inputClass} /></div>
          <div><label className="text-xs font-medium text-foreground block mb-1">Contrato Nº</label>
            <input value={form.contratoN} onChange={(e) => setForm({ ...form, contratoN: e.target.value })} className={inputClass} /></div>
          <div><label className="text-xs font-medium text-foreground block mb-1">Data Contratação</label>
            <input type="date" value={form.dataContratacao} onChange={(e) => setForm({ ...form, dataContratacao: e.target.value })} className={inputClass} /></div>
          <div><label className="text-xs font-medium text-foreground block mb-1">Primeira Parcela</label>
            <input type="date" value={form.primeiraParcela} onChange={(e) => setForm({ ...form, primeiraParcela: e.target.value })} className={inputClass} /></div>
          <div><label className="text-xs font-medium text-foreground block mb-1">Período de Carência (dias)</label>
            <input value={form.carencia} onChange={(e) => setForm({ ...form, carencia: e.target.value })} className={autoClass} /></div>
          <div><label className="text-xs font-medium text-foreground block mb-1">Taxa do contrato (a.m. %) *</label>
            <input value={form.taxaMensal} onChange={(e) => setForm({ ...form, taxaMensal: e.target.value })} className={inputClass} /></div>
          <div><label className="text-xs font-medium text-foreground block mb-1">Taxa do contrato (a.a. %)</label>
            <input readOnly value={taxaA ? taxaA.toFixed(4) : ""} className={autoClass} /></div>
          <div><label className="text-xs font-medium text-foreground block mb-1">Prestação (R$) *</label>
            <input value={form.parcela} onChange={(e) => setForm({ ...form, parcela: e.target.value })} className={inputClass} /></div>
          <div><label className="text-xs font-medium text-foreground block mb-1">Valor Financiado (R$) *</label>
            <input value={form.valorFinanciado} onChange={(e) => setForm({ ...form, valorFinanciado: e.target.value })} className={inputClass} /></div>
          <div><label className="text-xs font-medium text-foreground block mb-1">Prazo (meses) *</label>
            <input value={form.prazoMeses} onChange={(e) => setForm({ ...form, prazoMeses: e.target.value })} className={inputClass} /></div>
          <div><label className="text-xs font-medium text-foreground block mb-1">Parcelas Pagas *</label>
            <input type="number" min="0" value={form.parcelasPagas} onChange={(e) => setForm({ ...form, parcelasPagas: e.target.value })} className={inputClass} /></div>
        </div>
      </div>

      {/* Tarifas */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-destructive" />
          <h3 className="font-heading font-semibold text-foreground">Taxas e Tarifas Abusivas/Irregulares</h3>
        </div>

        {tarifas.map((t: any, i: number) => (
          <div key={i} className="flex items-center gap-2 bg-destructive/5 border border-destructive/10 rounded-lg px-3 py-2">
            <span className="flex-1 text-sm text-foreground">{t.descricao}</span>
            <span className="text-sm font-mono font-medium text-foreground">R$ {formatBRL(parseFloat(t.valor))}</span>
            <button onClick={() => removeTarifa(i)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
          </div>
        ))}

        <div className="flex flex-col sm:flex-row gap-2">
          <input placeholder="Descrição da tarifa" value={novaTarifa.descricao} onChange={(e) => setNovaTarifa({ ...novaTarifa, descricao: e.target.value })} className={inputClass + " flex-1"} />
          <div className="relative w-full sm:w-32">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
            <input type="number" step="0.01" placeholder="Valor" value={novaTarifa.valor} onChange={(e) => setNovaTarifa({ ...novaTarifa, valor: e.target.value })} className={inputClass + " pl-8"} />
          </div>
          <button onClick={addTarifa} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors whitespace-nowrap">
            <Plus className="w-4 h-4" /> Adicionar tarifa
          </button>
        </div>

        {totalTarifas > 0 && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg px-4 py-2 flex items-center justify-between">
            <span className="text-sm text-foreground">Total das tarifas</span>
            <span className="text-sm font-bold font-mono text-destructive">R$ {formatBRL(totalTarifas)}</span>
          </div>
        )}
      </div>

      {/* Comparativos */}
      {taxaM > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUpIcon className="w-4 h-4 text-info-purple" />
            <h3 className="font-heading font-semibold text-foreground">Comparativos</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Taxa pactuada" value={`${parseFloat(form.taxaMensal).toFixed(4)}% a.m.`} color="bg-info-purple/10 text-info-purple border-info-purple/20" />
            <StatCard label="Média BACEN" value={mediaBacen ? `${mediaBacen.toFixed(4)}% a.m.` : "—"} color="bg-info-blue/10 text-info-blue border-info-blue/20" />
            <StatCard label="Variação" value={variacao ? `${variacao.toFixed(2)}%` : "—"} color={variacao > 10 ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-success/10 text-success border-success/20"} />
            <StatCard label="Taxa anual" value={`${taxaA.toFixed(4)}% a.a.`} color="bg-primary/10 text-primary border-primary/20" />
            <StatCard label="Taxa diária (360d)" value={`${taxaD.toFixed(6)}%`} color="bg-warning/10 text-warning border-warning/20" />
            <StatCard label="Carência" value={`${form.carencia} dias`} color="bg-info-teal/10 text-info-teal border-info-teal/20" />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => handleExport("pdf")} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">📄 PDF</button>
          <button onClick={() => handleExport("csv")} className="px-3 py-2 rounded-lg border border-input text-xs font-medium hover:bg-muted">📊 CSV</button>
          <button onClick={() => handleExport("excel")} className="px-3 py-2 rounded-lg border border-input text-xs font-medium hover:bg-muted">📗 Excel</button>
          <button onClick={() => handleExport("json")} className="px-3 py-2 rounded-lg border border-input text-xs font-medium hover:bg-muted">🔧 JSON</button>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-lg bg-warning text-white text-sm font-medium hover:bg-warning/90 transition-colors disabled:opacity-50">
          {saving ? "Salvando..." : "💾 Salvar"}
        </button>
      </div>
    </div>
  );
}

function TrendingUpIcon(props: any) { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>; }

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <p className="text-[10px] opacity-80 mb-0.5">{label}</p>
      <p className="text-sm font-bold font-mono">{value}</p>
    </div>
  );
}
