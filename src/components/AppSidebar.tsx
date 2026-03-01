import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, Users, Briefcase, FileText, LogOut, Scale, Menu, X, Settings, UserCog, Plus,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/clientes", icon: Users, label: "Clientes" },
  { to: "/casos", icon: Briefcase, label: "Casos" },
  { to: "/templates", icon: FileText, label: "Templates" },
  { to: "/usuarios", icon: UserCog, label: "Usuários" },
];

export function AppSidebar() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning flex items-center justify-center">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-base font-bold text-white">Juros Justos</h1>
            <p className="text-[10px] text-sidebar-foreground/50">Revisão Bancária</p>
          </div>
        </div>
      </div>

      {/* Nova Análise */}
      <div className="px-4 pt-4">
        <button onClick={() => { navigate("/casos"); setMobileOpen(false); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-warning text-white text-sm font-medium hover:bg-warning/90 transition-colors">
          <Plus className="w-4 h-4" /> Nova Análise
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/40 mb-2 truncate">{user?.email}</p>
        <button onClick={signOut}
          className="flex items-center gap-2 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent/50">
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>
    </>
  );

  return (
    <>
      <button onClick={() => setMobileOpen(true)} className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border shadow-sm">
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative h-full w-64 bg-sidebar text-sidebar-foreground flex flex-col">
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 p-1 text-sidebar-foreground/60 hover:text-sidebar-foreground">
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-sidebar text-sidebar-foreground flex-col z-50">
        {sidebarContent}
      </aside>
    </>
  );
}
