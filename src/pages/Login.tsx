import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Scale } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else navigate("/");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-warning mx-auto flex items-center justify-center mb-4">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-white">Juros Justos</h1>
          <p className="text-sidebar-foreground/60 mt-1">Revisão Bancária</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 shadow-lg">
          <h2 className="font-heading text-xl font-semibold mb-6 text-foreground">Entrar</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg bg-warning text-white font-medium text-sm hover:bg-warning/90 transition-colors disabled:opacity-50">
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-4">Contas são criadas exclusivamente pelo administrador.</p>
        </div>
      </div>
    </div>
  );
}
