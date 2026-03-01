import { useMemo } from "react";
import { PlanilhaData, Tarifa, cls, Field, safeFloat, safeInt, calcCarenciaDias, calcFatorNP, gerarTabelaAmortizacao, fmtMoney, formatDate } from "./planilhaCalcs";
import { AmortizacaoTable } from "./AmortizacaoTable";
import { calcPMT, formatBRL } from "@/lib/calculations";

interface Props {
  data: PlanilhaData;
  tarifas: Tarifa[];
  onChange: (d: Partial<PlanilhaData>) => void;
  saldoCorretoTab3: number;
}

export function TabRenegPrestacao({ data, tarifas, onChange, saldoCorretoTab3 }: Props) {
  const r = data.reneg;
  const updateReneg = (fields: Partial<typeof r>) => onChange({ reneg: { ...r, ...fields } });

  const diasCarencia = calcCarenciaDias(r.dataContrato, r.primeiraParcela);
  const taxa = safeFloat(r.taxaAplicada) / 100;
  const prazo = safeInt(r.prazo);
  const exclusao = safeFloat(r.exclusaoTarifas);
  const saldoBase = saldoCorretoTab3 > 0 ? saldoCorretoTab3 - exclusao : 0;
  const fatorNP = calcFatorNP(taxa, diasCarencia);
  const jurosCarencia = saldoBase * fatorNP;
  const prestCobrada = safeFloat(r.prestacaoCobrada);
  const parcelasPagas = safeInt(r.parcelasPagas);

  // Base table to find saldo at parcelas pagas
  const tabelaBase = useMemo(() => {
    if (!saldoBase || !taxa || !prazo) return null;
    return gerarTabelaAmortizacao({
      valorBase: saldoBase, taxa, prazo,
      dataContratacao: r.dataContrato, primeiraParcela: r.primeiraParcela,
      diasCarencia, prestacaoFixa: prestCobrada,
    });
  }, [saldoBase, taxa, prazo, r.dataContrato, r.primeiraParcela, diasCarencia, prestCobrada]);

  const selectedIdx = r.saldoIdx >= 0 ? r.saldoIdx : (tabelaBase && parcelasPagas > 0 ? parcelasPagas + (diasCarencia > 0 ? 1 : 0) : -1);
  const saldoAtual = tabelaBase && selectedIdx >= 0 && selectedIdx < tabelaBase.rows.length
    ? tabelaBase.rows[selectedIdx].saldo : 0;
  const prazoRestante = prazo - parcelasPagas;
  const prestCorreta = saldoAtual && taxa && prazoRestante > 0
    ? calcPMT(saldoAtual, taxa, prazoRestante) : 0;

  const tabelaFinal = useMemo(() => {
    if (!saldoBase || !taxa || !prazo || !prestCorreta) return tabelaBase;
    return gerarTabelaAmortizacao({
      valorBase: saldoBase, taxa, prazo,
      dataContratacao: r.dataContrato, primeiraParcela: r.primeiraParcela,
      diasCarencia, prestacaoFixa: prestCobrada,
      substituirApos: parcelasPagas, novaPrestacao: prestCorreta,
    });
  }, [saldoBase, taxa, prazo, r.dataContrato, r.primeiraParcela, diasCarencia, prestCobrada, parcelasPagas, prestCorreta]);

  const handleRowClick = (idx: number) => {
    updateReneg({ saldoIdx: idx });
  };

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="font-heading font-semibold text-foreground">🧮 Parâmetros — Prestação Renegociação</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Cliente" badge="purple"><input readOnly value={data.cliente} className={cls.purple} /></Field>
          <Field label="Banco" badge="purple"><input readOnly value={data.banco} className={cls.purple} /></Field>
          <Field label="Contrato Nº" badge="purple"><input readOnly value={r.contratoN || "—"} className={cls.purple} /></Field>
          <Field label="Data do Contrato" badge="purple"><input readOnly value={formatDate(r.dataContrato)} className={cls.purple} /></Field>
          <Field label="Primeira Prestação" badge="purple"><input readOnly value={formatDate(r.primeiraParcela)} className={cls.purple} /></Field>
          <Field label="Dias de Carência" badge="green"><input readOnly value={diasCarencia} className={cls.green} /></Field>
          <Field label="Taxa (a.m.%)" badge="purple"><input readOnly value={r.taxaAplicada || "—"} className={cls.purple} /></Field>
          <Field label="Fator NP" badge="green"><input readOnly value={fatorNP ? fatorNP.toFixed(8) : "—"} className={cls.green} /></Field>
          <Field label="Juros na carência" badge="green"><input readOnly value={jurosCarencia ? fmtMoney(jurosCarencia) : "—"} className={cls.green} /></Field>
          <Field label="Prazo" badge="purple"><input readOnly value={prazo || "—"} className={cls.purple} /></Field>
          <Field label="Exclusão tarifas" badge="purple"><input readOnly value={`R$ ${formatBRL(exclusao)}`} className={cls.purple} /></Field>
          <Field label="Parcelas pagas (Reneg.)" badge="yellow">
            <input type="number" min="0" value={r.parcelasPagas} onChange={e => updateReneg({ parcelasPagas: e.target.value })} className={cls.yellow} />
          </Field>
        </div>
      </section>

      {/* Resultado */}
      <section className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-heading font-semibold text-foreground">📐 Resultado</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Saldo Devedor" badge="yellow" hint="Clique na linha da tabela para selecionar o saldo devedor.">
            <input readOnly value={saldoAtual ? fmtMoney(saldoAtual) : "Clique na tabela ↓"} className={cls.yellow} />
          </Field>
          <Field label="Prazo Restante" badge="yellow">
            <input readOnly value={prazoRestante > 0 ? `${prazoRestante} meses` : "—"} className={cls.yellow} />
          </Field>
          <Field label="PRESTAÇÃO CORRETA" badge="green" hint="Valor da prestação incontroversa, a ser inserida na tabela abaixo após a última parcela paga.">
            <input readOnly value={prestCorreta ? fmtMoney(prestCorreta) : "—"} className={cls.green + " text-lg"} />
          </Field>
        </div>
      </section>

      {/* Tabela */}
      <section className="space-y-2">
        <h3 className="font-heading font-semibold text-foreground">📋 Tabela de Amortização — Renegociação</h3>
        <p className="text-[10px] text-muted-foreground">👆 Clique na linha da última parcela paga. Linhas em <span className="text-emerald-600 font-semibold">verde</span> usarão a prestação correta.</p>
        {tabelaFinal ? (
          <AmortizacaoTable
            rows={tabelaFinal.rows}
            onRowClick={handleRowClick}
            selectedIdx={selectedIdx}
            highlightAfter={parcelasPagas}
            maxHeight="500px"
          />
        ) : (
          <p className="text-sm text-muted-foreground italic text-center py-8">Preencha os dados da renegociação para gerar a tabela.</p>
        )}
      </section>
    </div>
  );
}
