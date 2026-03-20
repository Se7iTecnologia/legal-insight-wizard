import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Briefcase, Users, FileText, Plus, ArrowUpRight,
  ArrowDownRight, TrendingUp, Clock, ChevronRight,
  BarChart3, Activity,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart, CartesianGrid,
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

const etapaLabel = (n: number) =>
  ({ 1: "Calculadora", 2: "BACEN", 3: "Planilha", 4: "Valores", 5: "Documentos" }[n] || `Etapa ${n}`);

const etapaProgress = (n: number) => Math.round((n / 5) * 100);

/* ── sparkline mock (last 7 days trend) ── */
function generateSparkline(total: number): { v: number }[] {
  const base = Math.max(1, Math.floor(total * 0.7));
  return Array.from({ length: 7 }, (_, i) => ({
    v: base + Math.floor(Math.random() * Math.max(1, total * 0.4) * ((i + 1) / 7)),
  }));
}

/* ── skeleton ── */
function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="w-10 h-10 bg-muted rounded-xl" />
      </div>
      <div className="h-8 w-16 bg-muted rounded mb-2" />
      <div className="h-3 w-32 bg-muted rounded" />
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 animate-pulse space-y-4">
      <div className="h-5 w-36 bg-muted rounded" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 bg-muted rounded" />
            <div className="h-3 w-28 bg-muted rounded" />
          </div>
          <div className="h-5 w-14 bg-muted rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ── custom tooltip ── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs text-muted-foreground">
          {p.name}: <span className="font-semibold text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

