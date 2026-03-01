/**
 * Motor de cálculos financeiros — Metodologia BCB Calculadora do Cidadão
 * q0 = (1 - (1+j)^(-n)) / j * p
 * PMT = PV * j / (1 - (1+j)^(-n))
 * Newton-Raphson para encontrar taxa (j) quando desconhecida
 */

export function calcPMT(pv: number, j: number, n: number): number {
  if (!pv || !j || !n) return 0;
  return pv * (j * Math.pow(1 + j, n)) / (Math.pow(1 + j, n) - 1);
}

export function calcPV(pmt: number, j: number, n: number): number {
  if (!pmt || !j || !n) return 0;
  return pmt * (1 - Math.pow(1 + j, -n)) / j;
}

export function calcN(pv: number, pmt: number, j: number): number {
  if (!pv || !pmt || !j) return 0;
  return Math.log(pmt / (pmt - pv * j)) / Math.log(1 + j);
}

/**
 * Newton-Raphson para encontrar a taxa mensal (j)
 * dado PV, PMT, n
 * Margem de erro sobre p inferior a 0.000001
 */
export function calcRate(pv: number, pmt: number, n: number, maxIter = 1000): number {
  if (!pv || !pmt || !n) return 0;
  let j = 0.01; // initial guess 1%
  for (let i = 0; i < maxIter; i++) {
    const pow = Math.pow(1 + j, n);
    const f = pv * j * pow / (pow - 1) - pmt;
    // derivative
    const powN1 = Math.pow(1 + j, n - 1);
    const denom = pow - 1;
    const df = pv * (pow + j * n * powN1) / denom - pv * j * pow * n * powN1 / (denom * denom);
    const jNew = j - f / df;
    if (Math.abs(jNew - j) < 1e-10) return jNew;
    j = jNew;
    if (j <= 0) j = 0.0001;
  }
  return j;
}

/** Calcula a variável faltante. Retorna { pv, pmt, n, j } completo */
export function solvePrice(inputs: { pv?: number; pmt?: number; n?: number; j?: number }): { pv: number; pmt: number; n: number; j: number } | null {
  const { pv, pmt, n, j } = inputs;
  const filled = [pv, pmt, n, j].filter(v => v !== undefined && v !== null && v > 0).length;
  if (filled < 3) return null;

  if (!pv && pmt && n && j) return { pv: calcPV(pmt, j, n), pmt, n, j };
  if (!pmt && pv && n && j) return { pv, pmt: calcPMT(pv, j, n), n, j };
  if (!n && pv && pmt && j) return { pv, pmt, n: Math.round(calcN(pv, pmt, j)), j };
  if (!j && pv && pmt && n) return { pv, pmt, n, j: calcRate(pv, pmt, n) };
  if (pv && pmt && n && j) return { pv, pmt, n, j };
  return null;
}

/** Taxa mensal → anual */
export function monthlyToAnnual(monthlyRate: number): number {
  return (Math.pow(1 + monthlyRate, 12) - 1);
}

/** Taxa mensal → diária (360 dias) */
export function monthlyToDaily(monthlyRate: number): number {
  return Math.pow(1 + monthlyRate, 1 / 30) - 1;
}

/** Gera tabela de amortização Price */
export function generateAmortTable(pv: number, j: number, n: number) {
  const pmt = calcPMT(pv, j, n);
  const rows = [];
  let saldo = pv;
  for (let i = 1; i <= n; i++) {
    const juros = saldo * j;
    const amort = pmt - juros;
    saldo = Math.max(0, saldo - amort);
    rows.push({ mes: i, pmt, juros, amort, saldo });
  }
  return { pmt, rows, totalPago: pmt * n, totalJuros: pmt * n - pv };
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
