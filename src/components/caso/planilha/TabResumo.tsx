import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { PlanilhaData, Tarifa, cls, Field, safeFloat, safeInt, totalTarifas, calcCarenciaDias, calcTaxaAnual, calcTaxaReal, fmtPct } from "./planilhaCalcs";

interface Props {
  data: PlanilhaData;
  tarifas: Tarifa[];
  onChange: (d: Partial<PlanilhaData>) => void;
  onTarifasChange: (t: Tarifa[]) => void;
}

export function TabResumo({ data, tarifas, onChange, onTarifasChange }: Props) {
  const taxaM = safeFloat(data.taxaMensal) / 100;
  const taxaA = taxaM ? calcTaxaAnual(taxaM) : 0;
  const carencia = calcCarenciaDias(data.dataContratacao, data.primeiraParcela);
  const vf = safeFloat(data.valorFinanciado);
  const prest = safeFloat(data.prestacao);
  const prazo = safeInt(data.prazo);
  const taxaReal = calcTaxaReal(vf, prest, prazo);
  const taxaMedia = safeFloat(data.taxaMediaMercado);
  const variacao = taxaMedia ? ((taxaReal / taxaMedia) - 1) * 100 : 0;
  const tt = totalTarifas(tarifas);

  const addTarifa = () => onTarifasChange([...tarifas, { descricao: "", valor: "", id: Date.now().toString() }]);
  const removeTarifa = (i: number) => onTarifasChange(tarifas.filter((_, idx) => idx !== i));
  const updateTarifa = (i: number, field: string, val: string) => {
    const updated = [...tarifas];
    updated[i] = { ...updated[i], [field]: val };
    onTarifasChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* Dados do Contrato */}
      <section className="space-y-3">
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">📋 Dados do Contrato</h3>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-amber-400" /> Input manual
          <span className="inline-block w-3 h-3 rounded bg-emerald-500 ml-2" /> Calculado
          <span className="inline-block w-3 h-3 rounded bg-purple-500 ml-2" /> Referência
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Cliente" badge="yellow">
            <input value={data.cliente} onChange={e => onChange({ cliente: e.target.value })} className={cls.yellow} />
          </Field>
          <Field label="Banco" badge="yellow">
            <input value={data.banco} onChange={e => onChange({ banco: e.target.value })} className={cls.yellow} />
          </Field>
          <Field label="Contrato Nº" badge="yellow">
            <input value={data.contratoN} onChange={e => onChange({ contratoN: e.target.value })} className={cls.yellow} />
          </Field>
          <Field label="Data Contratação" badge="yellow">
            <input type="date" value={data.dataContratacao} onChange={e => onChange({ dataContratacao: e.target.value })} className={cls.yellow} />
          </Field>
          <Field label="Primeira Parcela" badge="yellow">
            <input type="date" value={data.primeiraParcela} onChange={e => onChange({ primeiraParcela: e.target.value })} className={cls.yellow} />
          </Field>
          <Field label="Período de Carência (dias)" badge="green">
            <input readOnly value={carencia} className={cls.green} />
          </Field>
          <Field label="Taxa do contrato (a.m.%)" badge="yellow" hint="Taxa de juros mensal pactuada no contrato">
            <input value={data.taxaMensal} onChange={e => onChange({ taxaMensal: e.target.value })} className={cls.yellow} placeholder="Ex: 2.5" />
          </Field>
          <Field label="Taxa do contrato (a.a.%)" badge="green">
            <input readOnly value={taxaA ? taxaA.toFixed(4) : ""} className={cls.green} />
          </Field>
          <Field label="Prestação (R$)" badge="yellow">
            <input value={data.prestacao} onChange={e => onChange({ prestacao: e.target.value })} className={cls.yellow} placeholder="Ex: 1500.00" />
          </Field>
          <Field label="Valor Financiado (R$)" badge="yellow">
            <input value={data.valorFinanciado} onChange={e => onChange({ valorFinanciado: e.target.value })} className={cls.yellow} placeholder="Ex: 50000.00" />
          </Field>
          <Field label="Prazo (meses)" badge="yellow">
            <input value={data.prazo} onChange={e => onChange({ prazo: e.target.value })} className={cls.yellow} placeholder="Ex: 60" />
          </Field>
          <Field label="Parcelas Pagas" badge="yellow" hint="Quantas parcelas o cliente já pagou">
            <input type="number" min="0" value={data.parcelasPagas} onChange={e => onChange({ parcelasPagas: e.target.value })} className={cls.yellow} />
          </Field>
        </div>
      </section>

      {/* Tarifas */}
      <section className="space-y-3">
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" /> Taxas e Tarifas Abusivas/Irregulares
        </h3>
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-destructive/10">
                <th className="text-left px-3 py-2 font-medium">Descrição</th>
                <th className="text-right px-3 py-2 font-medium w-36">Valor (R$)</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {tarifas.map((t, i) => (
                <tr key={t.id} className="border-t border-border/50">
                  <td className="px-2 py-1">
                    <input value={t.descricao} onChange={e => updateTarifa(i, "descricao", e.target.value)} className={cls.yellow + " text-xs"} />
                  </td>
                  <td className="px-2 py-1">
                    <input type="number" step="0.01" value={t.valor} onChange={e => updateTarifa(i, "valor", e.target.value)} className={cls.yellow + " text-xs text-right"} />
                  </td>
                  <td className="px-1 py-1">
                    <button onClick={() => removeTarifa(i)} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-amber-100/60 dark:bg-amber-900/30">
                <td className="px-3 py-2 font-bold text-sm">TOTAL DAS TAXAS E TARIFAS</td>
                <td className="px-3 py-2 text-right font-bold font-mono text-destructive">R$ {tt.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <button onClick={addTarifa} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-border text-xs hover:bg-muted transition-colors">
          <Plus className="w-3.5 h-3.5" /> Adicionar linha
        </button>
        <p className="text-[10px] text-muted-foreground">⚠️ Caso seja necessário acrescentar linhas, inserir acima da última para não prejudicar a atuação da fórmula.</p>
      </section>

      {/* Comparativo */}
      {taxaM > 0 && (
        <section className="space-y-3">
          <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">📊 Comparativo de Taxas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <ComparCard label="Taxa Pactuada" value={fmtPct(safeFloat(data.taxaMensal))} sub="a.m." color="purple" />
            <ComparCard label="Taxa Real Aplicada" value={fmtPct(taxaReal)} sub="a.m. (RATE)" color="purple" />
            <div>
              <Field label="Taxa Média Mercado (a.m.%)" badge="yellow" hint="Consulte no BACEN: Séries Temporais → Taxa média de mercado para essa operação no mês/ano da contratação.">
                <input value={data.taxaMediaMercado} onChange={e => onChange({ taxaMediaMercado: e.target.value })} className={cls.yellow} placeholder="Ex: 1.8" />
              </Field>
            </div>
            <ComparCard
              label="Variação"
              value={variacao ? `${variacao.toFixed(2)}%` : "—"}
              sub={variacao > 20 ? "⚠️ ALERTA: Divergência > 20%" : "vs. média mercado"}
              color={variacao > 20 ? "red" : "green"}
            />
          </div>
        </section>
      )}

      {/* Renegociação */}
      <section className="space-y-2">
        <h3 className="font-heading font-semibold text-foreground">🔄 Opção de Renegociação</h3>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            className={`w-11 h-6 rounded-full relative transition-colors ${data.houveRenegociacao ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
            onClick={() => onChange({ houveRenegociacao: !data.houveRenegociacao })}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${data.houveRenegociacao ? "translate-x-5" : "translate-x-0.5"}`} />
          </div>
          <span className="text-sm text-foreground">Houve renegociação do contrato?</span>
          <span className={`text-xs font-bold ${data.houveRenegociacao ? "text-emerald-600" : "text-muted-foreground"}`}>
            {data.houveRenegociacao ? "SIM" : "NÃO"}
          </span>
        </label>
        {!data.houveRenegociacao && (
          <p className="text-[10px] text-muted-foreground">As abas de renegociação (4 e 5) estão desativadas.</p>
        )}
      </section>
    </div>
  );
}

function ComparCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    purple: "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-700",
    red: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-700",
    green: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-700",
  };
  return (
    <div className={`rounded-lg border p-3 ${colors[color] || colors.purple}`}>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-lg font-bold font-mono text-foreground">{value}</p>
      <p className="text-[9px] text-muted-foreground">{sub}</p>
    </div>
  );
}