/* ── main ── */
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ casos: 0, clientes: 0, documentos: 0 });
  const [recentCasos, setRecentCasos] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const [casosRes, clientesRes, docsRes, casosData] = await Promise.all([
        supabase.from("casos").select("id", { count: "exact", head: true }),
        supabase.from("clientes").select("id", { count: "exact", head: true }),
        supabase.from("documentos_caso").select("id", { count: "exact", head: true }),
        supabase
          .from("casos")
          .select("id, codigo, status, etapa_atual, criado_em, clientes(nome)")
          .order("criado_em", { ascending: false })
          .limit(5),
      ]);
      setStats({
        casos: casosRes.count ?? 0,
        clientes: clientesRes.count ?? 0,
        documentos: docsRes.count ?? 0,
      });
      setRecentCasos((casosData.data as any) ?? []);

      const allCasos = await supabase.from("casos").select("status");
      const counts: Record<string, number> = {};
      (allCasos.data ?? []).forEach((c: any) => {
        counts[c.status] = (counts[c.status] || 0) + 1;
      });
      setStatusData(
        Object.entries(counts).map(([name, value]) => ({ name, value }))
      );
      setLoading(false);
    }
    fetchStats();
  }, []);

  const cards = useMemo(
    () => [
      {
        label: "Casos Ativos",
        value: stats.casos,
        icon: Briefcase,
        color: "text-primary",
        bg: "bg-primary/10",
        trend: "+2 esta semana",
        trendUp: true,
        sparkColor: "hsl(var(--primary))",
      },
      {
        label: "Clientes",
        value: stats.clientes,
        icon: Users,
        color: "text-success",
        bg: "bg-success/10",
        trend: "+3 este mês",
        trendUp: true,
        sparkColor: "hsl(var(--success))",
      },
      {
        label: "Documentos",
        value: stats.documentos,
        icon: FileText,
        color: "text-info-blue",
        bg: "bg-info-blue/10",
        trend: "17 gerados",
        trendUp: true,
        sparkColor: "hsl(var(--info-blue))",
      },
    ],
    [stats]
  );

  const PIE_COLORS = [
    "hsl(var(--success))",
    "hsl(var(--warning))",
    "hsl(var(--primary))",
    "hsl(var(--info-purple))",
    "hsl(var(--muted-foreground))",
  ];

  const statusLabels: Record<string, string> = {
    ativo: "Ativo",
    concluido: "Concluído",
    arquivado: "Arquivado",
    pendente: "Pendente",
  };

  const totalCasos = statusData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-8 pb-24 lg:pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {getGreeting()}, {getFirstName(user?.email)}
          </h1>
          <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Aqui está o resumo da sua operação
          </p>
        </div>
        <button
          onClick={() => navigate("/casos")}
          className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-warning text-warning-foreground text-sm font-semibold shadow-md shadow-warning/20 hover:shadow-lg hover:shadow-warning/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Nova Análise
        </button>
      </div>

      {/* ── KPI Cards ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {cards.map((card) => {
            const sparkData = generateSparkline(card.value);
            return (
              <div
                key={card.label}
                className="group bg-card rounded-2xl border border-border p-6 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 cursor-default"
              >
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      {card.label}
                    </span>
                    <p className="text-3xl font-bold text-foreground tabular-nums mt-1">
                      {card.value}
                    </p>
                  </div>
                  <div
                    className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                  >
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>

                {/* Sparkline */}
                <div className="h-10 mt-2 -mx-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData}>
                      <defs>
                        <linearGradient
                          id={`spark-${card.label}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor={card.sparkColor} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={card.sparkColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke={card.sparkColor}
                        strokeWidth={1.5}
                        fill={`url(#spark-${card.label})`}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Trend */}
                <div className="flex items-center gap-1.5 mt-2">
                  {card.trendUp ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-danger" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      card.trendUp ? "text-success" : "text-danger"
                    }`}
                  >
                    {card.trend}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Main grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3">
            <SkeletonList />
          </div>
          <div className="lg:col-span-2">
            <SkeletonList />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* ── Recent Cases (wider) ── */}
          <div className="lg:col-span-3 bg-card rounded-2xl border border-border overflow-hidden">
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
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhum caso cadastrado ainda.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentCasos.map((c: any) => {
                  const nome = (c.clientes as any)?.nome ?? "—";
                  const initials = nome
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w: string) => w[0])
                    .join("")
                    .toUpperCase();
                  const progress = etapaProgress(c.etapa_atual);

                  return (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/casos/${c.id}`)}
                      className="w-full flex items-center gap-4 px-6 py-4 hover:bg-muted/40 transition-colors duration-150 text-left group"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0 group-hover:bg-primary/20 transition-colors">
                        {initials || "?"}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {nome}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground font-mono">
                            {c.codigo}
                          </span>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="text-xs text-muted-foreground">
                            {etapaLabel(c.etapa_atual)}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Status badge */}
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 ${
                          c.status === "ativo"
                            ? "bg-success/10 text-success"
                            : c.status === "concluido"
                            ? "bg-primary/10 text-primary"
                            : "bg-warning/10 text-warning"
                        }`}
                      >
                        {statusLabels[c.status] || c.status}
                      </span>

                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Status Distribution ── */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-5">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Distribuição por Status
            </h3>

            {statusData.length > 0 ? (
              <>
                <div className="flex justify-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {statusData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="space-y-2.5 mt-4">
                  {statusData.map((d, i) => {
                    const pct =
                      totalCasos > 0
                        ? Math.round((d.value / totalCasos) * 100)
                        : 0;
                    return (
                      <div key={d.name} className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-sm shrink-0"
                          style={{
                            backgroundColor:
                              PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                        <span className="text-sm text-foreground flex-1 capitalize">
                          {statusLabels[d.name] || d.name}
                        </span>
                        <span className="text-sm font-semibold text-foreground tabular-nums">
                          {d.value}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Total */}
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-lg font-bold text-foreground tabular-nums">
                    {totalCasos}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Sem dados para exibir
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mobile floating CTA ── */}
      <button
        onClick={() => navigate("/casos")}
        className="sm:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl bg-warning text-warning-foreground shadow-xl shadow-warning/30 flex items-center justify-center hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200"
        aria-label="Nova Análise"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
