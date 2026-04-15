import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !data?.claims) {
      return new Response(
        JSON.stringify({ error: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { codigo, dataInicial, dataFinal } = await req.json();

    if (!codigo) {
      return new Response(
        JSON.stringify({ error: "Código da série é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate codigo is a number to prevent SSRF
    if (!/^\d+$/.test(String(codigo))) {
      return new Response(
        JSON.stringify({ error: "Código da série inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const params = new URLSearchParams({ formato: "json" });
    if (dataInicial) params.set("dataInicial", dataInicial);
    if (dataFinal) params.set("dataFinal", dataFinal);

    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados?${params}`;
    
    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Erro ao consultar BACEN: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const responseData = await response.json();

    let media = 0;
    if (Array.isArray(responseData) && responseData.length > 0) {
      const values = responseData.map((d: any) => parseFloat(String(d.valor).replace(",", "."))).filter((v: number) => !isNaN(v));
      media = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
    }

    return new Response(
      JSON.stringify({ dados: responseData, media, total: Array.isArray(responseData) ? responseData.length : 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
