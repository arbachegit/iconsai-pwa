// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getEmailTemplate(code: string, userName: string): string {
  const currentYear = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; padding: 32px;">
    <h2 style="color: #60a5fa; margin: 0 0 24px 0; font-size: 24px;">Plataforma KnowYOU</h2>
    <hr style="border: none; border-top: 1px solid #334155; margin: 0 0 24px 0;">
    
    <h3 style="color: #f8fafc; margin: 0 0 16px 0; font-size: 18px;">Recuperação de Senha</h3>
    <p style="color: #cbd5e1; margin: 0 0 24px 0; line-height: 1.6;">
      Olá, ${userName}. Recebemos uma solicitação para redefinir sua senha na Plataforma KnowYOU.
    </p>
    
    <p style="color: #cbd5e1; margin: 0 0 8px 0;">Seu código de verificação é:</p>
    
    <div style="background-color: #0f172a; padding: 24px; text-align: center; border-radius: 8px; margin: 0 0 24px 0; border: 1px solid #334155;">
      <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #60a5fa; font-family: monospace;">
        ${code}
      </span>
    </div>
    
    <p style="color: #94a3b8; font-size: 14px; margin: 0 0 8px 0;">
      ⏱️ Este código expira em <strong>10 minutos</strong>.
    </p>
    <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px 0;">
      Se você não solicitou esta recuperação, ignore este email.
    </p>
    
    <hr style="border: none; border-top: 1px solid #334155; margin: 0 0 16px 0;">
    <p style="color: #64748b; font-size: 12px; margin: 0; text-align: center;">
      © ${currentYear} Plataforma KnowYOU. Todos os direitos reservados.
    </p>
  </div>
