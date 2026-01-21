// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// Domínios na whitelist (desenvolvimento/preview)
const WHITELISTED_DOMAINS = [
  'localhost',
  'lovable.app',
  'lovableproject.com',
  'gptengineer.run',
  'webcontainer.io',
];

function isWhitelistedOrigin(origin: string): boolean {
  return WHITELISTED_DOMAINS.some(domain => origin.includes(domain));
}

interface DeviceData {
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  osVersion?: string;
  screenResolution?: string;
  canvasFingerprint?: string;
  webglFingerprint?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  timezone?: string;
  language?: string;
  platform?: string;
}

interface GeoData {
  status: string;
  country: string;
  regionName: string;
  city: string;
  lat: number;
  lon: number;
  isp: string;
  org: string;
  timezone: string;
}

interface ViolationPayload {
  violationType: string;
  deviceFingerprint: string;
  userAgent: string;
  userEmail?: string;
  userId?: string;
  severity: "critical" | "warning";
  violationDetails?: Record<string, unknown>;
  pageUrl?: string;
  deviceData?: DeviceData;
}

// Fetch geolocation data from ip-api.com
async function fetchGeoData(ip: string): Promise<GeoData | null> {
  if (ip === 'unknown' || ip === '127.0.0.1' || ip === 'localhost') {
    return null;
  }
  
  try {
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon,isp,org,timezone`
    );
    
    if (!response.ok) {
      console.error('Geo API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    if (data.status === 'success') {
      return data as GeoData;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching geo data:', error);
    return null;
  }
}

// Generate HTML email template
function generateEmailTemplate(
  violationType: string,
  severity: string,
  userEmail: string | undefined,
  clientIP: string,
  deviceFingerprint: string,
  geoData: GeoData | null,
  deviceData: DeviceData | undefined,
  pageUrl: string | undefined
): string {
  const mapsLink = geoData 
    ? `https://www.google.com/maps?q=${geoData.lat},${geoData.lon}`
    : null;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #1a1a2e; color: #eee; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #16213e; border-radius: 12px; padding: 24px; }
    .header { text-align: center; border-bottom: 2px solid #e94560; padding-bottom: 16px; margin-bottom: 20px; }
    .header h1 { color: #e94560; margin: 0; }
    .section { background: #0f3460; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .section h3 { color: #e94560; margin-top: 0; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1a1a2e; }
    .label { color: #888; }
    .value { color: #fff; font-weight: bold; }
    .critical { color: #e94560; }
    .btn { display: inline-block; background: #e94560; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 ALERTA DE SEGURANÇA</h1>
      <p style="color: #e94560;">Sistema KnowYOU v3</p>
    </div>
    
    <div class="section">
      <h3>📛 Detalhes da Violação</h3>
      <div class="row">
        <span class="label">Tipo:</span>
        <span class="value">${violationType}</span>
      </div>
      <div class="row">
        <span class="label">Severidade:</span>
        <span class="value critical">${severity.toUpperCase()}</span>
      </div>
      <div class="row">
        <span class="label">Data/Hora:</span>
        <span class="value">${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
      </div>
      ${pageUrl ? `
      <div class="row">
        <span class="label">Página:</span>
        <span class="value">${pageUrl}</span>
      </div>
      ` : ''}
    </div>
    
    <div class="section">
      <h3>🌐 Identificação do Dispositivo</h3>
      <div class="row">
        <span class="label">IP:</span>
        <span class="value">${clientIP}</span>
      </div>
      ${geoData ? `
      <div class="row">
        <span class="label">Localização:</span>
        <span class="value">${geoData.city}, ${geoData.regionName}, ${geoData.country}</span>
      </div>
      <div class="row">
        <span class="label">ISP:</span>
        <span class="value">${geoData.isp}</span>
      </div>
      <div class="row">
        <span class="label">Organização:</span>
        <span class="value">${geoData.org}</span>
      </div>
      ` : ''}
      <div class="row">
        <span class="label">Fingerprint:</span>
        <span class="value">${deviceFingerprint}</span>
      </div>
      ${userEmail ? `
      <div class="row">
        <span class="label">Usuário:</span>
        <span class="value">${userEmail}</span>
      </div>
      ` : ''}
    </div>
    
    ${deviceData ? `
    <div class="section">
      <h3>💻 Dados do Navegador</h3>
      <div class="row">
        <span class="label">Browser:</span>
        <span class="value">${deviceData.browserName} ${deviceData.browserVersion}</span>
      </div>
      <div class="row">
        <span class="label">Sistema:</span>
        <span class="value">${deviceData.osName} ${deviceData.osVersion}</span>
      </div>
      <div class="row">
        <span class="label">Resolução:</span>
        <span class="value">${deviceData.screenResolution}</span>
      </div>
      <div class="row">
        <span class="label">Canvas FP:</span>
        <span class="value">${deviceData.canvasFingerprint}</span>
      </div>
      <div class="row">
        <span class="label">WebGL FP:</span>
        <span class="value">${deviceData.webglFingerprint}</span>
      </div>
      <div class="row">
        <span class="label">CPU Cores:</span>
        <span class="value">${deviceData.hardwareConcurrency || 'N/A'}</span>
      </div>
      <div class="row">
        <span class="label">Memória:</span>
        <span class="value">${deviceData.deviceMemory ? deviceData.deviceMemory + ' GB' : 'N/A'}</span>
      </div>
    </div>
    ` : ''}
    
    ${mapsLink ? `
    <div style="text-align: center;">
      <a href="${mapsLink}" class="btn" target="_blank">📍 Ver no Google Maps</a>
    </div>
    ` : ''}
    
    <div class="footer">
      <p>Sistema de Segurança KnowYOU v3 • Tolerância Zero</p>
      <p>Este é um email automático. Não responda.</p>
    </div>
  </div>
</body>
</html>
  `;
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Ignorar violações de domínios whitelisted (desenvolvimento/preview)
    const origin = req.headers.get('origin') || req.headers.get('referer') || '';
    if (isWhitelistedOrigin(origin)) {
      console.log('[WHITELIST] Ignoring violation from whitelisted domain:', origin);
      return new Response(
        JSON.stringify({ 
          success: true, 
          whitelisted: true,
          message: 'Violation ignored - development/preview environment'
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP from headers
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    const payload: ViolationPayload = await req.json();
    const { 
      violationType, 
      deviceFingerprint, 
      userAgent, 
      userEmail, 
      userId, 
      severity,
      violationDetails,
      pageUrl,
      deviceData
    } = payload;

    console.log(`🚨 Security violation detected: ${violationType}`);
    console.log(`   Fingerprint: ${deviceFingerprint}`);
    console.log(`   IP: ${clientIP}`);
    console.log(`   User: ${userEmail || "anonymous"}`);

    // 1. Check IP Whitelist
    let isIPWhitelisted = false;
    if (clientIP !== 'unknown') {
      const { data: whitelistEntry } = await supabase
        .from("security_whitelist")
        .select("*")
        .eq("ip_address", clientIP)
        .eq("is_active", true)
        .maybeSingle();
      
      if (whitelistEntry) {
        // Check if not expired
        if (!whitelistEntry.expires_at || new Date(whitelistEntry.expires_at) > new Date()) {
          isIPWhitelisted = true;
          console.log(`[WHITELIST] IP ${clientIP} is whitelisted (${whitelistEntry.user_name})`);
        }
      }
    }

    // 1.5. Check Device Fingerprint Whitelist (BUG FIX: verificar por fingerprint além de IP)
    if (!isIPWhitelisted && deviceFingerprint) {
      const { data: deviceWhitelistEntry } = await supabase
        .from("security_whitelist")
        .select("*")
        .eq("device_fingerprint", deviceFingerprint)
        .eq("is_active", true)
        .maybeSingle();
      
      if (deviceWhitelistEntry) {
        // Check if not expired
        if (!deviceWhitelistEntry.expires_at || new Date(deviceWhitelistEntry.expires_at) > new Date()) {
          isIPWhitelisted = true;
          console.log(`[WHITELIST] Device ${deviceFingerprint.substring(0, 16)} is whitelisted by fingerprint`);
        }
      }
    }

    // 1.6. Check User ID Whitelist
    if (!isIPWhitelisted && userId) {
      const { data: userWhitelistEntry } = await supabase
        .from("security_whitelist")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      
      if (userWhitelistEntry) {
        if (!userWhitelistEntry.expires_at || new Date(userWhitelistEntry.expires_at) > new Date()) {
          isIPWhitelisted = true;
          console.log(`[WHITELIST] User ${userId} is whitelisted by user_id`);
        }
      }
    }

    // 2. Fetch Geolocation Data
    const geoData = await fetchGeoData(clientIP);
    if (geoData) {
      console.log(`   Location: ${geoData.city}, ${geoData.country}`);
    }

    // 3. Insert into security_audit_log (always log, even for whitelisted)
    const { error: auditError } = await supabase
      .from("security_audit_log")
      .insert({
        incident_type: violationType,
        severity,
        device_fingerprint: deviceFingerprint,
        ip_address: clientIP !== "unknown" ? clientIP : null,
        user_agent: userAgent,
        user_email: userEmail || null,
        user_id: userId || null,
        // Device Data
        browser_name: deviceData?.browserName,
        browser_version: deviceData?.browserVersion,
        os_name: deviceData?.osName,
        os_version: deviceData?.osVersion,
        screen_resolution: deviceData?.screenResolution,
        canvas_fingerprint: deviceData?.canvasFingerprint,
        webgl_fingerprint: deviceData?.webglFingerprint,
        hardware_concurrency: deviceData?.hardwareConcurrency,
        device_memory: deviceData?.deviceMemory,
        timezone: deviceData?.timezone,
        language: deviceData?.language,
        platform: deviceData?.platform,
        // Geo Data
        geo_country: geoData?.country,
        geo_region: geoData?.regionName,
        geo_city: geoData?.city,
        geo_lat: geoData?.lat,
        geo_lon: geoData?.lon,
        geo_isp: geoData?.isp,
        geo_org: geoData?.org,
        geo_timezone: geoData?.timezone,
        // Action
        action_taken: isIPWhitelisted ? "allowed" : "banned",
        was_whitelisted: isIPWhitelisted,
        ban_applied: !isIPWhitelisted,
        page_url: pageUrl,
        violation_details: violationDetails || {},
      });

    if (auditError) {
      console.error("Error inserting audit log:", auditError);
    }

    // If IP is whitelisted, stop here (don't ban, don't send alerts)
    if (isIPWhitelisted) {
      return new Response(
        JSON.stringify({
          success: true,
          banned: false,
          whitelisted: true,
          message: "Violation logged but IP is whitelisted",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // 4. Insert into security_violations log
    const { error: violationError } = await supabase
      .from("security_violations")
      .insert({
        device_fingerprint: deviceFingerprint,
        ip_address: clientIP !== "unknown" ? clientIP : null,
        user_id: userId || null,
        user_email: userEmail || null,
        violation_type: violationType,
        violation_details: violationDetails || {},
        action_taken: "banned",
        severity,
      });

    if (violationError) {
      console.error("Error inserting violation:", violationError);
    }

    // 5. Insert into banned_devices (permanent ban)
    const banReason = `Violação de segurança: ${violationType}`;
    
    const { error: banError } = await supabase
      .from("banned_devices")
      .insert({
        device_fingerprint: deviceFingerprint,
        ip_address: clientIP !== "unknown" ? clientIP : null,
        user_agent: userAgent,
        user_id: userId || null,
        user_email: userEmail || null,
        ban_reason: banReason,
        violation_type: violationType,
        is_permanent: true,
      });

    if (banError && !banError.message.includes("duplicate")) {
      console.error("Error banning device:", banError);
    }

    // 6. If user is logged in, ban user in user_registrations
    if (userEmail) {
      const { error: userBanError } = await supabase
        .from("user_registrations")
        .update({
          is_banned: true,
          banned_at: new Date().toISOString(),
          ban_reason: banReason,
          ban_type: "security_violation",
        })
        .eq("email", userEmail);

      if (userBanError) {
        console.error("Error banning user:", userBanError);
      } else {
        console.log(`User ${userEmail} banned successfully`);
      }
    }

    // 7. Get admin settings
    const { data: settings } = await supabase
      .from("admin_settings")
      .select("security_alert_email, whatsapp_target_phone, whatsapp_global_enabled, email_global_enabled")
      .single();

    let emailSent = false;
    let whatsappSent = false;

    // 8. Send Email Alert via Resend
    if (settings?.email_global_enabled && settings?.security_alert_email) {
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (resendApiKey) {
          const resend = new Resend(resendApiKey);
          
          const emailHtml = generateEmailTemplate(
            violationType,
            severity,
            userEmail,
            clientIP,
            deviceFingerprint,
            geoData,
            deviceData,
            pageUrl
          );

          await resend.emails.send({
            from: "KnowYOU Security <security@knowyou.app>",
            to: [settings.security_alert_email],
            subject: `🚨 [CRÍTICO] Violação de Segurança - ${violationType}`,
            html: emailHtml,
          });

          emailSent = true;
          console.log(`Email alert sent to ${settings.security_alert_email}`);
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    }

    // 9. Send WhatsApp Alert
    if (settings?.whatsapp_global_enabled && settings?.whatsapp_target_phone) {
      try {
        const locationInfo = geoData 
          ? `📍 ${geoData.city}, ${geoData.country}\n🔗 Maps: https://www.google.com/maps?q=${geoData.lat},${geoData.lon}`
          : '📍 Localização não disponível';

        const alertMessage = `🚨 *ALERTA DE SEGURANÇA KnowYOU v3*

⛔ *BANIMENTO AUTOMÁTICO*

📛 *Tipo:* ${violationType}
🔴 *Severidade:* ${severity.toUpperCase()}
👤 *Usuário:* ${userEmail || "Anônimo"}
🌐 *IP:* ${clientIP}
📱 *Dispositivo:* ${deviceFingerprint.substring(0, 16)}...
${deviceData ? `💻 *Browser:* ${deviceData.browserName} ${deviceData.browserVersion}
🖥️ *OS:* ${deviceData.osName} ${deviceData.osVersion}` : ''}

${locationInfo}

✅ Dispositivo banido permanentemente.
⏰ ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`;

        await supabase.functions.invoke("send-whatsapp", {
          body: {
            to: settings.whatsapp_target_phone,
            message: alertMessage,
          },
        });

        whatsappSent = true;
        console.log("WhatsApp alert sent to Super Admin");
      } catch (whatsappError) {
        console.error("Error sending WhatsApp:", whatsappError);
      }
    }

    // 10. Update audit log with notification status
    await supabase
      .from("security_audit_log")
      .update({
        email_sent: emailSent,
        whatsapp_sent: whatsappSent,
        email_sent_to: emailSent ? settings?.security_alert_email : null,
        whatsapp_sent_to: whatsappSent ? settings?.whatsapp_target_phone : null,
      })
      .eq("device_fingerprint", deviceFingerprint)
      .order("created_at", { ascending: false })
      .limit(1);

    // 11. Log notification
    await supabase.from("notification_logs").insert({
      event_type: "security_violation_detected",
      channel: "system",
      recipient: userEmail || "unknown",
      subject: `Security Violation: ${violationType}`,
      message_body: banReason,
      status: "sent",
      metadata: {
        device_fingerprint: deviceFingerprint,
        ip_address: clientIP,
        violation_type: violationType,
        severity,
        geo_location: geoData ? `${geoData.city}, ${geoData.country}` : null,
        email_sent: emailSent,
        whatsapp_sent: whatsappSent,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        banned: true,
        message: "Violation recorded and device banned",
        notifications: {
          email: emailSent,
          whatsapp: whatsappSent,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing security violation:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
