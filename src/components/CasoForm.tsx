import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CasoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface ClienteOption { id: string; nome: string; cpf_cnpj: string | null; }

export function CasoForm({ open, onOpenChange, onSaved }: CasoFormProps) {
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from("clientes").select("id, nome, cpf_cnpj").order("nome").then(({ data }) => {
        setClientes(data ?? []);
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) { toast.error("Selecione um cliente"); return; }
    setLoading(true);

    const { error } = await supabase.from("casos").insert({
      cliente_id: clienteId,
      status: "ativo",
      contrato: {},
      simulacao: {},
      bacen: {},
      tarifas: [],
    });

    if (error) {
      toast.error("Erro ao criar caso: " + error.message);
    } else {
      toast.success("Caso criado com sucesso!");
      onSaved();
      onOpenChange(false);
      setClienteId("");
    }
    setLoading(false);
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Caso</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Cliente *</label>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={inputClass} required>
              <option value="">Selecione um cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome} {c.cpf_cnpj ? `(${c.cpf_cnpj})` : ""}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">O código do caso será gerado automaticamente (ex: REV-2026-0001)</p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-lg border border-input bg-background text-foreground text-sm hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading ? "Criando..." : "Criar Caso"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
