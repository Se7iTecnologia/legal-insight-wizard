import { addMonths, parse, format, differenceInDays } from "date-fns";
import { calcPMT, calcRate, formatBRL, monthlyToAnnual } from "@/lib/calculations";
import React from "react";

/* ── Types ── */
export interface AmortRow {
  prazo: number | string;
  data: string;
  amortizacao: number;
  juros: number;
  prestacao: number;
  saldo: number;
  label?: string;
}

export interface RenegData {
  contratoN: string;
  dataContrato: string;
  primeiraParcela: string;
  taxaAplicada: string;
  prazo: string;
  exclusaoTarifas: string;
  prestacaoCobrada: string;
  parcelasPagas: string;
  saldoIdx: number;
}

export interface PlanilhaData {
  cliente: string;
  banco: string;
  contratoN: string;
  dataContratacao: string;
  primeiraParcela: string;
  taxaMensal: string;
  prestacao: string;
  valorFinanciado: string;
  prazo: string;
  taxaMediaMercado: string;
  houveRenegociacao: boolean;
  parcelasPagas: string;
  taxaProjecao: string;
  saldoRefinanciadoIdx: number;
  reneg: RenegData;
}

export interface Tarifa {
  descricao: string;
  valor: string;
  id: string;
}

export const defaultTarifas: Tarifa[] = [
  { descricao: "SEGURO DE PROTEÇÃO FINANCEIRA", valor: "", id: "t1" },
  { descricao: "REGISTRO DO CONTRATO", valor: "", id: "t2" },
  { descricao: "TARIFA DE CADASTRO", valor: "", id: "t3" },
  { descricao: "TARIFA DE AVALIAÇÃO", valor: "", id: "t4" },
];

export const defaultPlanilhaData: PlanilhaData = {
  cliente: "", banco: "", contratoN: "", dataContratacao: "", primeiraParcela: "",
  taxaMensal: "", prestacao: "", valorFinanciado: "", prazo: "", taxaMediaMercado: "",
  houveRenegociacao: false, parcelasPagas: "0", taxaProjecao: "", saldoRefinanciadoIdx: -1,
  reneg: {
    contratoN: "", dataContrato: "", primeiraParcela: "", taxaAplicada: "",
    prazo: "", exclusaoTarifas: "0", prestacaoCobrada: "", parcelasPagas: "0", saldoIdx: -1,
  },
};

/* ── CSS classes ── */
const base = "w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-ring";
export const cls = {
  input: `${base} border-input bg-card text-foreground`,
  yellow: `${base} bg-amber-50 border-amber-400 text-foreground dark:bg-amber-950/30 dark:border-amber-600`,
  green: `${base} bg-emerald-50 border-emerald-400 text-foreground font-semibold dark:bg-emerald-950/30 dark:border-emerald-600`,
  purple: `${base} bg-purple-50 border-purple-300 text-foreground dark:bg-purple-950/30 dark:border-purple-600`,
};

/* ── Helpers ── */
export function safeFloat(v: string | number | undefined): number {
  if (v === undefined || v === "") return 0;
  return parseFloat(String(v).replace(",", ".")) || 0;
}

export function safeInt(v: string | number | undefined): number {
  return Math.round(safeFloat(v));
}

export function calcCarenciaDias(dataContratacao: string, primeiraParcela: string): number {
  if (!dataContratacao || !primeiraParcela) return 30;
  try {
    return Math.max(0, differenceInDays(
      parse(primeiraParcela, "yyyy-MM-dd", new Date()),
      parse(dataContratacao, "yyyy-MM-dd", new Date())
    ));
  } catch { return 30; }
}

export function calcFatorNP(taxa: number, diasCarencia: number): number {
  if (!taxa || !diasCarencia) return 0;
  return Math.pow(1 + taxa, diasCarencia / 30) - 1;
}

