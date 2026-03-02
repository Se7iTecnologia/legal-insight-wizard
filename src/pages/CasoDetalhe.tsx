import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { StepperNav } from "@/components/caso/StepperNav";
import { Etapa1Calculadora } from "@/components/caso/Etapa1Calculadora";
import { Etapa2Bacen } from "@/components/caso/Etapa2Bacen";
import { Etapa3Planilha } from "@/components/caso/Etapa3Planilha";
import { Etapa4Valores } from "@/components/caso/Etapa4Valores";
import { Etapa5Documentos } from "@/components/caso/Etapa5Documentos";

export default function CasoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caso, setCaso] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchCaso = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("casos")
      .select("id, codigo, status, etapa_atual, contrato, simulacao, bacen, tarifas, clientes(nome, cpf_cnpj)")
      .eq("id", id)
      .single();
    if (error || !data) { toast.error("Caso não encontrado"); navigate("/casos"); return; }
    setCaso(data);
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => { fetchCaso(); }, [fetchCaso]);

  const saveField = async (field: string, value: any) => {
    if (!caso) return;
    setSaving(true);
    const { error } = await supabase.from("casos").update({ [field]: value }).eq("id", caso.id);
    if (error) toast.error("Erro ao salvar");
    else { setCaso((prev: any) => prev ? { ...prev, [field]: value } : prev); }
    setSaving(false);
  };

  const saveBatch = async (updates: Record<string, any>) => {
    if (!caso) return;
    setSaving(true);
    const { error } = await supabase.from("casos").update(updates).eq("id", caso.id);
    if (error) toast.error("Erro ao salvar");
    else { setCaso((prev: any) => prev ? { ...prev, ...updates } : prev); toast.success("Salvo!"); }
    setSaving(false);
  };

  const goToStep = async (step: number) => {
    if (!caso) return;
    await supabase.from("casos").update({ etapa_atual: step }).eq("id", caso.id);
    setCaso((prev: any) => prev ? { ...prev, etapa_atual: step } : prev);
  };

  const etapaLabels: Record<number, string> = { 1: "Calculadora Price", 2: "Consulta BACEN", 3: "Planilha Revisional", 4: "Valores a Receber", 5: "Documentos" };

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!caso) return null;

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate("/casos")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Casos
        </button>
        <div className="text-center flex-1">
          <h1 className="text-lg sm:text-xl font-heading font-bold text-foreground uppercase">{caso.clientes?.nome ?? "Sem cliente"}</h1>
          <p className="text-xs text-muted-foreground font-mono">{caso.codigo}</p>
          <p className="text-xs text-primary font-medium mt-0.5">Etapa {caso.etapa_atual}/5 — {etapaLabels[caso.etapa_atual]}</p>
        </div>
        <button onClick={() => saveField("status", caso.status)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-warning text-white text-sm font-medium hover:bg-warning/90 transition-colors">
          <Save className="w-4 h-4" /> Salvar
        </button>
      </div>

      {/* Stepper */}
      <StepperNav current={caso.etapa_atual} onStep={goToStep} />

      {/* Content */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-6 mb-6">
        {caso.etapa_atual === 1 && <Etapa1Calculadora caso={caso} onSave={saveField} saving={saving} />}
        {caso.etapa_atual === 2 && <Etapa2Bacen caso={caso} onSave={saveField} saving={saving} />}
        {caso.etapa_atual === 3 && <Etapa3Planilha caso={caso} onSave={saveField} onSaveBatch={saveBatch} saving={saving} />}
        {caso.etapa_atual === 4 && <Etapa4Valores caso={caso} />}
        {caso.etapa_atual === 5 && <Etapa5Documentos caso={caso} />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={() => goToStep(Math.max(1, caso.etapa_atual - 1))} disabled={caso.etapa_atual === 1}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm hover:bg-muted transition-colors disabled:opacity-50">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        {caso.etapa_atual < 5 && (
          <button onClick={() => goToStep(caso.etapa_atual + 1)}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-warning text-white text-sm font-medium hover:bg-warning/90 transition-colors">
            Próximo: {etapaLabels[caso.etapa_atual + 1]} <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
