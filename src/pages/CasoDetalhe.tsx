import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Calculator, Building2, Table2, DollarSign, FileText, Check } from "lucide-react";

const etapas = [
  { n: 1, label: "Calculadora", icon: Calculator, color: "bg-[hsl(var(--primary))]" },
  { n: 2, label: "BACEN", icon: Building2, color: "bg-[hsl(var(--info-blue))]" },
  { n: 3, label: "Planilha Revisional", icon: Table2, color: "bg-[hsl(var(--info-orange))]" },
  { n: 4, label: "Valores a Receber", icon: DollarSign, color: "bg-[hsl(var(--success))]" },
  { n: 5, label: "Documentos", icon: FileText, color: "bg-[hsl(var(--info-purple))]" },
];

interface CasoData {
  id: string;
  codigo: string;
  status: string;
  etapa_atual: number;
  contrato: any;
  simulacao: any;
  bacen: any;
  tarifas: any;
  clientes: { nome: string; cpf_cnpj: string | null } | null;
}

export default function CasoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caso, setCaso] = useState<CasoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchCaso = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("casos")
      .select("id, codigo, status, etapa_atual, contrato, simulacao, bacen, tarifas, clientes(nome, cpf_cnpj)")
      .eq("id", id)
      .single();
    if (error || !data) {
      toast.error("Caso não encontrado");
      navigate("/casos");
      return;
    }
    setCaso(data as any);
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => { fetchCaso(); }, [fetchCaso]);

  const saveField = async (field: string, value: any) => {
    if (!caso) return;
    setSaving(true);
    const { error } = await supabase.from("casos").update({ [field]: value }).eq("id", caso.id);
    if (error) toast.error("Erro ao salvar");
    else toast.success("Salvo!");
    setSaving(false);
  };

  const goToStep = async (step: number) => {
    if (!caso) return;
    await supabase.from("casos").update({ etapa_atual: step }).eq("id", caso.id);
    setCaso({ ...caso, etapa_atual: step });
  };

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!caso) return null;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate("/casos")} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground font-mono">{caso.codigo}</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]">{caso.status}</span>
          </div>
          <p className="text-sm text-muted-foreground">{caso.clientes?.nome ?? "Sem cliente"}</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {etapas.map((e, i) => {
          const done = caso.etapa_atual > e.n;
          const active = caso.etapa_atual === e.n;
          return (
            <button
              key={e.n}
              onClick={() => goToStep(e.n)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                active ? `${e.color} text-white shadow-sm` :
                done ? "bg-muted text-foreground" :
                "bg-muted/50 text-muted-foreground"
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                active ? "bg-white/20" : done ? "bg-[hsl(var(--success))]/20" : "bg-muted-foreground/10"
              }`}>
                {done ? <Check className="w-3 h-3" /> : e.n}
              </div>
              <span className="hidden sm:inline">{e.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-card rounded-xl border border-border p-6">
        {caso.etapa_atual === 1 && <Etapa1Calculadora caso={caso} onSave={saveField} saving={saving} />}
        {caso.etapa_atual === 2 && <Etapa2Bacen caso={caso} onSave={saveField} saving={saving} />}
        {caso.etapa_atual === 3 && <Etapa3Planilha caso={caso} onSave={saveField} saving={saving} />}
        {caso.etapa_atual === 4 && <Etapa4Valores caso={caso} />}
        {caso.etapa_atual === 5 && <Etapa5Documentos caso={caso} />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => goToStep(Math.max(1, caso.etapa_atual - 1))}
          disabled={caso.etapa_atual === 1}
          className="px-4 py-2 rounded-lg border border-input bg-background text-foreground text-sm hover:bg-muted transition-colors disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          onClick={() => goToStep(Math.min(5, caso.etapa_atual + 1))}
          disabled={caso.etapa_atual === 5}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          Próxima Etapa
        </button>
      </div>
    </div>
  );
}

// ── Etapa 1: Calculadora Price ──
function Etapa1Calculadora({ caso, onSave, saving }: { caso: CasoData; onSave: (f: string, v: any) => void; saving: boolean }) {
  const c = caso.contrato as any || {};
  const [form, setForm] = useState({
    valorFinanciado: c.valorFinanciado || "",
    taxaMensal: c.taxaMensal || "",
    prazoMeses: c.prazoMeses || "",
    parcela: c.parcela || "",
    instituicao: c.instituicao || "",
    dataContrato: c.dataContrato || "",
  });

  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  // Simple PMT calculation
  const calcPMT = () => {
    const pv = parseFloat(form.valorFinanciado);
    const r = parseFloat(form.taxaMensal) / 100;
    const n = parseInt(form.prazoMeses);
    if (!pv || !r || !n) return "";
    const pmt = pv * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return pmt.toFixed(2);
  };

  const calculatedPMT = calcPMT();

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-[hsl(50,100%,90%)] text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const resultClass = "w-full px-3 py-2 rounded-lg border border-input bg-[hsl(142,50%,90%)] text-foreground text-sm font-medium";

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Etapa 1 — Calculadora Price</h2>
      <p className="text-sm text-muted-foreground">Insira os dados do contrato para calcular a prestação pelo Sistema Price (PMT).</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Instituição Financeira</label>
          <input value={form.instituicao} onChange={(e) => set("instituicao", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Data do Contrato</label>
          <input type="date" value={form.dataContrato} onChange={(e) => set("dataContrato", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Valor Financiado (R$)</label>
          <input type="number" step="0.01" value={form.valorFinanciado} onChange={(e) => set("valorFinanciado", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Taxa Mensal (%)</label>
          <input type="number" step="0.01" value={form.taxaMensal} onChange={(e) => set("taxaMensal", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Prazo (meses)</label>
          <input type="number" value={form.prazoMeses} onChange={(e) => set("prazoMeses", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Parcela Contratada (R$)</label>
          <input type="number" step="0.01" value={form.parcela} onChange={(e) => set("parcela", e.target.value)} className={inputClass} />
        </div>
      </div>

      {calculatedPMT && (
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Parcela Calculada (PMT)</label>
          <input readOnly value={`R$ ${calculatedPMT}`} className={resultClass} />
          {form.parcela && Math.abs(parseFloat(form.parcela) - parseFloat(calculatedPMT)) > 0.5 && (
            <p className="text-xs text-destructive mt-1 font-medium">
              ⚠ Diferença detectada: R$ {(parseFloat(form.parcela) - parseFloat(calculatedPMT)).toFixed(2)}
            </p>
          )}
        </div>
      )}

      <button
        onClick={() => onSave("contrato", form)}
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar Dados do Contrato"}
      </button>
    </div>
  );
}

// ── Etapa 2: BACEN ──
function Etapa2Bacen({ caso, onSave, saving }: { caso: CasoData; onSave: (f: string, v: any) => void; saving: boolean }) {
  const b = caso.bacen as any || {};
  const [taxaSelic, setTaxaSelic] = useState(b.taxaSelic || "");
  const [taxaCDI, setTaxaCDI] = useState(b.taxaCDI || "");
  const [taxaMedia, setTaxaMedia] = useState(b.taxaMedia || "");
  const [observacoes, setObservacoes] = useState(b.observacoes || "");

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-[hsl(50,100%,90%)] text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Etapa 2 — Consulta BACEN (SGS)</h2>
      <p className="text-sm text-muted-foreground">Registre as taxas de referência do Banco Central para comparação.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Taxa SELIC (%)</label>
          <input type="number" step="0.01" value={taxaSelic} onChange={(e) => setTaxaSelic(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Taxa CDI (%)</label>
          <input type="number" step="0.01" value={taxaCDI} onChange={(e) => setTaxaCDI(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Taxa Média Modalidade (%)</label>
          <input type="number" step="0.01" value={taxaMedia} onChange={(e) => setTaxaMedia(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-foreground block mb-1">Observações</label>
        <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className={inputClass + " min-h-[80px]"} />
      </div>

      <button
        onClick={() => onSave("bacen", { taxaSelic, taxaCDI, taxaMedia, observacoes })}
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar Dados BACEN"}
      </button>
    </div>
  );
}

// ── Etapa 3: Planilha Revisional ──
function Etapa3Planilha({ caso, onSave, saving }: { caso: CasoData; onSave: (f: string, v: any) => void; saving: boolean }) {
  const c = caso.contrato as any || {};
  const tarifas = Array.isArray(caso.tarifas) ? caso.tarifas as any[] : [];
  const [novaTarifa, setNovaTarifa] = useState({ descricao: "", valor: "", tipo: "abusiva" });

  const pv = parseFloat(c.valorFinanciado) || 0;
  const r = parseFloat(c.taxaMensal) / 100 || 0;
  const n = parseInt(c.prazoMeses) || 0;

  // Generate amortization table
  const tabela = [];
  let saldo = pv;
  if (pv && r && n) {
    const pmt = pv * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    for (let i = 1; i <= Math.min(n, 12); i++) {
      const juros = saldo * r;
      const amort = pmt - juros;
      saldo -= amort;
      tabela.push({ mes: i, pmt: pmt.toFixed(2), juros: juros.toFixed(2), amort: amort.toFixed(2), saldo: Math.max(0, saldo).toFixed(2) });
    }
  }

  const addTarifa = async () => {
    if (!novaTarifa.descricao || !novaTarifa.valor) return;
    const updated = [...tarifas, { ...novaTarifa, id: Date.now().toString() }];
    await onSave("tarifas", updated);
    setNovaTarifa({ descricao: "", valor: "", tipo: "abusiva" });
  };

  const removeTarifa = async (idx: number) => {
    const updated = tarifas.filter((_, i) => i !== idx);
    await onSave("tarifas", updated);
  };

  const totalTarifas = tarifas.reduce((sum: number, t: any) => sum + (parseFloat(t.valor) || 0), 0);

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-[hsl(50,100%,90%)] text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Etapa 3 — Planilha Revisional</h2>

      {/* Amortization table */}
      {tabela.length > 0 && (
        <details open>
          <summary className="text-sm font-medium text-foreground cursor-pointer mb-2">📊 Projeção do Saldo Devedor (primeiros 12 meses)</summary>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-[hsl(var(--info-orange))]/10">
                  <th className="px-3 py-2 text-left font-medium text-foreground">Mês</th>
                  <th className="px-3 py-2 text-right font-medium text-foreground">Prestação</th>
                  <th className="px-3 py-2 text-right font-medium text-foreground">Juros</th>
                  <th className="px-3 py-2 text-right font-medium text-foreground">Amortização</th>
                  <th className="px-3 py-2 text-right font-medium text-foreground">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {tabela.map((row) => (
                  <tr key={row.mes} className="border-b border-border/50">
                    <td className="px-3 py-1.5">{row.mes}</td>
                    <td className="px-3 py-1.5 text-right font-mono">R$ {row.pmt}</td>
                    <td className="px-3 py-1.5 text-right font-mono">R$ {row.juros}</td>
                    <td className="px-3 py-1.5 text-right font-mono">R$ {row.amort}</td>
                    <td className="px-3 py-1.5 text-right font-mono">R$ {row.saldo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Tarifas abusivas */}
      <details open>
        <summary className="text-sm font-medium text-foreground cursor-pointer mb-2">🚩 Taxas e Tarifas Abusivas/Irregulares</summary>
        <div className="space-y-3">
          {tarifas.map((t: any, i: number) => (
            <div key={i} className="flex items-center gap-3 bg-destructive/5 rounded-lg px-3 py-2">
              <span className="flex-1 text-sm text-foreground">{t.descricao}</span>
              <span className="text-sm font-mono font-medium text-destructive">R$ {parseFloat(t.valor).toFixed(2)}</span>
              <button onClick={() => removeTarifa(i)} className="text-xs text-destructive hover:underline">Remover</button>
            </div>
          ))}
          {totalTarifas > 0 && (
            <p className="text-sm font-medium text-foreground">Total irregular: <span className="text-destructive font-mono">R$ {totalTarifas.toFixed(2)}</span></p>
          )}
          <div className="flex gap-2">
            <input placeholder="Descrição da tarifa" value={novaTarifa.descricao} onChange={(e) => setNovaTarifa({ ...novaTarifa, descricao: e.target.value })} className={inputClass + " flex-1"} />
            <input placeholder="Valor" type="number" step="0.01" value={novaTarifa.valor} onChange={(e) => setNovaTarifa({ ...novaTarifa, valor: e.target.value })} className={inputClass + " w-32"} />
            <button onClick={addTarifa} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90">Adicionar</button>
          </div>
        </div>
      </details>
    </div>
  );
}

// ── Etapa 4: Valores a Receber ──
function Etapa4Valores({ caso }: { caso: CasoData }) {
  const c = caso.contrato as any || {};
  const tarifas = Array.isArray(caso.tarifas) ? caso.tarifas as any[] : [];
  const b = caso.bacen as any || {};

  const pv = parseFloat(c.valorFinanciado) || 0;
  const r = parseFloat(c.taxaMensal) / 100 || 0;
  const rRef = parseFloat(b.taxaMedia) / 100 || r;
  const n = parseInt(c.prazoMeses) || 0;
  const totalTarifas = tarifas.reduce((sum: number, t: any) => sum + (parseFloat(t.valor) || 0), 0);

  let totalContratado = 0;
  let totalRevisado = 0;
  if (pv && r && n) {
    const pmtOrig = pv * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    totalContratado = pmtOrig * n;
    if (rRef > 0) {
      const pmtRef = pv * (rRef * Math.pow(1 + rRef, n)) / (Math.pow(1 + rRef, n) - 1);
      totalRevisado = pmtRef * n;
    }
  }

  const diferencaJuros = totalContratado - totalRevisado;
  const totalRecuperar = diferencaJuros + totalTarifas;

  const resultClass = "w-full px-3 py-2 rounded-lg border border-input bg-[hsl(142,50%,90%)] text-foreground text-sm font-medium font-mono";

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Etapa 4 — Valores a Receber</h2>
      <p className="text-sm text-muted-foreground">Resumo dos valores que o cliente tem direito a receber com base na análise.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Total Pago (contratado)</label>
          <input readOnly value={`R$ ${totalContratado.toFixed(2)}`} className={resultClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Total Devido (taxa revisada)</label>
          <input readOnly value={`R$ ${totalRevisado.toFixed(2)}`} className={resultClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Diferença de Juros</label>
          <input readOnly value={`R$ ${diferencaJuros.toFixed(2)}`} className={resultClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Tarifas Irregulares</label>
          <input readOnly value={`R$ ${totalTarifas.toFixed(2)}`} className={resultClass} />
        </div>
      </div>

      <div className="bg-[hsl(var(--success))]/10 rounded-xl p-6 text-center">
        <p className="text-sm font-medium text-foreground mb-1">Total a Recuperar</p>
        <p className="text-3xl font-bold text-[hsl(var(--success))] font-mono">R$ {totalRecuperar.toFixed(2)}</p>
      </div>
    </div>
  );
}

// ── Etapa 5: Documentos ──
function Etapa5Documentos({ caso }: { caso: CasoData }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("documentos_caso").select("id, titulo, tipo, criado_em").eq("caso_id", caso.id).order("criado_em", { ascending: false })
      .then(({ data }) => { setDocs(data ?? []); setLoading(false); });
  }, [caso.id]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Etapa 5 — Documentos e Petições</h2>
      <p className="text-sm text-muted-foreground">Geração e gestão de documentos vinculados ao caso.</p>

      {loading ? <p className="text-muted-foreground">Carregando...</p> : docs.length === 0 ? (
        <div className="bg-muted/30 rounded-xl p-8 text-center">
          <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum documento gerado ainda</p>
          <p className="text-xs text-muted-foreground mt-1">Use os templates para gerar petições e contratos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-3 bg-muted/30 rounded-lg px-4 py-3">
              <FileText className="w-4 h-4 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{d.titulo}</p>
                <p className="text-xs text-muted-foreground">{d.tipo} · {new Date(d.criado_em).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
