import { useState, useMemo } from "react";
import { Search, ExternalLink, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import { BACEN_SERIES, getSeriesByGroup } from "@/lib/bacenSeries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";

interface Props {
  caso: any;
  onSave: (field: string, value: any) => void;
  saving: boolean;
}

export function Etapa2Bacen({ caso, onSave, saving }: Props) {
  const b = (caso.bacen as any) || {};
  const c = (caso.contrato as any) || {};

  const [serieCodigo, setSerieCodigo] = useState(b.serieCodigo || "25471");
  const [dataInicial, setDataInicial] = useState(b.dataInicial || "");
  const [dataFinal, setDataFinal] = useState(b.dataFinal || "");
  const [taxaContratada, setTaxaContratada] = useState(b.taxaContratada || c.taxaMensal || "");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(b.resultado || null);
  const [filterText, setFilterText] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => getSeriesByGroup(), []);
  const selectedSerie = BACEN_SERIES.find(s => String(s.codigo) === String(serieCodigo));

  const toggleGroup = (g: string) => setOpenGroups(prev => ({ ...prev, [g]: !prev[g] }));

  const filteredGroups = useMemo(() => {
    if (!filterText) return groups;
    const filtered: Record<string, typeof BACEN_SERIES> = {};
    for (const [g, series] of Object.entries(groups)) {
      const match = series.filter(s => s.nome.toLowerCase().includes(filterText.toLowerCase()) || String(s.codigo).includes(filterText));
      if (match.length) filtered[g] = match;
    }
    return filtered;
  }, [groups, filterText]);

  const handleConsultar = async () => {
    if (!serieCodigo) { toast.error("Selecione uma série"); return; }
    if (!dataInicial || !dataFinal) { toast.error("Informe as datas"); return; }
    setLoading(true);

    try {
      const di = new Date(dataInicial);
      const df = new Date(dataFinal);
      const diFmt = `${String(di.getDate()).padStart(2, "0")}/${String(di.getMonth() + 1).padStart(2, "0")}/${di.getFullYear()}`;
      const dfFmt = `${String(df.getDate()).padStart(2, "0")}/${String(df.getMonth() + 1).padStart(2, "0")}/${df.getFullYear()}`;

      const { data, error } = await supabase.functions.invoke("bacen-proxy", {
        body: { codigo: serieCodigo, dataInicial: diFmt, dataFinal: dfFmt },
      });

      if (error) throw error;
      setResultado(data);
      toast.success(`Consulta concluída: ${data.total} registros`);
    } catch (err: any) {
      toast.error("Erro na consulta: " + (err.message || "Tente novamente"));
    }
    setLoading(false);
  };

  const mediaBacen = resultado?.media || 0;
  const taxaContr = parseFloat(taxaContratada) || 0;
  const excesso = taxaContr && mediaBacen ? ((taxaContr - mediaBacen) / mediaBacen * 100) : 0;

  const chartData = useMemo(() => {
    if (!resultado?.dados || !Array.isArray(resultado.dados)) return [];
    return resultado.dados.map((d: any) => ({
      data: d.data,
      valor: parseFloat(String(d.valor).replace(",", ".")),
    }));
  }, [resultado]);

  const handleSave = () => {
    onSave("bacen", { serieCodigo, dataInicial, dataFinal, taxaContratada, resultado, mediaBacen: mediaBacen.toFixed(4), excesso: excesso.toFixed(2) });
  };

  const inputClass = "w-full px-3 py-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-info-purple" />
          <h2 className="text-lg font-heading font-semibold text-foreground">Consulta SGS (BACEN)</h2>
        </div>
        <a href="https://www3.bcb.gov.br/sgspub/localizarseries/localizarSeries.do?method=prepararTelaLocalizarSeries" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-primary hover:underline">
          <ExternalLink className="w-4 h-4" /> Buscar no SGS
        </a>
      </div>

      {/* Series catalog */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-foreground">Séries de Taxas de Juros ({BACEN_SERIES.length} séries)</p>
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Filtrar séries..." className="w-full pl-8 pr-3 py-1.5 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
        </div>

        {selectedSerie && (
          <div className="bg-info-blue/5 border border-info-blue/20 rounded-lg px-4 py-2.5 mb-3">
            <p className="text-sm text-foreground">Selecionada: <strong>{selectedSerie.codigo}</strong> — {selectedSerie.nome}</p>
          </div>
        )}

        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {Object.entries(filteredGroups).map(([group, series]) => (
            <div key={group} className="border border-border rounded-lg">
              <button onClick={() => toggleGroup(group)} className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
                <span>{group} ({series.length})</span>
                {openGroups[group] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {openGroups[group] && (
                <div className="px-3 pb-2 space-y-0.5">
                  {series.map(s => (
                    <button key={s.codigo} onClick={() => setSerieCodigo(String(s.codigo))}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${String(s.codigo) === String(serieCodigo) ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"}`}>
                      {s.codigo} — {s.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Query params */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Código da série</label>
          <input value={serieCodigo} onChange={(e) => setSerieCodigo(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Data inicial</label>
          <input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Data final</label>
          <input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Taxa contratada (% a.m.)</label>
          <input value={taxaContratada} onChange={(e) => setTaxaContratada(e.target.value)} className={inputClass} />
        </div>
      </div>

      <button onClick={handleConsultar} disabled={loading}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-info-purple text-white text-sm font-medium hover:bg-info-purple/90 transition-colors disabled:opacity-50">
        <TrendingUp className="w-4 h-4" />
        {loading ? "Consultando..." : "Consultar BACEN"}
      </button>

      {/* Results */}
      {resultado && mediaBacen > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border-2 border-info-blue/30 bg-info-blue/5 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Média BACEN</p>
              <p className="text-2xl font-bold text-warning font-mono">{mediaBacen.toFixed(4)}%</p>
              <p className="text-xs text-muted-foreground">a.m. no período</p>
            </div>
            <div className="rounded-xl border-2 border-info-purple/30 bg-info-purple/5 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Taxa Contratada</p>
              <p className="text-2xl font-bold text-info-purple font-mono">{taxaContr.toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground">a.m.</p>
            </div>
            <div className={`rounded-xl border-2 p-4 text-center ${excesso > 10 ? "border-destructive/30 bg-destructive/5" : "border-warning/30 bg-warning/5"}`}>
              <p className="text-xs text-muted-foreground mb-1">Excesso sobre média</p>
              <p className={`text-2xl font-bold font-mono ${excesso > 10 ? "text-destructive" : "text-warning"}`}>{excesso.toFixed(2)}%</p>
              {excesso > 10 && <p className="text-xs text-destructive">⚠ Atenção</p>}
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-4">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="data" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  {mediaBacen > 0 && <ReferenceLine y={mediaBacen} stroke="hsl(var(--success))" strokeDasharray="5 5" label="Média" />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-lg bg-warning text-white text-sm font-medium hover:bg-warning/90 transition-colors disabled:opacity-50">
          {saving ? "Salvando..." : "💾 Salvar"}
        </button>
      </div>
    </div>
  );
}
