import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic } = await req.json();

    if (!topic) {
      throw new Error("Topic é obrigatório");
    }

    console.log("Buscando script para topic:", topic);

    const supabase = getSupabaseAdmin();

    const { data: script, error } = await supabase
      .from("presentation_scripts")
      .select("title, audio_script, icon, duration_seconds, description")
      .eq("topic", topic)
      .eq("is_active", true)
      .single();

    if (error) {
      console.error("Erro ao buscar script:", error);
      throw new Error(`Script não encontrado para topic: ${topic}`);
    }

    console.log("Script encontrado:", script.title);

    return new Response(
      JSON.stringify({
        success: true,
        data: script,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro:", errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
