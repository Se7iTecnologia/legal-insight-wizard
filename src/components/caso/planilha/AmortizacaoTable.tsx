import { AmortRow, fmtMoney } from "./planilhaCalcs";

interface Props {
  rows: AmortRow[];
  onRowClick?: (idx: number) => void;
  selectedIdx?: number;
  highlightAfter?: number;
  maxHeight?: string;
}

export function AmortizacaoTable({ rows, onRowClick, selectedIdx, highlightAfter, maxHeight = "400px" }: Props) {
  if (!rows.length) return <p className="text-sm text-muted-foreground italic py-4 text-center">Preencha os dados acima para gerar a tabela de amortização.</p>;

  return (
    <div className="overflow-auto border border-border rounded-lg" style={{ maxHeight }}>
      <table className="w-full text-xs border-collapse min-w-[600px]">
        <thead className="sticky top-0 z-10">
          <tr className="bg-muted text-foreground">
            <th className="border-b border-border px-2 py-2 text-left font-semibold w-14">Prazo</th>
            <th className="border-b border-border px-2 py-2 text-left font-semibold w-24">Data</th>
            <th className="border-b border-border px-2 py-2 text-right font-semibold">Amortização</th>
            <th className="border-b border-border px-2 py-2 text-right font-semibold">Juros</th>
            <th className="border-b border-border px-2 py-2 text-right font-semibold">Prestação</th>
            <th className="border-b border-border px-2 py-2 text-right font-semibold">Saldo Devedor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const isSelected = selectedIdx === i;
            const isHighlighted = highlightAfter !== undefined && typeof r.prazo === "number" && r.prazo > highlightAfter;
            const isLabel = !!r.label;
            const isZero = !isLabel && r.saldo <= 0.01 && r.saldo >= -0.01;

            let bg = "";
            if (isSelected) bg = "bg-amber-200/70 dark:bg-amber-800/40";
            else if (isHighlighted) bg = "bg-emerald-50 dark:bg-emerald-950/20";
            else if (isZero) bg = "bg-emerald-100 dark:bg-emerald-900/30";
            else if (isLabel) bg = "bg-muted/40";
            else if (i % 2 === 0) bg = "bg-card";
            else bg = "bg-muted/20";

            return (
              <tr
                key={i}
                className={`${bg} ${onRowClick && !isLabel ? "cursor-pointer hover:bg-accent/60" : ""} transition-colors`}
                onClick={() => !isLabel && onRowClick?.(i)}
              >
                <td className="border-b border-border/50 px-2 py-1 font-medium">{r.label || r.prazo}</td>
                <td className="border-b border-border/50 px-2 py-1 font-mono">{r.data}</td>
                <td className="border-b border-border/50 px-2 py-1 text-right font-mono">{isLabel && r.amortizacao === 0 ? "—" : fmtMoney(r.amortizacao)}</td>
                <td className="border-b border-border/50 px-2 py-1 text-right font-mono">{isLabel && r.juros === 0 ? "—" : fmtMoney(r.juros)}</td>
                <td className="border-b border-border/50 px-2 py-1 text-right font-mono">{isLabel && r.prestacao === 0 ? "—" : fmtMoney(r.prestacao)}</td>
                <td className="border-b border-border/50 px-2 py-1 text-right font-mono font-semibold">{fmtMoney(r.saldo)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
