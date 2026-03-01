import { useMemo } from "react";
import { PlanilhaData, Tarifa, cls, Field, safeFloat, safeInt, totalTarifas, calcCarenciaDias, calcFatorNP, gerarTabelaAmortizacao, fmtMoney, fmtPct, formatDate } from "./planilhaCalcs.tsx";
import { AmortizacaoTable } from "./AmortizacaoTable";
import { formatBRL } from "@/lib/calculations";

interface Props {
  data: PlanilhaData;
  tarifas: Tarifa[];
  onChange: (d: Partial<PlanilhaData>) => void;
}

export function TabProjecaoSaldo({ data, tarifas, onChange }: Props) {
  const vf = safeFloat(data.valorFinanciado);
  const tt = totalTarifas(tarifas);
  const valorTotal = Math.max(0, vf - tt);
  const prazo = safeInt(data.prazo);
  const prestBanco = safeFloat(data.prestacao);
  const diasCarencia = calcCarenciaDias(data.dataContratacao, data.primeiraParcela);
  const taxaProj = safeFloat(data.taxaProjecao || data.taxaMediaMercado) / 100;
  const fatorNP = calcFatorNP(taxaProj, diasCarencia);
  const jurosCarencia = valorTotal * fatorNP;

  const tabela = useMemo(() => {
    if (!valorTotal || !taxaProj || !prazo) return null;
    return gerarTabelaAmortizacao({
      valorBase: valorTotal,
      taxa: taxaProj,
      prazo,
      dataContratacao: data.dataContratacao,
      primeiraParcela: data.primeiraParcela,
      diasCarencia,
      prestacaoFixa: prestBanco,
    });
  }, [valorTotal, taxaProj, prazo, data.dataContratacao, data.primeiraParcela, diasCarencia, prestBanco]);

  return (
    <div className="space-y-5">
      {/* Painel de Parâmetros */}
      <section className="space-y-3">
        <h3 className="font-heading font-semibold text-foreground">📊 Parâmetros da Projeção</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Cliente" badge="purple"><input readOnly value={data.cliente} className={cls.purple} /></Field>
          <Field label="Banco" badge="purple"><input readOnly value={data.banco} className={cls.purple} /></Field>
          <Field label="Data do Contrato" badge="purple"><input readOnly value={formatDate(data.dataContratacao)} className={cls.purple} /></Field>
          <Field label="Primeira Prestação" badge="purple"><input readOnly value={formatDate(data.primeiraParcela)} className={cls.purple} /></Field>
          <Field label="Dias de Carência" badge="green"><input readOnly value={diasCarencia} className={cls.green} /></Field>
          <Field label="Taxa de juros aplicada (a.m.%)" badge="yellow" hint="Aplicar a taxa mais favorável ao cliente (taxa média de mercado). Projeta quanto o cliente pagaria a mais sem intervenção jurídica.">
            <input value={data.taxaProjecao || data.taxaMediaMercado} onChange={e => onChange({ taxaProjecao: e.target.value })} className={cls.yellow} placeholder="Taxa média mercado" />
          </Field>
          <Field label="Fator NP (Carência)" badge="green"><input readOnly value={fatorNP ? fatorNP.toFixed(8) : "—"} className={cls.green} /></Field>
          <Field label="Juros cobrado na carência" badge="green"><input readOnly value={jurosCarencia ? fmtMoney(jurosCarencia) : "—"} className={cls.green} /></Field>
          <Field label="Valor financiado no contrato" badge="purple"><input readOnly value={`R$ ${formatBRL(vf)}`} className={cls.purple} /></Field>
          <Field label="Prazo (meses)" badge="purple"><input readOnly value={prazo || "—"} className={cls.purple} /></Field>
          <Field label="Exclusão de tarifas e taxas" badge="green"><input readOnly value={`R$ ${formatBRL(tt)}`} className={cls.green} /></Field>
          <Field label="Valor Total Financiado" badge="green"><input readOnly value={`R$ ${formatBRL(valorTotal)}`} className={cls.green} /></Field>
        </div>
      </section>

      {/* Regras */}
      <div className="bg-muted/40 rounded-lg p-3 text-[10px] text-muted-foreground space-y-0.5">
        <p><strong>Regras de cálculo:</strong></p>
        <p>• Prestação = taxa × nº de meses × capital presente (PMT)</p>
        <p>• Amortização = Prestação − Juros</p>
        <p>• Saldo Devedor = Saldo Anterior − Amortização</p>
        <p>• Juros = Saldo Devedor × Taxa de juros</p>
      </div>

      {/* Tabela */}
      <section className="space-y-2">
        <h3 className="font-heading font-semibold text-foreground">📋 Tabela de Amortização — Sistema Price</h3>
        {tabela ? (
          <>
            <div className="flex gap-3 text-xs mb-2">
              <span className="text-emerald-600 font-medium">PMT Calculado: {fmtMoney(tabela.pmtCalculado)}</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-purple-600 font-medium">Prestação Banco: {fmtMoney(prestBanco)}</span>
            </div>
            <AmortizacaoTable rows={tabela.rows} maxHeight="500px" />
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic text-center py-8">Preencha os dados do RESUMO e a taxa de projeção para gerar a tabela.</p>
        )}
      </section>
    </div>
  );
}
