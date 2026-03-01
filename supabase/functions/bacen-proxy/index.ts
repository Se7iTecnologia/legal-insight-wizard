import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Proxy para a API do SGS/BACEN
 * Endpoint: https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados
 * Params: formato=json, dataInicial=DD/MM/YYYY, dataFinal=DD/MM/YYYY
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { codigo, dataInicial, dataFinal } = await req.json();

    if (!codigo) {
      return new Response(
        JSON.stringify({ error: "Código da série é obrigatório" }),
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

    const data = await response.json();

    // Calculate average rate from results
    let media = 0;
    if (Array.isArray(data) && data.length > 0) {
      const values = data.map((d: any) => parseFloat(String(d.valor).replace(",", "."))).filter((v: number) => !isNaN(v));
      media = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
    }

    return new Response(
      JSON.stringify({ dados: data, media, total: Array.isArray(data) ? data.length : 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
