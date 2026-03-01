import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Briefcase, Users, FileText, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ casos: 0, clientes: 0, documentos: 0 });

  useEffect(() => {
    async function fetchStats() {
      const [casosRes, clientesRes, docsRes] = await Promise.all([
        supabase.from("casos").select("id", { count: "exact", head: true }),
        supabase.from("clientes").select("id", { count: "exact", head: true }),
        supabase.from("documentos_caso").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        casos: casosRes.count ?? 0,
        clientes: clientesRes.count ?? 0,
        documentos: docsRes.count ?? 0,
      });
    }
    fetchStats();
  }, []);

  const cards = [
    { label: "Casos Ativos", value: stats.casos, icon: Briefcase, color: "bg-primary/10 text-primary" },
    { label: "Clientes", value: stats.clientes, icon: Users, color: "bg-success/10 text-success" },
    { label: "Documentos", value: stats.documentos, icon: FileText, color: "bg-info-blue/10 text-info-blue" },
    { label: "Taxa Média", value: "—", icon: TrendingUp, color: "bg-info-purple/10 text-info-purple" },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Bem-vindo de volta!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
              <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