</body>
</html>
  `.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error("Error listing users:", userError);
      throw new Error("Erro ao verificar usuário");
    }

    const userExists = userData.users.some(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!userExists) {
      console.log(`User not found for email: ${email}`);
      return new Response(
        JSON.stringify({ error: "email_not_found", message: "Email não registrado no sistema" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: check for recent codes (max 3 per 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recentCodes, error: recentError } = await supabase
      .from("password_recovery_codes")
      .select("id")
      .eq("email", email.toLowerCase())
      .gte("created_at", fifteenMinutesAgo);

    if (recentError) {
      console.error("Error checking recent codes:", recentError);
    }

    if (recentCodes && recentCodes.length >= 3) {
      return new Response(
        JSON.stringify({ error: "Muitas tentativas. Aguarde 15 minutos." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Invalidate previous unused codes
    const { error: invalidateError } = await supabase
      .from("password_recovery_codes")
      .update({ is_used: true })
      .eq("email", email.toLowerCase())
      .eq("is_used", false);

    if (invalidateError) {
      console.error("Error invalidating old codes:", invalidateError);
    }

    // Generate new code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry

    // Save code to database
    const { error: insertError } = await supabase
      .from("password_recovery_codes")
      .insert({
        email: email.toLowerCase(),
        code,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Error inserting code:", insertError);
      throw new Error("Erro ao gerar código");
    }

    // Get user name from email (use email prefix as fallback)
    const userName = email.split('@')[0];

    // Send email to user via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Plataforma KnowYOU <noreply@knowyou.app>",
        to: [email],
        subject: "🔐 Código de Recuperação - Plataforma KnowYOU",
        html: getEmailTemplate(code, userName),
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Recovery code email sent to user:", emailResult);

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      throw new Error("Erro ao enviar email");
    }

    // Log activity
    await supabase.from("user_activity_logs").insert({
      user_email: email,
      action: "Solicitou código de recuperação de senha",
      action_category: "PASSWORD_RECOVERY",
      details: { code_sent: true },
    });

    // Dispatch admin notification via centralized system with FORCE LOGGING
    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    
    // Force log helper - logs ALL attempts regardless of outcome
    const forceLog = async (
      channel: string,
      recipient: string,
      status: string,
      messageBody: string,
      errorMessage?: string
    ) => {
      try {
        await supabase.from("notification_logs").insert({
          event_type: "password_reset",
          channel,
          recipient: recipient || "N/A",
          status,
          message_body: messageBody.substring(0, 500),
          error_message: errorMessage || null,
          metadata: { force_logged: true, user_email: email, timestamp },
        });
        console.log(`[ForceLog] password_reset | ${channel} | ${status} | ${recipient}`);
      } catch (logError) {
        console.error("[ForceLog] Failed to log:", logError);
      }
    };

    try {
      // Check notification preferences for password_reset event
      const { data: prefData, error: prefError } = await supabase
        .from("notification_preferences")
        .select("email_enabled, whatsapp_enabled")
        .eq("event_type", "password_reset")
        .single();

      if (prefError || !prefData) {
        await forceLog("system", "N/A", "blocked", `Recuperação de senha para ${email}`, "No preferences configured for password_reset");
      } else {
        const { data: settings } = await supabase
          .from("admin_settings")
          .select("gmail_notification_email, whatsapp_target_phone, whatsapp_global_enabled, email_global_enabled")
          .single();

        // Get custom template
        const { data: template } = await supabase
          .from("notification_templates")
          .select("*")
          .eq("event_type", "password_reset")
          .single();
        
        // Inject variables into templates
        const variables: Record<string, string> = {
          otp_code: code,
          user_name: userName,
          timestamp,
          platform_name: 'Plataforma KnowYOU'
        };

        const injectVars = (tpl: string) => {
          let result = tpl;
          for (const [key, value] of Object.entries(variables)) {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
          }
          return result;
        };

        // Send admin email notification if enabled
        const emailGlobalEnabled = (settings as any)?.email_global_enabled !== false;
        if (prefData.email_enabled && emailGlobalEnabled && settings?.gmail_notification_email) {
          const emailSubject = template?.email_subject 
            ? injectVars(template.email_subject)
            : "🔐 Solicitação de Recuperação de Senha - Plataforma KnowYOU";
          
          const emailBody = template?.email_body
            ? injectVars(template.email_body)
            : `Olá, ${userName}.\n\nRecebemos uma solicitação para redefinir sua senha na Plataforma KnowYOU.\n\nSeu código de verificação é: ${code}\n\nEste código expira em 10 minutos.`;

          try {
            const emailResponse = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "Plataforma KnowYOU <noreply@knowyou.app>",
                to: [settings.gmail_notification_email],
                subject: emailSubject,
                html: `<pre style="font-family: sans-serif;">${emailBody}</pre>`,
              }),
            });
            
            if (emailResponse.ok) {
              await forceLog("email", settings.gmail_notification_email, "success", emailBody);
              console.log("[NotificationDispatcher] Password reset admin email sent");
            } else {
              const errorData = await emailResponse.json();
              await forceLog("email", settings.gmail_notification_email, "failed", emailBody, errorData.message);
            }
          } catch (emailError) {
            await forceLog("email", settings.gmail_notification_email, "failed", emailBody, emailError instanceof Error ? emailError.message : "Unknown error");
          }
        } else if (!prefData.email_enabled) {
          await forceLog("email", settings?.gmail_notification_email || "N/A", "blocked", `Recuperação para ${email}`, "Email notifications disabled for password_reset");
        }

        // Send WhatsApp notification if enabled
        if (prefData.whatsapp_enabled && settings?.whatsapp_global_enabled && settings?.whatsapp_target_phone) {
          const whatsappMessage = template?.whatsapp_message
            ? injectVars(template.whatsapp_message)
            : `🔐 ${timestamp} - Plataforma KnowYOU: Solicitação de recuperação de senha para ${userName}.`;

          try {
            const whatsappResponse = await supabase.functions.invoke("send-whatsapp", {
              body: {
                phoneNumber: settings.whatsapp_target_phone,
                message: whatsappMessage,
                eventType: "password_reset",
              },
            });
            
            if (!whatsappResponse.error) {
              await forceLog("whatsapp", settings.whatsapp_target_phone, "success", whatsappMessage);
              console.log("[NotificationDispatcher] Password reset WhatsApp sent");
            } else {
              await forceLog("whatsapp", settings.whatsapp_target_phone, "failed", whatsappMessage, whatsappResponse.error.message);
            }
          } catch (whatsappError) {
            await forceLog("whatsapp", settings.whatsapp_target_phone, "failed", whatsappMessage, whatsappError instanceof Error ? whatsappError.message : "Unknown error");
          }
        } else if (!prefData.whatsapp_enabled || !settings?.whatsapp_global_enabled) {
          await forceLog("whatsapp", settings?.whatsapp_target_phone || "N/A", "blocked", `Recuperação para ${email}`, "WhatsApp disabled for password_reset or globally");
        }
      }
    } catch (notifyError) {
      console.error("[NotificationDispatcher] Error sending password reset notification:", notifyError);
      await forceLog("system", "N/A", "failed", `Recuperação para ${email}`, notifyError instanceof Error ? notifyError.message : "Unknown error");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Código enviado para seu email" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-recovery-code:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
