import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Users, Plus, Trash2, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";

interface UserItem {
  id: string;
  email: string;
  created_at: string;
  role?: string;
}

export default function Usuarios() {
  const { session } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // New user form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<string>("advogado");
  const [creating, setCreating] = useState(false);

  const callManageUsers = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("manage-users", { body });
    if (error) throw error;
    return data;
  };

  const fetchUsers = async () => {
    try {
      const data = await callManageUsers({ action: "list" });
      setUsers(Array.isArray(data) ? data.map((u: any) => ({ id: u.id, email: u.email, created_at: u.created_at })) : []);
      // Fetch roles
      const { data: rolesData } = await supabase.from("user_roles").select("user_id, role");
      const map: Record<string, string> = {};
      (rolesData ?? []).forEach((r: any) => { map[r.user_id] = r.role; });
      setRoles(map);
    } catch {
      toast.error("Erro ao carregar usuários");
    }
    setLoading(false);
  };

  useEffect(() => {
    // Check admin
    if (session?.user?.id) {
      supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin").single()
        .then(({ data }) => {
          setIsAdmin(!!data);
          if (data) fetchUsers();
          else setLoading(false);
        });
    }
  }, [session]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) { toast.error("Preencha todos os campos"); return; }
    setCreating(true);
    try {
      await callManageUsers({ action: "create", email: newEmail, password: newPassword, role: newRole });
      toast.success("Usuário criado!");
      setFormOpen(false);
      setNewEmail(""); setNewPassword(""); setNewRole("advogado");
      fetchUsers();
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "Tente novamente"));
    }
    setCreating(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await callManageUsers({ action: "delete", userId: deleteId });
      toast.success("Usuário removido!");
      fetchUsers();
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "Tente novamente"));
    }
    setDeleteId(null);
    setDeleting(false);
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await callManageUsers({ action: "update_role", userId, role });
      toast.success("Papel atualizado!");
      setRoles({ ...roles, [userId]: role });
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  if (!isAdmin && !loading) {
    return (
      <div className="animate-fade-in text-center py-20">
        <Shield className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
        <p className="text-muted-foreground">Acesso restrito a administradores.</p>
      </div>
    );
  }

  const roleLabels: Record<string, string> = { admin: "Admin", advogado: "Advogado", operador: "Operador" };
  const roleColors: Record<string, string> = {
    admin: "bg-destructive/10 text-destructive",
    advogado: "bg-primary/10 text-primary",
    operador: "bg-info-teal/10 text-info-teal",
  };
  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground mt-1 text-sm">{users.length} cadastrados</p>
        </div>
        <button onClick={() => setFormOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Novo Usuário
        </button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {users.map((u) => (
              <div key={u.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(u.created_at).toLocaleDateString("pt-BR")}</p>
                    <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[roles[u.id]] || "bg-muted text-muted-foreground"}`}>
                      {roleLabels[roles[u.id]] || "Sem papel"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <select value={roles[u.id] || ""} onChange={(e) => handleRoleChange(u.id, e.target.value)} className="text-xs rounded border border-input px-1 py-1 bg-background">
                      <option value="admin">Admin</option>
                      <option value="advogado">Advogado</option>
                      <option value="operador">Operador</option>
                    </select>
                    <button onClick={() => setDeleteId(u.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Papel</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Criado em</th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <select value={roles[u.id] || ""} onChange={(e) => handleRoleChange(u.id, e.target.value)} className="text-xs rounded-lg border border-input px-2 py-1.5 bg-background text-foreground">
                        <option value="admin">Admin</option>
                        <option value="advogado">Advogado</option>
                        <option value="operador">Operador</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setDeleteId(u.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Create dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Email *</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Senha *</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} required minLength={6} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Papel</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className={inputClass}>
                <option value="admin">Admin</option>
                <option value="advogado">Advogado</option>
                <option value="operador">Operador</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg border border-input bg-background text-foreground text-sm hover:bg-muted">Cancelar</button>
              <button type="submit" disabled={creating} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {creating ? "Criando..." : "Criar"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDelete open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} onConfirm={handleDelete} loading={deleting} description="Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita." />
    </div>
  );
}
