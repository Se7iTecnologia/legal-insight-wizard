import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, Users, Briefcase, FileText, LogOut, Scale, Menu, X, UserCog, Plus,
  PanelLeftClose, PanelLeft, Wallet, FileSignature,
} from "lucide-react";
import { useState, createContext, useContext } from "react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/clientes", icon: Users, label: "Clientes" },
  { to: "/casos", icon: Briefcase, label: "Casos" },
  { to: "/financeiro", icon: Wallet, label: "Financeiro" },
  { to: "/financeiro/contratos", icon: FileSignature, label: "Contratos" },
  { to: "/templates", icon: FileText, label: "Templates" },
  { to: "/usuarios", icon: UserCog, label: "Usuários" },
];

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({ collapsed: false, setCollapsed: () => {} });

export function useSidebarState() {
  return useContext(SidebarContext);
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; } catch { return false; }
  });

  const handleSetCollapsed = (v: boolean) => {
    setCollapsed(v);
    try { localStorage.setItem("sidebar-collapsed", String(v)); } catch {}
  };

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed: handleSetCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function AppSidebar() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { collapsed, setCollapsed } = useSidebarState();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (isCollapsed: boolean, onNavClick?: () => void) => (
    <>
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-warning flex items-center justify-center shrink-0">
            <Scale className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="font-heading text-sm font-bold text-white truncate">Juros Justos</h1>
              <p className="text-[10px] text-sidebar-foreground/50">Revisão Bancária</p>
            </div>
          )}
        </div>
      </div>

      {/* Nova Análise */}
      <div className="px-3 pt-3">
        <button
          onClick={() => { navigate("/casos"); onNavClick?.(); }}
          title="Nova Análise"
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-warning text-white text-sm font-medium hover:bg-warning/90 transition-colors ${isCollapsed ? "px-2" : "px-3"}`}
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Nova Análise</span>}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onNavClick}
            title={item.label}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isCollapsed ? "justify-center" : ""
              } ${
                isActive
                  ? "bg-warning/90 text-white shadow-md shadow-warning/20"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground hover:translate-x-0.5"
              }`
            }
          >
            <item.icon className="w-[18px] h-[18px] shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {/* Seção Financeiro */}
        <div className="pt-2 mt-2 border-t border-sidebar-border/50">
          {isCollapsed ? (
            <>
              {financeiroItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/financeiro"}
                  onClick={onNavClick}
                  title={item.label}
                  className={({ isActive }) =>
                    `flex items-center justify-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-warning/90 text-white shadow-md shadow-warning/20"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    }`
                  }
                >
                  <item.icon className="w-[18px] h-[18px] shrink-0" />
                </NavLink>
              ))}
            </>
          ) : (
            <>
              <button
                onClick={() => setFinOpen((v) => !v)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                  isFinanceiroActive ? "text-warning" : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5" />
                  Financeiro
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${finOpen ? "rotate-180" : ""}`} />
              </button>
              {finOpen && (
                <div className="space-y-1 mt-1">
                  {financeiroItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/financeiro"}
                      onClick={onNavClick}
                      title={item.label}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-warning/90 text-white shadow-md shadow-warning/20"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground hover:translate-x-0.5"
                        }`
                      }
                    >
                      <item.icon className="w-[18px] h-[18px] shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-1">
        {!isCollapsed && (
          <p className="text-xs text-sidebar-foreground/40 mb-1 truncate px-1">{user?.email}</p>
        )}
        <button
          onClick={signOut}
          title="Sair"
          className={`flex items-center gap-2 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent/50 ${isCollapsed ? "justify-center" : ""}`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Sair</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-card border border-border shadow-sm"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative h-full w-64 bg-sidebar text-sidebar-foreground flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 p-1 text-sidebar-foreground/60 hover:text-sidebar-foreground z-10"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent(false, () => setMobileOpen(false))}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex-col z-40 transition-[width] duration-200 ${
          collapsed ? "w-[60px]" : "w-60"
        }`}
      >
        {sidebarContent(collapsed)}
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-7 w-6 h-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? (
            <PanelLeft className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <PanelLeftClose className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
      </aside>
    </>
  );
}
