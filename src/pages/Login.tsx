import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Scale, Mail, Lock, Eye, EyeOff } from "lucide-react";
import setiLogo from "@/assets/seti-logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  const features = ["Casos", "Documentos", "Cálculos", "Clientes", "BACEN"];

  return (
    <div className="min-h-screen flex">
      {/* Left - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-background">
        <div className="max-w-md w-full mx-auto">
          {/* Logo */}
          <div className="mb-10">
            <div className="w-14 h-14 rounded-xl bg-warning flex items-center justify-center mb-3">
              <Scale className="w-7 h-7 text-white" />
            </div>
            <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
              Juros Justos
            </p>
          </div>

          {/* Header */}
          <h1 className="font-heading text-2xl font-bold text-foreground mb-1">
            Bem-vindo de volta
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            Acesse sua conta para continuar
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase block mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-11 pr-4 py-3 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase block mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-warning text-white font-semibold text-sm hover:bg-warning/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border flex flex-col items-center gap-2 text-[11px] text-muted-foreground">
            <p>© {new Date().getFullYear()} Juros Justos. Todos os direitos reservados.</p>
            <a
              href="https://se7itecnologia.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-foreground transition-colors group"
            >
              <span>
                Desenvolvido por{" "}
                <span className="font-semibold text-foreground group-hover:underline">
                  Seti Tecnologia LTDA
                </span>{" "}
                · CNPJ: 19.617.014/0001-87
              </span>
              <img src={setiLogo} alt="Seti Tecnologia" className="h-5 w-auto opacity-80 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>
        </div>
      </div>

      {/* Right - Branded Panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-sidebar via-primary to-sidebar items-end justify-center p-16 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-20 right-20 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute top-40 left-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute bottom-40 right-40 w-32 h-32 rounded-full bg-white/5" />

        <div className="relative z-10 max-w-lg">
          <h2 className="font-heading text-4xl font-bold text-white leading-tight mb-2">
            Revisão Bancária
            <br />
            <span className="text-warning">Inteligente</span>
          </h2>
          <p className="text-white/70 text-base mt-4 leading-relaxed">
            Uma plataforma moderna para otimizar, padronizar e modernizar a análise de contratos bancários do seu escritório.
          </p>

          <div className="flex flex-wrap gap-2 mt-8">
            {features.map((f) => (
              <span
                key={f}
                className="px-4 py-1.5 rounded-full border border-white/20 text-white/90 text-xs font-medium backdrop-blur-sm"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
