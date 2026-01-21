// ============================================
// YOUTUBE VIDEOS - Placeholder function
// VERSAO: 1.0.0 | DEPLOY: 2026-01-19
// STATUS: Placeholder - Funcionalidade em desenvolvimento
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: "Funcionalidade em desenvolvimento",
      message: "youtube-videos function placeholder",
    }),
    {
      status: 501,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
