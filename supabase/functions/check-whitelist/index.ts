// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface CheckWhitelistPayload {
  ipAddress?: string;
  deviceFingerprint?: string;
  userId?: string;
}

/**
 * Edge Function dedicada para verificar whitelist
 * Retorna se o usuário/dispositivo/IP está na whitelist de segurança
 */
serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: CheckWhitelistPayload = await req.json();
    const { ipAddress, deviceFingerprint, userId } = payload;

    // Também obter IP do header se não fornecido
    const clientIP = ipAddress || 
                     req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     null;

    console.log(`[check-whitelist] Checking whitelist for IP: ${clientIP?.substring(0, 10) || 'N/A'}, Device: ${deviceFingerprint?.substring(0, 10) || 'N/A'}, User: ${userId || 'N/A'}`);

    // ✅ Verificar por IP
    if (clientIP) {
      const { data: ipWhitelist } = await supabase
        .from('security_whitelist')
        .select('*')
        .eq('ip_address', clientIP)
        .eq('is_active', true)
        .maybeSingle();

      if (ipWhitelist) {
        // Verificar expiração
        if (!ipWhitelist.expires_at || new Date(ipWhitelist.expires_at) > new Date()) {
          console.log(`[check-whitelist] ✅ IP found in whitelist: ${clientIP}`);
          return new Response(
            JSON.stringify({
              isWhitelisted: true,
              reason: ipWhitelist.reason || ipWhitelist.description,
              whitelistType: 'ip',
              userName: ipWhitelist.user_name,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        }
      }
    }

    // ✅ Verificar por dispositivo
    if (deviceFingerprint) {
      const { data: deviceWhitelist } = await supabase
        .from('security_whitelist')
        .select('*')
        .eq('device_fingerprint', deviceFingerprint)
        .eq('is_active', true)
        .maybeSingle();

      if (deviceWhitelist) {
        if (!deviceWhitelist.expires_at || new Date(deviceWhitelist.expires_at) > new Date()) {
          console.log(`[check-whitelist] ✅ Device found in whitelist`);
          return new Response(
            JSON.stringify({
              isWhitelisted: true,
              reason: deviceWhitelist.reason || deviceWhitelist.description,
              whitelistType: 'device',
              userName: deviceWhitelist.user_name,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        }
      }
    }

    // ✅ Verificar por usuário
    if (userId) {
      const { data: userWhitelist } = await supabase
        .from('security_whitelist')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (userWhitelist) {
        if (!userWhitelist.expires_at || new Date(userWhitelist.expires_at) > new Date()) {
          console.log(`[check-whitelist] ✅ User found in whitelist: ${userId}`);
          return new Response(
            JSON.stringify({
              isWhitelisted: true,
              reason: userWhitelist.reason || userWhitelist.description,
              whitelistType: 'user',
              userName: userWhitelist.user_name,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        }
      }
    }

    // Não está na whitelist
    console.log(`[check-whitelist] ❌ Not in whitelist`);
    return new Response(
      JSON.stringify({ isWhitelisted: false }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[check-whitelist] Error:", error);
    return new Response(
      JSON.stringify({
        isWhitelisted: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }
});
