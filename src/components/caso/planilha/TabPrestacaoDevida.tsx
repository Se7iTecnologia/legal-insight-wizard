import { useMemo } from "react";
import { PlanilhaData, Tarifa, cls, Field, safeFloat, safeInt, totalTarifas, calcCarenciaDias, calcFatorNP, gerarTabelaAmortizacao, fmtMoney, formatDate } from "./planilhaCalcs";
import { AmortizacaoTable } from "./AmortizacaoTable";
import { calcPMT, formatBRL } from "@/lib/calculations";

interface Props {
  data: PlanilhaData;
  tarifas: Tarifa[];
  onChange: (d: Partial<PlanilhaData>) => void;
}

export function TabPrestacaoDevida({ data, tarifas, onChange }: Props) {
  const vf = safeFloat(data.valorFinanciado);
  const tt = totalTarifas(tarifas);
  const valorTotal = Math.max(0, vf - tt);
  const prazo = safeInt(data.prazo);
  const prestBanco = safeFloat(data.prestacao);
  const parcelasPagas = safeInt(data.parcelasPagas);
  const diasCarencia = calcCarenciaDias(data.dataContratacao, data.primeiraParcela);
  const taxaProj = safeFloat(data.taxaProjecao || data.taxaMediaMercado) / 100;
  const fatorNP = calcFatorNP(taxaProj, diasCarencia);
  const jurosCarencia = valorTotal * fatorNP;

  // Generate base table (same as Tab 2) to find saldo at parcelas pagas
  const tabelaBase = useMemo(() => {
    if (!valorTotal || !taxaProj || !prazo) return null;
    return gerarTabelaAmortizacao({
      valorBase: valorTotal, taxa: taxaProj, prazo,
      dataContratacao: data.dataContratacao, primeiraParcela: data.primeiraParcela,
      diasCarencia, prestacaoFixa: prestBanco,
    });
  }, [valorTotal, taxaProj, prazo, data.dataContratacao, data.primeiraParcela, diasCarencia, prestBanco]);

  // Find saldo at selected row or parcelas pagas
  const selectedIdx = data.saldoRefinanciadoIdx >= 0 ? data.saldoRefinanciadoIdx : (tabelaBase && parcelasPagas > 0 ? parcelasPagas + (diasCarencia > 0 ? 1 : 0) : -1);
  const saldoRefinanciado = tabelaBase && selectedIdx >= 0 && selectedIdx < tabelaBase.rows.length
    ? tabelaBase.rows[selectedIdx].saldo : 0;
  const prazoRestante = prazo - parcelasPagas;
  const novaPrestacao = saldoRefinanciado && taxaProj && prazoRestante > 0
    ? calcPMT(saldoRefinanciado, taxaProj, prazoRestante) : 0;

  // Table with substitution after parcelas pagas
  const tabelaFinal = useMemo(() => {
    if (!valorTotal || !taxaProj || !prazo || !novaPrestacao) return tabelaBase;
    return gerarTabelaAmortizacao({
      valorBase: valorTotal, taxa: taxaProj, prazo,
      dataContratacao: data.dataContratacao, primeiraParcela: data.primeiraParcela,
      diasCarencia, prestacaoFixa: prestBanco,
      substituirApos: parcelasPagas, novaPrestacao,
    });
  }, [valorTotal, taxaProj, prazo, data.dataContratacao, data.primeiraParcela, diasCarencia, prestBanco, parcelasPagas, novaPrestacao]);

  const handleRowClick = (idx: number) => {
    onChange({ saldoRefinanciadoIdx: idx });
  };

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="font-heading font-semibold text-foreground">🧮 Parâmetros do Cálculo</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Cliente" badge="purple"><input readOnly value={data.cliente} className={cls.purple} /></Field>
          <Field label="Banco" badge="purple"><input readOnly value={data.banco} className={cls.purple} /></Field>
          <Field label="Contrato Nº" badge="purple"><input readOnly value={data.contratoN} className={cls.purple} /></Field>
          <Field label="Data do Contrato" badge="purple"><input readOnly value={formatDate(data.dataContratacao)} className={cls.purple} /></Field>
          <Field label="Primeira Prestação" badge="purple"><input readOnly value={formatDate(data.primeiraParcela)} className={cls.purple} /></Field>
          <Field label="Dias de Carência" badge="green"><input readOnly value={diasCarencia} className={cls.green} /></Field>
          <Field label="Taxa de juros (a.m.%)" badge="purple"><input readOnly value={data.taxaProjecao || data.taxaMediaMercado || "—"} className={cls.purple} /></Field>
          <Field label="Fator NP" badge="green"><input readOnly value={fatorNP ? fatorNP.toFixed(8) : "—"} className={cls.green} /></Field>
          <Field label="Juros na carência" badge="green"><input readOnly value={jurosCarencia ? fmtMoney(jurosCarencia) : "—"} className={cls.green} /></Field>
          <Field label="Valor Total Financiado" badge="green"><input readOnly value={`R$ ${formatBRL(valorTotal)}`} className={cls.green} /></Field>
          <Field label="Prazo" badge="purple"><input readOnly value={prazo || "—"} className={cls.purple} /></Field>
          <Field label="Exclusão de tarifas" badge="green"><input readOnly value={`R$ ${formatBRL(tt)}`} className={cls.green} /></Field>
        </div>
      </section>

      {/* Resultado */}
      <section className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-heading font-semibold text-foreground">📐 Resultado</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Saldo Devedor Refinanciado" badge="yellow" hint="Clique na linha da tabela abaixo que corresponde à última parcela paga para selecionar o saldo devedor.">
            <input readOnly value={saldoRefinanciado ? fmtMoney(saldoRefinanciado) : "Clique na tabela ↓"} className={cls.yellow} />
          </Field>
          <Field label="Prazo Restante" badge="yellow" hint="Prazo total menos parcelas pagas">
            <input readOnly value={prazoRestante > 0 ? `${prazoRestante} meses` : "—"} className={cls.yellow} />
          </Field>
          <Field label="NOVA PRESTAÇÃO" badge="green" hint="PMT calculado com taxa correta, prazo restante e saldo refinanciado. Este é o valor correto que deveria ser cobrado.">
            <input readOnly value={novaPrestacao ? fmtMoney(novaPrestacao) : "—"} className={cls.green + " text-lg"} />
          </Field>
        </div>
        {novaPrestacao > 0 && prestBanco > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-lg p-3 text-sm">
            <p className="font-semibold text-foreground">💡 Diferença por parcela: <span className="text-destructive font-mono">{fmtMoney(prestBanco - novaPrestacao)}</span></p>
            <p className="text-xs text-muted-foreground mt-1">
              Multiplicando pela quantidade de parcelas restantes ({prazoRestante}): <strong className="text-destructive">{fmtMoney((prestBanco - novaPrestacao) * prazoRestante)}</strong>
            </p>
          </div>
        )}
      </section>

      {/* Tabela */}
      <section className="space-y-2">
        <h3 className="font-heading font-semibold text-foreground">📋 Tabela de Amortização</h3>
        <p className="text-[10px] text-muted-foreground">👆 Clique na linha correspondente à última parcela paga. Linhas em <span className="text-emerald-600 font-semibold">verde</span> usarão a nova prestação calculada.</p>
        {tabelaFinal ? (
          <AmortizacaoTable
            rows={tabelaFinal.rows}
            onRowClick={handleRowClick}
            selectedIdx={selectedIdx}
            highlightAfter={parcelasPagas}
            maxHeight="500px"
          />
        ) : (
          <p className="text-sm text-muted-foreground italic text-center py-8">Preencha os dados do RESUMO para gerar a tabela.</p>
        )}
      </section>
    </div>
  );
}
