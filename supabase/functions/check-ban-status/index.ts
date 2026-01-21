// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface CheckBanPayload {
  deviceFingerprint: string;
  userEmail?: string;
  userId?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP from headers
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     null;
    
    // Verificar origin para domínios de desenvolvimento - consultar do banco
    const origin = req.headers.get('origin') || req.headers.get('referer') || '';
    
    // Buscar domínios whitelist do app_config
    const { data: whitelistConfig } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'security.whitelisted_domains')
      .single();
    
    let whitelistedDomains: string[] = ['localhost', 'lovable.app', 'lovableproject.com', 'gptengineer.run', 'webcontainer.io'];
    if (whitelistConfig?.value) {
      try {
        whitelistedDomains = typeof whitelistConfig.value === 'string' 
          ? JSON.parse(whitelistConfig.value) 
          : whitelistConfig.value;
      } catch {
        // Usar padrão se falhar parse
      }
    }
    
    // Verificar se origin está na whitelist de domínios de desenvolvimento
    const isDevDomain = whitelistedDomains.some(domain => origin.includes(domain));
    if (isDevDomain) {
      console.log('[WHITELIST] Request from whitelisted dev domain:', origin);
      return new Response(
        JSON.stringify({ 
          isBanned: false, 
          whitelisted: true,
          message: 'Development/preview environment - whitelist active'
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const payload: CheckBanPayload = await req.json();
    const { deviceFingerprint, userEmail, userId } = payload;

    console.log(`Checking ban status for fingerprint: ${deviceFingerprint?.substring(0, 16)}...`);
    if (userId) {
      console.log(`  User ID provided: ${userId}`);
    }

    // ✅ VERIFICAÇÃO #1: IP na security_whitelist
    if (clientIP) {
      const { data: whitelistEntry } = await supabase
        .from("security_whitelist")
        .select("*")
        .eq("ip_address", clientIP)
        .eq("is_active", true)
        .maybeSingle();
      
      if (whitelistEntry) {
        // Check if not expired
        if (!whitelistEntry.expires_at || new Date(whitelistEntry.expires_at) > new Date()) {
          console.log(`✅ IP ${clientIP} is in security whitelist (${whitelistEntry.user_name})`);
          return new Response(
            JSON.stringify({
              isBanned: false,
              whitelisted: true, // ✅ CORRIGIDO: era ipWhitelisted
              whitelistEntry: {
                name: whitelistEntry.user_name,
                description: whitelistEntry.description,
              },
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        }
      }
    }

    // ✅ VERIFICAÇÃO #2: Device fingerprint na security_whitelist
    if (deviceFingerprint) {
      const { data: deviceWhitelistEntry } = await supabase
        .from("security_whitelist")
        .select("*")
        .eq("device_fingerprint", deviceFingerprint)
        .eq("is_active", true)
        .maybeSingle();
      
      if (deviceWhitelistEntry) {
        if (!deviceWhitelistEntry.expires_at || new Date(deviceWhitelistEntry.expires_at) > new Date()) {
          console.log(`✅ Device ${deviceFingerprint.substring(0, 16)} is in security whitelist`);
          return new Response(
            JSON.stringify({
              isBanned: false,
              whitelisted: true,
              whitelistEntry: {
                name: deviceWhitelistEntry.user_name,
                description: deviceWhitelistEntry.description,
              },
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        }
      }
    }

    // ✅ VERIFICAÇÃO #3: User ID na security_whitelist
    if (userId) {
      const { data: userWhitelistEntry } = await supabase
        .from("security_whitelist")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      
      if (userWhitelistEntry) {
        if (!userWhitelistEntry.expires_at || new Date(userWhitelistEntry.expires_at) > new Date()) {
          console.log(`✅ User ${userId} is in security whitelist`);
          return new Response(
            JSON.stringify({
              isBanned: false,
              whitelisted: true,
              whitelistEntry: {
                name: userWhitelistEntry.user_name,
                description: userWhitelistEntry.description,
              },
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        }
      }
    }

    // Check if device is banned
    const { data: bannedDevice, error: deviceError } = await supabase
      .from("banned_devices")
      .select("*")
      .eq("device_fingerprint", deviceFingerprint)
      .is("unbanned_at", null)
      .maybeSingle();

    if (deviceError) {
      console.error("Error checking device ban:", deviceError);
    }

    if (bannedDevice) {
      console.log(`Device is BANNED: ${bannedDevice.ban_reason}`);
      return new Response(
        JSON.stringify({
          isBanned: true,
          reason: bannedDevice.ban_reason,
          bannedAt: bannedDevice.banned_at,
          violationType: bannedDevice.violation_type,
          deviceId: deviceFingerprint.substring(0, 16),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Check by IP as well (secondary check)
    if (clientIP) {
      const { data: bannedByIP } = await supabase
        .from("banned_devices")
        .select("*")
        .eq("ip_address", clientIP)
        .is("unbanned_at", null)
        .maybeSingle();

      if (bannedByIP) {
        console.log(`IP is BANNED: ${bannedByIP.ban_reason}`);
        return new Response(
          JSON.stringify({
            isBanned: true,
            reason: bannedByIP.ban_reason,
            bannedAt: bannedByIP.banned_at,
            violationType: bannedByIP.violation_type,
            deviceId: deviceFingerprint.substring(0, 16),
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    }

    // Check if user email is banned
    if (userEmail) {
      const { data: bannedUser } = await supabase
        .from("user_registrations")
        .select("is_banned, ban_reason, banned_at, ban_type")
        .eq("email", userEmail)
        .eq("is_banned", true)
        .maybeSingle();

      if (bannedUser) {
        console.log(`User is BANNED: ${bannedUser.ban_reason}`);
        return new Response(
          JSON.stringify({
            isBanned: true,
            reason: bannedUser.ban_reason,
            bannedAt: bannedUser.banned_at,
            violationType: bannedUser.ban_type || "user_banned",
            deviceId: deviceFingerprint.substring(0, 16),
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    }

    // Not banned
    return new Response(
      JSON.stringify({
        isBanned: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error checking ban status:", error);
    return new Response(
      JSON.stringify({
        isBanned: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }
});
