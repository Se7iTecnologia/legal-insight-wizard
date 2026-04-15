import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Briefcase, Users, FileText, Plus, Clock, ChevronRight,
  DollarSign, Search, FileCheck, Gavel, CheckCircle2,
  MapPin, TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid,
} from "recharts";

/* ── helpers ── */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function getFirstName(email?: string): string {
  if (!email) return "";
  const local = email.split("@")[0];
  const name = local.replace(/[._-]/g, " ").split(" ")[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/* ── status derivation from etapa + checklist ── */
type DerivedStatus = "em_analise" | "ja_analisado" | "solicitacao_docs" | "pronto_protocolo" | "fechado";

function deriveStatus(etapa: number, contrato: any): DerivedStatus {
  if (etapa >= 1 && etapa <= 2) return "em_analise";
  if (etapa >= 3 && etapa <= 4) return "ja_analisado";
  if (etapa === 5) {
    // Check if checklist is 100%
    const checklist = contrato?.checklist;
    if (Array.isArray(checklist) && checklist.length > 0) {
      const allDone = checklist.every((item: any) => item.anexado === true);
      if (allDone) return "pronto_protocolo";
    }
    return "solicitacao_docs";
  }
  return "em_analise";
}

const STATUS_CONFIG: Record<DerivedStatus, { label: string; icon: typeof Briefcase; colorClass: string; bgClass: string }> = {
  em_analise:       { label: "Em Análise",             icon: Search,       colorClass: "text-info-blue",   bgClass: "bg-info-blue/10" },
  ja_analisado:     { label: "Já Analisados",          icon: FileCheck,    colorClass: "text-info-purple", bgClass: "bg-info-purple/10" },
  solicitacao_docs: { label: "Solicitação de Docs",    icon: FileText,     colorClass: "text-warning",     bgClass: "bg-warning/10" },
  pronto_protocolo: { label: "Prontos p/ Protocolo",   icon: Gavel,        colorClass: "text-success",     bgClass: "bg-success/10" },
  fechado:          { label: "Fechados",                icon: DollarSign,   colorClass: "text-success",     bgClass: "bg-success/10" },
};

const STATUS_ORDER: DerivedStatus[] = ["em_analise", "ja_analisado", "fechado", "solicitacao_docs", "pronto_protocolo"];

/* ── custom tooltip ── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">
        Casos: <span className="font-bold text-foreground">{payload[0].value}</span>
      </p>
    </div>
  );
}

/* ── skeleton ── */
function SkeletonCards() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse">
          <div className="w-10 h-10 bg-muted rounded-xl mb-3" />
          <div className="h-7 w-12 bg-muted rounded mb-1" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 animate-pulse">
      <div className="h-5 w-48 bg-muted rounded mb-6" />
      <div className="h-64 bg-muted rounded-xl" />
    </div>
  );
}

