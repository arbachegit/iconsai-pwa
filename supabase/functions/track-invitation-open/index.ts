// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface TrackRequest {
  token: string;
  source: "platform" | "app";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { token, source }: TrackRequest = await req.json();

    console.log("Track invitation open:", { token: token?.substring(0, 8) + "...", source });

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!source || !["platform", "app"].includes(source)) {
      return new Response(
        JSON.stringify({ error: "Source deve ser 'platform' ou 'app'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch invitation
    const { data: invitation, error: fetchError } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchError || !invitation) {
      console.error("Invitation not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Convite não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      updated_at: now,
    };

    // Track specific modality fields
    let isFirstOpenForSource = false;

    if (source === "platform") {
      isFirstOpenForSource = !invitation.platform_first_opened_at;
      updateData.platform_last_opened_at = now;
      updateData.platform_open_count = (invitation.platform_open_count || 0) + 1;
      
      if (isFirstOpenForSource) {
        updateData.platform_first_opened_at = now;
      }
    } else if (source === "app") {
      isFirstOpenForSource = !invitation.app_first_opened_at;
      updateData.app_last_opened_at = now;
      updateData.app_open_count = (invitation.app_open_count || 0) + 1;
      
      if (isFirstOpenForSource) {
        updateData.app_first_opened_at = now;
      }
    }

    // Also update legacy fields for backwards compatibility
    if (!invitation.first_opened_at) {
      updateData.first_opened_at = now;
    }
    updateData.last_opened_at = now;
    updateData.open_count = (invitation.open_count || 0) + 1;

    await supabase
      .from("user_invitations")
      .update(updateData)
      .eq("token", token);

    console.log(`Invitation tracked: source=${source}, first_open_for_source=${isFirstOpenForSource}, total_open_count=${updateData.open_count}`);

    // Notify admin only on first open of each modality
    if (isFirstOpenForSource) {
      console.log(`First open detected for ${source}, notifying admin...`);

      // Get admin settings
      const { data: settings } = await supabase
        .from("admin_settings")
        .select("whatsapp_target_phone, whatsapp_global_enabled, gmail_notification_email")
        .single();

      const sourceLabel = source === "app" ? "📱 APP" : "🖥️ Plataforma";
      const sourceColor = source === "app" ? "#10b981" : "#6366f1";
      const nowFormatted = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      // Notify via WhatsApp
      if (settings?.whatsapp_global_enabled && settings?.whatsapp_target_phone) {
        try {
          const adminMessage = `🔔 *Convite Aberto!*

👤 ${invitation.name}
📧 ${invitation.email}
📍 Acessou: ${sourceLabel}
🕐 ${nowFormatted}

✨ O usuário está preenchendo o cadastro da ${source === "app" ? "versão APP" : "versão Plataforma"} agora!`;

          await supabase.functions.invoke("send-whatsapp", {
            body: {
              phoneNumber: settings.whatsapp_target_phone,
              message: adminMessage,
            },
          });
          console.log("Admin WhatsApp notification sent");
        } catch (whatsappError) {
          console.error("Error sending admin WhatsApp:", whatsappError);
        }
      }

      // Notify via Email
      if (settings?.gmail_notification_email) {
        try {
          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #0f172a; }
                .container { max-width: 480px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; }
                .header { background: linear-gradient(135deg, ${sourceColor} 0%, ${source === "app" ? "#059669" : "#8b5cf6"} 100%); padding: 24px; text-align: center; }
                .header h1 { color: white; margin: 0; font-size: 20px; }
                .content { padding: 24px; }
                .info-box { background: #334155; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
                .info-row { display: flex; align-items: center; margin-bottom: 8px; color: #e2e8f0; font-size: 14px; }
                .info-row:last-child { margin-bottom: 0; }
                .info-icon { margin-right: 8px; }
                .highlight { background: linear-gradient(135deg, ${sourceColor} 0%, ${source === "app" ? "#059669" : "#8b5cf6"} 100%); color: white; padding: 12px 16px; border-radius: 8px; text-align: center; font-weight: 600; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🔔 Convite Aberto - ${sourceLabel}</h1>
                </div>
                <div class="content">
                  <div class="info-box">
                    <div class="info-row"><span class="info-icon">👤</span> Nome: ${invitation.name}</div>
                    <div class="info-row"><span class="info-icon">📧</span> Email: ${invitation.email}</div>
                    <div class="info-row"><span class="info-icon">📍</span> Acessou: ${sourceLabel}</div>
                    <div class="info-row"><span class="info-icon">🕐</span> Horário: ${nowFormatted}</div>
                  </div>
                  <div class="highlight">
                    ✨ O usuário está preenchendo o cadastro da ${source === "app" ? "versão APP" : "versão Plataforma"} agora!
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;

          await supabase.functions.invoke("send-email", {
            body: {
              to: settings.gmail_notification_email,
              subject: `🔔 Convite aberto (${sourceLabel}): ${invitation.name}`,
              body: emailHtml,
            },
          });
          console.log("Admin email notification sent");
        } catch (emailError) {
          console.error("Error sending admin email:", emailError);
        }
      }

      // Log the event
      await supabase.from("notification_logs").insert({
        event_type: `invitation_opened_${source}`,
        channel: "system",
        recipient: invitation.email,
        subject: `Convite aberto - ${sourceLabel}`,
        message_body: `${invitation.name} abriu o convite via ${sourceLabel}`,
        status: "success",
        metadata: { token: token.substring(0, 8), source, first_open: true },
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        first_open: isFirstOpenForSource,
        source 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in track-invitation-open:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
