import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ClienteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId?: string | null;
  onSaved: () => void;
}

const emptyForm = {
  nome: "", cpf_cnpj: "", rg: "", email: "", telefone: "",
  endereco: "", cidade: "", uf: "", cep: "",
  estado_civil: "", nacionalidade: "Brasileiro(a)", profissao: "",
  data_nascimento: "", observacoes: "",
};

export function ClienteForm({ open, onOpenChange, clienteId, onSaved }: ClienteFormProps) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clienteId && open) {
      supabase.from("clientes").select("*").eq("id", clienteId).single().then(({ data }) => {
        if (data) setForm({
          nome: data.nome || "", cpf_cnpj: data.cpf_cnpj || "", rg: data.rg || "",
          email: data.email || "", telefone: data.telefone || "", endereco: data.endereco || "",
          cidade: data.cidade || "", uf: data.uf || "", cep: data.cep || "",
          estado_civil: data.estado_civil || "", nacionalidade: data.nacionalidade || "Brasileiro(a)",
          profissao: data.profissao || "", data_nascimento: data.data_nascimento || "",
          observacoes: data.observacoes || "",
        });
      });
    } else if (!clienteId) {
      setForm(emptyForm);
    }
  }, [clienteId, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    setLoading(true);

    const payload = { ...form, data_nascimento: form.data_nascimento || null };

    const { error } = clienteId
      ? await supabase.from("clientes").update(payload).eq("id", clienteId)
      : await supabase.from("clientes").insert(payload);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success(clienteId ? "Cliente atualizado!" : "Cliente cadastrado!");
      onSaved();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{clienteId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-foreground block mb-1">Nome *</label>
              <input name="nome" value={form.nome} onChange={handleChange} className={inputClass} required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">CPF/CNPJ</label>
              <input name="cpf_cnpj" value={form.cpf_cnpj} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">RG</label>
              <input name="rg" value={form.rg} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Telefone</label>
              <input name="telefone" value={form.telefone} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Data de Nascimento</label>
              <input name="data_nascimento" type="date" value={form.data_nascimento} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Estado Civil</label>
              <select name="estado_civil" value={form.estado_civil} onChange={handleChange} className={inputClass}>
                <option value="">Selecione</option>
                <option>Solteiro(a)</option><option>Casado(a)</option><option>Divorciado(a)</option><option>Viúvo(a)</option><option>União Estável</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Nacionalidade</label>
              <input name="nacionalidade" value={form.nacionalidade} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Profissão</label>
              <input name="profissao" value={form.profissao} onChange={handleChange} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-foreground block mb-1">Endereço</label>
              <input name="endereco" value={form.endereco} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Cidade</label>
              <input name="cidade" value={form.cidade} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">UF</label>
              <input name="uf" value={form.uf} onChange={handleChange} className={inputClass} maxLength={2} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">CEP</label>
              <input name="cep" value={form.cep} onChange={handleChange} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-foreground block mb-1">Observações</label>
              <textarea name="observacoes" value={form.observacoes} onChange={handleChange} className={inputClass + " min-h-[80px]"} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-lg border border-input bg-background text-foreground text-sm hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