/* ── main ── */
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [casos, setCasos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("casos")
        .select("id, codigo, status, etapa_atual, contrato, criado_em, clientes(nome, cidade)");
      setCasos(data ?? []);
      setLoading(false);
    }
    fetch();
  }, []);

  /* ── derived metrics ── */
  const statusCounts = useMemo(() => {
    const counts: Record<DerivedStatus, number> = {
      em_analise: 0, ja_analisado: 0, solicitacao_docs: 0, pronto_protocolo: 0, fechado: 0,
    };
    casos.forEach((c) => {
      if (c.status === "concluido" || c.status === "arquivado") {
        counts.fechado++;
      } else {
        const s = deriveStatus(c.etapa_atual, c.contrato);
        counts[s]++;
      }
    });
    return counts;
  }, [casos]);

  const totalCasos = casos.length;

  /* ── top 10 cidades ── */
  const topCidades = useMemo(() => {
    const map: Record<string, number> = {};
    casos.forEach((c) => {
      const cidade = (c.clientes as any)?.cidade;
      if (cidade) map[cidade] = (map[cidade] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [casos]);

  /* ── recent cases ── */
  const recentCasos = useMemo(
    () => [...casos].sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()).slice(0, 6),
    [casos]
  );

  const BAR_COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--info-blue))",
    "hsl(var(--info-purple))",
    "hsl(var(--success))",
    "hsl(var(--warning))",
    "hsl(var(--info-teal))",
    "hsl(var(--info-orange))",
    "hsl(var(--primary))",
    "hsl(var(--info-blue))",
    "hsl(var(--info-purple))",
  ];

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {getGreeting()}, {getFirstName(user?.email)}
          </h1>
          <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Painel de controle da operação
          </p>
        </div>
        <button
          onClick={() => navigate("/casos")}
          className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Nova Análise
        </button>
      </div>

      {/* ── Status Cards ── */}
      {loading ? (
        <SkeletonCards />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {STATUS_ORDER.map((key) => {
            const cfg = STATUS_CONFIG[key];
            const count = statusCounts[key];
            const Icon = cfg.icon;
            const pct = totalCasos > 0 ? Math.round((count / totalCasos) * 100) : 0;

            return (
              <div
                key={key}
                className="group bg-card rounded-2xl border border-border p-5 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 cursor-default"
              >
                <div className={`w-11 h-11 rounded-xl ${cfg.bgClass} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-5 h-5 ${cfg.colorClass}`} />
                </div>
                <p className="text-3xl font-bold text-foreground tabular-nums">{count}</p>
                <p className="text-xs font-medium text-muted-foreground mt-1">{cfg.label}</p>
                <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${cfg.bgClass.replace('/10', '')}`}
                    style={{ width: `${pct}%`, backgroundColor: undefined }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">{pct}% do total</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ── Top 10 Cidades ── */}
        <div className="lg:col-span-3 bg-card rounded-2xl border border-border p-6">
          {loading ? (
            <SkeletonChart />
          ) : (
            <>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  Top 10 Cidades por Casos
                </h3>
                <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
                  {topCidades.length} cidades
                </span>
              </div>

              {topCidades.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={topCidades} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={120}
                      tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
                      {topCidades.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MapPin className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma cidade cadastrada nos casos</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Cadastre clientes com cidade para ver o ranking</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Casos Recentes ── */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Casos Recentes
            </h3>
            <button
              onClick={() => navigate("/casos")}
              className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors"
            >
              Ver todos
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentCasos.length === 0 ? (
            <div className="px-6 pb-6">
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum caso cadastrado.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentCasos.map((c: any) => {
                const nome = (c.clientes as any)?.nome ?? "—";
                const initials = nome.split(" ").filter(Boolean).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
                const derived = c.status === "concluido" || c.status === "arquivado"
                  ? "fechado" as DerivedStatus
                  : deriveStatus(c.etapa_atual, c.contrato);
                const cfg = STATUS_CONFIG[derived];

                return (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/casos/${c.id}`)}
                    className="w-full flex items-center gap-3 px-6 py-3.5 hover:bg-muted/40 transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {initials || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{nome}</p>
                      <span className="text-xs text-muted-foreground font-mono">{c.codigo}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold shrink-0 ${cfg.bgClass} ${cfg.colorClass}`}>
                      {cfg.label}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Resumo geral ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total de Casos", value: totalCasos, icon: Briefcase, color: "text-primary", bg: "bg-primary/10" },
          { label: "Clientes", value: new Set(casos.map(c => (c.clientes as any)?.nome).filter(Boolean)).size, icon: Users, color: "text-info-teal", bg: "bg-info-teal/10" },
          { label: "Taxa de Conclusão", value: totalCasos > 0 ? `${Math.round((statusCounts.pronto_protocolo / totalCasos) * 100)}%` : "0%", icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
          { label: "Cidades Atendidas", value: new Set(casos.map(c => (c.clientes as any)?.cidade).filter(Boolean)).size, icon: MapPin, color: "text-info-orange", bg: "bg-info-orange/10" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground tabular-nums">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Mobile CTA ── */}
      <button
        onClick={() => navigate("/casos")}
        className="sm:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200"
        aria-label="Nova Análise"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
