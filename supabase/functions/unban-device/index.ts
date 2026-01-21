// ============================================
// VERSAO: 1.0.0 | DEPLOY: 2026-01-08
// Edge Function: Remoção de Banimentos
// Usa SERVICE_ROLE_KEY para bypassar RLS
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface UnbanPayload {
  deviceFingerprint?: string;
  unbanAll?: boolean;
  reason?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Apenas POST permitido
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405 }
      );
    }

    // Inicializar Supabase com SERVICE_ROLE_KEY (bypassa RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticação do admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("❌ Requisição sem Authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Verificar token e usuário
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("❌ Token inválido:", authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Token inválido" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Verificar se usuário é admin via user_roles
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "superadmin"])
      .single();

    if (!userRole) {
      console.error("❌ Usuário não é admin:", user.email);
      return new Response(
        JSON.stringify({ success: false, error: "Acesso negado - apenas admins" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Parse payload
    const payload: UnbanPayload = await req.json();
    const { deviceFingerprint, unbanAll, reason } = payload;

    const now = new Date().toISOString();
    let unbannedCount = 0;

    if (unbanAll === true) {
      // Desbanir TODOS os dispositivos ativos
      console.log(`🔓 Admin ${user.email} iniciou UNBAN ALL`);

      const { data, error } = await supabase
        .from("banned_devices")
        .update({
          is_active: false,
          unbanned_at: now,
          unbanned_by: user.id,
        })
        .eq("is_active", true)
        .select("id");

      if (error) {
        console.error("❌ Erro ao desbanir todos:", error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      unbannedCount = data?.length || 0;
      console.log(`✅ ${unbannedCount} dispositivos desbanidos`);

    } else if (deviceFingerprint) {
      // Desbanir dispositivo específico
      console.log(`🔓 Admin ${user.email} desbaniu: ${deviceFingerprint.substring(0, 16)}...`);

      const { data, error } = await supabase
        .from("banned_devices")
        .update({
          is_active: false,
          unbanned_at: now,
          unbanned_by: user.id,
        })
        .eq("device_fingerprint", deviceFingerprint)
        .eq("is_active", true)
        .select("id");

      if (error) {
        console.error("❌ Erro ao desbanir:", error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      unbannedCount = data?.length || 0;

      if (unbannedCount === 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Dispositivo não encontrado ou já desbanido" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Forneça deviceFingerprint ou unbanAll: true" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Registrar no audit log
    await supabase.from("security_audit_log").insert({
      incident_type: unbanAll ? "unban_all" : "unban_device",
      severity: "info",
      device_fingerprint: deviceFingerprint || "ALL",
      action_taken: "unbanned",
      user_id: user.id,
      user_email: user.email,
      violation_details: {
        reason: reason || "Removido manualmente pelo administrador",
        unbanned_count: unbannedCount,
      },
    });

    console.log(`✅ Audit log registrado para ${unbanAll ? "UNBAN ALL" : deviceFingerprint}`);

    return new Response(
      JSON.stringify({
        success: true,
        unbannedCount,
        message: unbanAll 
          ? `${unbannedCount} dispositivos desbanidos`
          : "Dispositivo desbanido com sucesso",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("❌ Erro na função unban-device:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
