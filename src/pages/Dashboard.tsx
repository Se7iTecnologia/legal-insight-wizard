import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Briefcase, Users, FileText, TrendingUp, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ casos: 0, clientes: 0, documentos: 0 });
  const [recentCasos, setRecentCasos] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchStats() {
      const [casosRes, clientesRes, docsRes, casosData] = await Promise.all([
        supabase.from("casos").select("id", { count: "exact", head: true }),
        supabase.from("clientes").select("id", { count: "exact", head: true }),
        supabase.from("documentos_caso").select("id", { count: "exact", head: true }),
        supabase.from("casos").select("id, codigo, status, etapa_atual, criado_em, clientes(nome)").order("criado_em", { ascending: false }).limit(5),
      ]);
      setStats({
        casos: casosRes.count ?? 0,
        clientes: clientesRes.count ?? 0,
        documentos: docsRes.count ?? 0,
      });
      setRecentCasos((casosData.data as any) ?? []);

      // Status chart data
      const allCasos = await supabase.from("casos").select("status");
      const counts: Record<string, number> = {};
      (allCasos.data ?? []).forEach((c: any) => { counts[c.status] = (counts[c.status] || 0) + 1; });
      setStatusData(Object.entries(counts).map(([name, value]) => ({ name, value })));
    }
    fetchStats();
  }, []);

  const cards = [
    { label: "Casos Ativos", value: stats.casos, icon: Briefcase, color: "text-primary", bg: "bg-primary/10" },
    { label: "Clientes", value: stats.clientes, icon: Users, color: "text-success", bg: "bg-success/10" },
    { label: "Documentos", value: stats.documentos, icon: FileText, color: "text-info-blue", bg: "bg-info-blue/10" },
  ];

  const PIE_COLORS = ["hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--primary))", "hsl(var(--muted-foreground))"];
  const etapaLabel = (n: number) => ({ 1: "Calculadora", 2: "BACEN", 3: "Planilha", 4: "Valores", 5: "Documentos" }[n] || `Etapa ${n}`);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Bem-vindo de volta!</p>
        </div>
        <button onClick={() => navigate("/casos")} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-warning text-white text-sm font-medium hover:bg-warning/90 transition-colors">
          <Plus className="w-4 h-4" /> Nova Análise
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold font-mono text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent cases */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">Casos Recentes</h3>
          {recentCasos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum caso cadastrado</p>
          ) : (
            <div className="space-y-2">
              {recentCasos.map((c: any) => (
                <button key={c.id} onClick={() => navigate(`/casos/${c.id}`)} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
                  <div>
                    <p className="text-sm font-medium text-foreground">{(c.clientes as any)?.nome ?? "—"}</p>
                    <p className="text-xs text-muted-foreground font-mono">{c.codigo} · {etapaLabel(c.etapa_atual)}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === "ativo" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                    {c.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status chart */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">Distribuição por Status</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados</p>
          )}
        </div>
      </div>
    </div>
  );
}