export function calcTaxaAnual(taxaMensal: number): number {
  return monthlyToAnnual(taxaMensal) * 100;
}

export function calcTaxaReal(valorFinanciado: number, prestacao: number, prazo: number): number {
  if (!valorFinanciado || !prestacao || !prazo) return 0;
  return calcRate(valorFinanciado, prestacao, prazo) * 100;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try { return format(parse(dateStr, "yyyy-MM-dd", new Date()), "dd/MM/yyyy"); }
  catch { return dateStr; }
}

export function fmtMoney(v: number): string {
  if (Math.abs(v) < 0.005) return "—";
  if (v < 0) return `(R$ ${formatBRL(Math.abs(v))})`;
  return `R$ ${formatBRL(v)}`;
}

export function fmtPct(v: number): string {
  return `${v.toFixed(4)}%`;
}

export function totalTarifas(tarifas: Tarifa[]): number {
  return tarifas.reduce((s, t) => s + safeFloat(t.valor), 0);
}

/* ── Amortization Table Generator ── */
export function gerarTabelaAmortizacao(params: {
  valorBase: number;
  taxa: number;
  prazo: number;
  dataContratacao: string;
  primeiraParcela: string;
  diasCarencia: number;
  prestacaoFixa: number;
  substituirApos?: number;
  novaPrestacao?: number;
}): { rows: AmortRow[]; fatorNP: number; jurosCarencia: number; pmtCalculado: number } {
  const { valorBase, taxa, prazo, dataContratacao, primeiraParcela, diasCarencia, prestacaoFixa } = params;
  if (!valorBase || !taxa || !prazo) return { rows: [], fatorNP: 0, jurosCarencia: 0, pmtCalculado: 0 };

  const fatorNP = calcFatorNP(taxa, diasCarencia);
  const jurosCarencia = valorBase * fatorNP;
  const rows: AmortRow[] = [];

  rows.push({ prazo: 0, data: formatDate(dataContratacao), amortizacao: 0, juros: 0, prestacao: 0, saldo: valorBase, label: "CONTRATAÇÃO" });

  let saldo = valorBase + jurosCarencia;
  if (diasCarencia > 0) {
    rows.push({ prazo: "Car.", data: formatDate(primeiraParcela), amortizacao: -jurosCarencia, juros: jurosCarencia, prestacao: 0, saldo, label: "CARÊNCIA" });
  }

  const pmtCalculado = calcPMT(saldo, taxa, prazo);
  const prestBase = prestacaoFixa || pmtCalculado;

  for (let i = 1; i <= prazo; i++) {
    const juros = saldo * taxa;
    let prest = prestBase;
    if (params.substituirApos !== undefined && params.novaPrestacao && i > params.substituirApos) {
      prest = params.novaPrestacao;
    }
    const amort = prest - juros;
    saldo = saldo - amort;

    let dataStr = "";
    try {
      const d = addMonths(parse(primeiraParcela, "yyyy-MM-dd", new Date()), i - 1);
      dataStr = format(d, "dd/MM/yyyy");
    } catch { /* ignore */ }

    rows.push({ prazo: i, data: dataStr, amortizacao: amort, juros, prestacao: prest, saldo });
  }

  return { rows, fatorNP, jurosCarencia, pmtCalculado };
}

/* ── Field component ── */
export function Field({ label, children, hint, badge }: { label: string; children: React.ReactNode; hint?: string; badge?: "yellow" | "green" | "purple" }) {
  const dotColors: Record<string, string> = {
    yellow: "bg-amber-400",
    green: "bg-emerald-500",
    purple: "bg-purple-500",
  };
  return (
    <div>
      <label className="text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
        {badge && <span className={`inline-block w-2 h-2 rounded-full ${dotColors[badge]}`} />}
        {label}
        {hint && <span className="text-muted-foreground font-normal cursor-help" title={hint}>❓</span>}
      </label>
      {children}
    </div>
  );
}
