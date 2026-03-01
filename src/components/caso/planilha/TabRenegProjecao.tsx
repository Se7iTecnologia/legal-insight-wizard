import { useMemo } from "react";
import { PlanilhaData, Tarifa, cls, Field, safeFloat, safeInt, totalTarifas, calcCarenciaDias, calcFatorNP, gerarTabelaAmortizacao, fmtMoney, formatDate } from "./planilhaCalcs";
import { AmortizacaoTable } from "./AmortizacaoTable";
import { calcPMT, formatBRL } from "@/lib/calculations";

interface Props {
  data: PlanilhaData;
  tarifas: Tarifa[];
  onChange: (d: Partial<PlanilhaData>) => void;
  saldoCorretoTab3: number;
}

export function TabRenegProjecao({ data, tarifas, onChange, saldoCorretoTab3 }: Props) {
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

  const novaPrestacao = saldoBase && taxa && prazo ? calcPMT(saldoBase + jurosCarencia, taxa, prazo) : 0;
  const novoTotal = novaPrestacao * prazo;

  const tabela = useMemo(() => {
    if (!saldoBase || !taxa || !prazo) return null;
    return gerarTabelaAmortizacao({
      valorBase: saldoBase, taxa, prazo,
      dataContratacao: r.dataContrato, primeiraParcela: r.primeiraParcela,
      diasCarencia, prestacaoFixa: prestCobrada || novaPrestacao,
    });
  }, [saldoBase, taxa, prazo, r.dataContrato, r.primeiraParcela, diasCarencia, prestCobrada, novaPrestacao]);

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="font-heading font-semibold text-foreground">🔄 Parâmetros da Renegociação</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Cliente" badge="purple"><input readOnly value={data.cliente} className={cls.purple} /></Field>
          <Field label="Banco" badge="purple"><input readOnly value={data.banco} className={cls.purple} /></Field>
          <Field label="Contrato Nº (Renegociação)" badge="yellow">
            <input value={r.contratoN} onChange={e => updateReneg({ contratoN: e.target.value })} className={cls.yellow} />
          </Field>
          <Field label="Data do Contrato (Renegociação)" badge="yellow">
            <input type="date" value={r.dataContrato} onChange={e => updateReneg({ dataContrato: e.target.value })} className={cls.yellow} />
          </Field>
          <Field label="Primeira Prestação (Reneg.)" badge="yellow">
            <input type="date" value={r.primeiraParcela} onChange={e => updateReneg({ primeiraParcela: e.target.value })} className={cls.yellow} />
          </Field>
          <Field label="Dias de Carência" badge="green"><input readOnly value={diasCarencia} className={cls.green} /></Field>
          <Field label="Taxa de juros (a.m.%)" badge="yellow" hint="Aplicar a taxa mais benéfica: taxa repactuada, taxa efetivamente aplicada após renegociação ou taxa média de mercado.">
            <input value={r.taxaAplicada} onChange={e => updateReneg({ taxaAplicada: e.target.value })} className={cls.yellow} placeholder="Ex: 1.5" />
          </Field>
          <Field label="Fator NP" badge="green"><input readOnly value={fatorNP ? fatorNP.toFixed(8) : "—"} className={cls.green} /></Field>
          <Field label="Juros na carência" badge="green"><input readOnly value={jurosCarencia ? fmtMoney(jurosCarencia) : "—"} className={cls.green} /></Field>
          <Field label="Prazo (meses)" badge="yellow">
            <input value={r.prazo} onChange={e => updateReneg({ prazo: e.target.value })} className={cls.yellow} />
          </Field>
          <Field label="Exclusão de tarifas (R$)" badge="yellow">
            <input value={r.exclusaoTarifas} onChange={e => updateReneg({ exclusaoTarifas: e.target.value })} className={cls.yellow} />
          </Field>
          <Field label="Saldo Dev. Correto a Refinanciar" badge="yellow" hint="Puxado automaticamente da Aba 3. Subtrair descontos e entrada pagos pelo cliente.">
            <input readOnly value={saldoBase ? fmtMoney(saldoBase) : "Preencha a Aba 3"} className={cls.yellow} />
          </Field>
          <Field label="Prestação cobrada na Reneg. (R$)" badge="yellow">
            <input value={r.prestacaoCobrada} onChange={e => updateReneg({ prestacaoCobrada: e.target.value })} className={cls.yellow} placeholder="Valor cobrado pelo banco" />
          </Field>
        </div>
      </section>

      {/* Resultado */}
      <section className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-heading font-semibold text-foreground">✅ Resultado</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="NOVA PRESTAÇÃO" badge="green">
            <input readOnly value={novaPrestacao ? fmtMoney(novaPrestacao) : "—"} className={cls.green + " text-lg"} />
          </Field>
          <Field label="NOVO TOTAL A PAGAR" badge="green">
            <input readOnly value={novoTotal ? fmtMoney(novoTotal) : "—"} className={cls.green + " text-lg"} />
          </Field>
        </div>
        {prestCobrada > 0 && novaPrestacao > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-lg p-3 text-sm">
            <p className="font-semibold text-foreground">
              💡 Diferença: <span className="text-destructive font-mono">{fmtMoney(prestCobrada - novaPrestacao)}</span> por parcela
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Total cobrado a mais: <strong className="text-destructive">{fmtMoney((prestCobrada - novaPrestacao) * prazo)}</strong>
            </p>
          </div>
        )}
      </section>

      {/* Tabela */}
      <section className="space-y-2">
        <h3 className="font-heading font-semibold text-foreground">📋 Tabela de Amortização — Renegociação</h3>
        {tabela ? (
          <AmortizacaoTable rows={tabela.rows} maxHeight="500px" />
        ) : (
          <p className="text-sm text-muted-foreground italic text-center py-8">Preencha os dados da renegociação para gerar a tabela.</p>
        )}
      </section>
    </div>
  );
}
