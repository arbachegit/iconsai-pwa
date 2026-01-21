// ============================================
// VERSAO: 3.1.0 | DEPLOY: 2026-01-04
// FIX: resend_welcome agora envia 2 variaveis
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface ResendWelcomeRequest {
  registrationId: string;
  channel?: "email" | "whatsapp" | "both"; // Ignorado - usamos regra por produto
}

serve(async (req) => {
  // VERSÃO 2.1 - FORÇA REDEPLOY
  console.log("[resend-welcome-email] ===== VERSÃO 2.1 =====");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header to verify admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin user
    const {
      data: { user: adminUser },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !adminUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id)
      .in("role", ["admin", "superadmin"])
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { registrationId }: ResendWelcomeRequest = await req.json();

    if (!registrationId) {
      return new Response(JSON.stringify({ error: "Registration ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get registration
    const { data: registration, error: regError } = await supabase
      .from("user_registrations")
      .select("*")
      .eq("id", registrationId)
      .single();

    if (regError || !registration) {
      console.error("[resend-welcome-email] Registration fetch error:", regError);
      return new Response(JSON.stringify({ error: "Registration not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is approved
    if (registration.status !== "approved") {
      return new Response(JSON.stringify({ error: "Only approved users can receive welcome emails" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is banned
    if (registration.is_banned) {
      return new Response(JSON.stringify({ error: "Cannot resend email to banned users" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[resend-welcome-email] Resending to:", registration.email);

    const userName = `${registration.first_name} ${registration.last_name}`;
    const results: { email?: boolean; whatsapp?: boolean } = {};

    // =====================================================
    // REGRA DE CANAL POR PRODUTO:
    // - PLATAFORMA → EMAIL (plataforma não abre no celular)
    // - APP → WHATSAPP (app é para mobile)
    // - Se só tem Plataforma + tem telefone → WhatsApp informativo
    // =====================================================

    const hasPlatformAccess = registration.has_platform_access;
    const hasAppAccess = registration.has_app_access;
    const siteUrl = "https://pwa.iconsai.ai";
    const appUrl = `${siteUrl}/pwa-register`;

    // Generate new password recovery link para Plataforma
    let recoveryLink = "";
    if (hasPlatformAccess) {
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email: registration.email,
      });

      if (linkError) {
        console.error("[resend-welcome-email] Recovery link generation error:", linkError);
        return new Response(
          JSON.stringify({ error: "Failed to generate recovery link. User may not exist in auth system." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      recoveryLink =
        linkData?.properties?.action_link || `${supabaseUrl.replace(".supabase.co", "")}/admin/reset-password`;
      console.log("[resend-welcome-email] Recovery link generated");
    }

    // EMAIL para PLATAFORMA (obrigatório se tem acesso)
    if (hasPlatformAccess) {
      // Get template
      const { data: template } = await supabase
        .from("notification_templates")
        .select("email_subject, email_body")
        .eq("event_type", "user_registration_approved")
        .single();

      let emailSent = false;

      if (!template) {
        // Use default template if none exists
        const defaultHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
              .button { display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
              .info { background: #fff; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #6366f1; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin:0;">🖥️ Bem-vindo à Plataforma!</h1>
              </div>
              <div class="content">
                <p>Olá <strong>${userName}</strong>,</p>
                <p>Seu cadastro foi aprovado! Para acessar a plataforma, clique no botão abaixo para definir sua senha:</p>
                
                <div class="info">
                  <p style="margin:0;">💻 Acesse pelo <strong>computador ou tablet</strong> para aproveitar todos os recursos.</p>
                </div>
                
                <p style="text-align: center;">
                  <a href="${recoveryLink}" class="button" style="color: white;">Definir Minha Senha</a>
                </p>
                <p style="font-size: 12px; color: #666;">Este link é válido por 24 horas.</p>
              </div>
              <div class="footer">
                <p>Plataforma KnowYOU &copy; ${new Date().getFullYear()}</p>
              </div>
            </div>
          </body>
          </html>
        `;

        try {
          await supabase.functions.invoke("send-email", {
            body: {
              to: registration.email,
              subject: "🖥️ Bem-vindo à Plataforma KnowYOU!",
              body: defaultHtml,
            },
          });
          console.log("[resend-welcome-email] Default welcome email sent to:", registration.email);
          emailSent = true;
        } catch (emailError) {
          console.error("[resend-welcome-email] Email send error:", emailError);
        }
      } else {
        // Use custom template
        let emailBody = template.email_body || "";
        let emailSubject = template.email_subject || "Bem-vindo à Plataforma KnowYOU!";

        const variables: Record<string, string> = {
          user_name: userName,
          user_email: registration.email,
          recovery_link: recoveryLink,
          timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
          platform_name: "Plataforma KnowYOU",
        };

        for (const [key, value] of Object.entries(variables)) {
          emailBody = emailBody.replace(new RegExp(`\\{${key}\\}`, "g"), value);
          emailSubject = emailSubject.replace(new RegExp(`\\{${key}\\}`, "g"), value);
        }

        try {
          await supabase.functions.invoke("send-email", {
            body: {
              to: registration.email,
              subject: emailSubject,
              body: emailBody,
            },
          });
          console.log("[resend-welcome-email] Welcome email sent to:", registration.email);
          emailSent = true;
        } catch (emailError) {
          console.error("[resend-welcome-email] Email send error:", emailError);
        }
      }

      results.email = emailSent;

      // Log email notification
      if (emailSent) {
        await supabase.from("notification_logs").insert({
          event_type: "user_registration_resend_welcome",
          channel: "email",
          recipient: registration.email,
          subject: "Reenvio de email de boas-vindas (Plataforma)",
          message_body: `Email de boas-vindas reenviado para ${userName} com novo link de recuperação.`,
          status: "success",
          metadata: { registration_id: registrationId, triggered_by: adminUser.email },
        });
      }

      // SMS INFORMATIVO (só se NÃO tem APP)
      // Apenas avisa que enviamos email - via SMS (não WhatsApp freeform)
      if (registration.phone && !hasAppAccess) {
        try {
          const smsMsg = "KnowYOU: Reenviamos email com instrucoes para a Plataforma. Acesse pelo computador.";

          await supabase.functions.invoke("send-sms", {
            body: {
              phoneNumber: registration.phone,
              message: smsMsg,
            },
          });

          console.log("[resend-welcome-email] SMS info sent to:", registration.phone);

          await supabase.from("notification_logs").insert({
            event_type: "user_registration_resend_welcome",
            channel: "sms",
            recipient: registration.phone,
            subject: "SMS informativo (Plataforma)",
            message_body: smsMsg,
            status: "success",
            metadata: { registration_id: registrationId, triggered_by: adminUser.email },
          });
        } catch (smsError) {
          console.warn("[resend-welcome-email] SMS info error:", smsError);
        }
      }
    }

    // WhatsApp para APP (via template resend_welcome)
    if (hasAppAccess && registration.phone) {
      try {
        // Usar send-pwa-notification com template resend_welcome
        // Template espera 1 variavel: {{1}} = nome
        const { data: notifResult, error: notifError } = await supabase.functions.invoke("send-pwa-notification", {
          body: {
            to: registration.phone,
            template: "resend_welcome",
            variables: { 
              "1": userName
            },
            channel: "whatsapp"
          }
        });

        if (notifError || !notifResult?.success) {
          console.error("[resend-welcome-email] WhatsApp APP error:", notifError || notifResult?.error);
          results.whatsapp = false;
        } else {
          console.log("[resend-welcome-email] WhatsApp APP sent via", notifResult?.channel);
          results.whatsapp = true;
        }

        await supabase.from("notification_logs").insert({
          event_type: "user_registration_resend_welcome",
          channel: notifResult?.channel || "whatsapp",
          recipient: registration.phone,
          subject: "WhatsApp APP com template",
          message_body: `Reenvio boas-vindas via template resend_welcome`,
          status: notifResult?.success ? "success" : "failed",
          error_message: notifError?.message || notifResult?.error || null,
          metadata: { registration_id: registrationId, triggered_by: adminUser.email, template: "resend_welcome" },
        });
      } catch (whatsappError) {
        console.error("[resend-welcome-email] WhatsApp APP error:", whatsappError);
        results.whatsapp = false;
      }
    }

    // Log the action
    await supabase.from("user_activity_logs").insert({
      user_email: adminUser.email,
      user_id: adminUser.id,
      action_category: "USER_REGISTRATION_RESEND_WELCOME",
      action: `Reenviou boas-vindas para ${userName} (${registration.email})`,
      details: {
        registration_id: registrationId,
        user_email: registration.email,
        user_name: userName,
        has_platform_access: hasPlatformAccess,
        has_app_access: hasAppAccess,
        results,
      },
    });

    // Determine success message
    const successChannels: string[] = [];
    if (results.email) successChannels.push("email");
    if (results.whatsapp) successChannels.push("WhatsApp");

    if (successChannels.length === 0) {
      return new Response(JSON.stringify({ error: "Failed to send message via any channel" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Welcome message resent successfully via ${successChannels.join(" and ")}`,
        email: registration.email,
        phone: registration.phone,
        channels: successChannels,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[resend-welcome-email] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
