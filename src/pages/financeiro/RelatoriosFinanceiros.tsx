import { useState } from "react";
import { FileText, FileSpreadsheet, FileDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportPDF, exportExcel, exportCSV } from "@/lib/exports";

type Formato = "pdf" | "excel" | "csv";
type Fonte = "fluxo" | "contratos";

const fmtMoney = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (s: string | null) => s ? new Date(s + "T00:00:00").toLocaleDateString("pt-BR") : "";

export default function RelatoriosFinanceiros() {
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function fetchFluxo() {
    let q = supabase.from("lancamentos" as any).select("*").order("data", { ascending: false });
    if (dataIni) q = q.gte("data", dataIni);
    if (dataFim) q = q.lte("data", dataFim);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map((l: any) => ({
      Data: fmtDate(l.data),
      Tipo: l.tipo === "receita" ? "Receita" : "Despesa",
      Descrição: l.descricao,
      Categoria: l.categoria || "",
      "Forma Pagamento": l.forma_pagamento || "",
      Valor: fmtMoney(Number(l.valor)),
      Observações: l.observacoes || "",
    }));
  }

  async function fetchContratos() {
    const { data, error } = await supabase.from("contratos_financeiros" as any).select("*").order("criado_em", { ascending: false });
    if (error) throw error;
    const list = (data || []) as any[];
    const ids = Array.from(new Set(list.map((c) => c.cliente_id).filter(Boolean)));
    let cliMap: Record<string, string> = {};
    if (ids.length) {
      const { data: cli } = await supabase.from("clientes").select("id, nome").in("id", ids);
      (cli || []).forEach((c: any) => { cliMap[c.id] = c.nome; });
    }
    return list.map((c) => ({
      Descrição: c.descricao,
      Cliente: c.cliente_id ? (cliMap[c.cliente_id] || "—") : "—",
      "Valor Total": fmtMoney(Number(c.valor_total)),
      "Valor Pago": fmtMoney(Number(c.valor_pago)),
      "Saldo Devedor": fmtMoney(Number(c.saldo_devedor)),
      Parcelas: c.numero_parcelas,
      "Data Início": fmtDate(c.data_inicio),
      "1º Vencimento": fmtDate(c.primeiro_vencimento),
      Status: c.status,
    }));
  }

  async function exportar(fonte: Fonte, formato: Formato) {
    const key = `${fonte}-${formato}`;
    setBusy(key);
    try {
      const rows = fonte === "fluxo" ? await fetchFluxo() : await fetchContratos();
      if (!rows.length) { toast.warning("Nenhum dado encontrado"); return; }
      const titulo = fonte === "fluxo" ? "Fluxo de Caixa" : "Contratos Financeiros";
      const filename = `${fonte === "fluxo" ? "fluxo-caixa" : "contratos"}-${new Date().toISOString().slice(0, 10)}`;
      if (formato === "pdf") exportPDF(titulo, rows, filename);
      else if (formato === "excel") exportExcel(rows, filename);
      else exportCSV(rows, filename);
      toast.success("Exportação concluída");
    } catch (e: any) {
      toast.error(e.message || "Erro ao exportar");
    } finally {
      setBusy(null);
    }
  }

  const fontes: { id: Fonte; label: string; desc: string }[] = [
    { id: "fluxo", label: "Fluxo de Caixa", desc: "Receitas e despesas no período selecionado" },
    { id: "contratos", label: "Contratos Financeiros", desc: "Todos os contratos, valores e status" },
  ];

  const formatos: { id: Formato; label: string; icon: any; tone: string }[] = [
    { id: "pdf", label: "PDF", icon: FileText, tone: "text-destructive" },
    { id: "excel", label: "Excel", icon: FileSpreadsheet, tone: "text-success" },
    { id: "csv", label: "CSV", icon: FileDown, tone: "text-foreground" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-bold text-foreground">Relatórios Financeiros</h1>
        <p className="text-sm text-muted-foreground">Exporte fluxo de caixa e contratos em PDF, Excel ou CSV</p>
      </header>

      {/* Filtro de período (aplica ao fluxo) */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-[11px] text-muted-foreground block">Data inicial (Fluxo)</label>
          <input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} className="px-2 py-1.5 rounded-md border border-input bg-background text-sm" />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground block">Data final (Fluxo)</label>
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="px-2 py-1.5 rounded-md border border-input bg-background text-sm" />
        </div>
        {(dataIni || dataFim) && (
          <button onClick={() => { setDataIni(""); setDataFim(""); }} className="text-xs text-muted-foreground hover:text-foreground underline">
            Limpar
          </button>
        )}
        <p className="text-[11px] text-muted-foreground ml-auto">O período aplica-se apenas ao Fluxo de Caixa.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fontes.map((f) => (
          <div key={f.id} className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div>
              <h3 className="font-semibold text-foreground">{f.label}</h3>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {formatos.map((fmt) => {
                const k = `${f.id}-${fmt.id}`;
                const isBusy = busy === k;
                return (
                  <button
                    key={fmt.id}
                    disabled={!!busy}
                    onClick={() => exportar(f.id, fmt.id)}
                    className="flex flex-col items-center gap-1 px-3 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBusy ? (
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    ) : (
                      <fmt.icon className={`w-5 h-5 ${fmt.tone}`} />
                    )}
                    <span className="text-xs font-medium text-foreground">{fmt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
