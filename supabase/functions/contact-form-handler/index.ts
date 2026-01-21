// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface ContactFormRequest {
  email: string;
  subject: string;
  message: string;
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Force log ALL notification attempts (success, failed, blocked)
  const forceLog = async (
    eventType: string,
    channel: string,
    recipient: string,
    status: string,
    messageBody: string,
    errorMessage?: string,
    metadata?: Record<string, unknown>
  ) => {
    try {
      await supabase.from("notification_logs").insert({
        event_type: eventType,
        channel,
        recipient: recipient || "N/A",
        status,
        message_body: messageBody.substring(0, 500),
        error_message: errorMessage || null,
        metadata: { ...metadata, force_logged: true, timestamp: new Date().toISOString() },
      });
      console.log(`[ForceLog] ${eventType} | ${channel} | ${status} | ${recipient}`);
    } catch (logError) {
      console.error("[ForceLog] Failed to log notification attempt:", logError);
    }
  };

  try {
    const { email, subject, message, metadata: requestMetadata }: ContactFormRequest = await req.json();

    // Validate input
    if (!email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Email, subject, and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ContactFormHandler] Processing contact from: ${email}`);

    // 1. Save contact message to database
    const { data: contactMessage, error: insertError } = await supabase
      .from("contact_messages")
      .insert({
        email,
        subject,
        message,
        status: "pending",
        metadata: {
          ...requestMetadata,
          processed_by: "contact-form-handler",
          timestamp: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error("[ContactFormHandler] Error saving contact message:", insertError);
      throw new Error("Failed to save contact message");
    }

    console.log(`[ContactFormHandler] Contact message saved: ${contactMessage.id}`);

    // 2. Get admin settings for recipient email
    const { data: settings } = await supabase
      .from("admin_settings")
      .select("gmail_notification_email, email_global_enabled, whatsapp_target_phone, whatsapp_global_enabled")
      .single();

    const recipientEmail = settings?.gmail_notification_email || "suporte@knowyou.app";
    const timestamp = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    // 3. Send email to support team
    let supportEmailSent = false;
    let supportEmailError: string | undefined;

    try {
      const supportEmailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "KnowYOU AI <noreply@knowyou.app>",
          to: [recipientEmail],
          subject: `[Contato KnowYOU] ${subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
              <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">KnowYOU AI</h1>
              </div>
              <div style="padding: 30px; background: #ffffff;">
                <h2 style="color: #1e3a5f; margin-top: 0;">Nova mensagem de contato</h2>
                <p style="color: #334155;"><strong>De:</strong> ${email}</p>
                <p style="color: #334155;"><strong>Assunto:</strong> ${subject}</p>
                <p style="color: #334155;"><strong>Data:</strong> ${timestamp}</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #0ea5e9;">
                  <p style="color: #334155; margin: 0; white-space: pre-line;">${message.replace(/\n/g, "<br />")}</p>
                </div>
              </div>
              <div style="text-align: center; padding: 16px; background: #f1f5f9; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} KnowYOU AI
                </p>
              </div>
            </div>
          `,
          replyTo: email,
        }),
      });

      if (supportEmailResponse.ok) {
        supportEmailSent = true;
        console.log("[ContactFormHandler] Support email sent successfully");
      } else {
        const errorData = await supportEmailResponse.json();
        supportEmailError = errorData.message || "Failed to send support email";
        console.error("[ContactFormHandler] Support email failed:", errorData);
      }
    } catch (emailError) {
      supportEmailError = emailError instanceof Error ? emailError.message : "Unknown email error";
      console.error("[ContactFormHandler] Support email error:", emailError);
    }

    // 4. Send confirmation email to user
    let confirmationEmailSent = false;

    try {
      const confirmationResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "KnowYOU AI <noreply@knowyou.app>",
          to: [email],
          subject: `Recebemos sua mensagem - ${subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
              <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">KnowYOU AI</h1>
              </div>
              <div style="padding: 30px; background: #ffffff;">
                <h2 style="color: #0ea5e9; margin-top: 0;">Obrigado por entrar em contato!</h2>
                <p style="color: #334155;">Olá,</p>
                <p style="color: #334155;">Recebemos sua mensagem e nossa equipe entrará em contato em breve.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #334155;"><strong>Resumo da sua mensagem:</strong></p>
                <p style="color: #334155;"><strong>Assunto:</strong> ${subject}</p>
                <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #0ea5e9;">
                  <p style="color: #334155; margin: 0; white-space: pre-line;">${message}</p>
                </div>
              </div>
              <div style="text-align: center; padding: 16px; background: #f1f5f9; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} KnowYOU AI
                </p>
              </div>
            </div>
          `,
        }),
      });

      if (confirmationResponse.ok) {
        confirmationEmailSent = true;
        console.log("[ContactFormHandler] Confirmation email sent to user");
      }
    } catch (confirmError) {
      console.error("[ContactFormHandler] Confirmation email error:", confirmError);
    }

    // 5. Update contact message status
    await supabase
      .from("contact_messages")
      .update({
        status: supportEmailSent ? "sent" : "failed",
        sent_at: supportEmailSent ? new Date().toISOString() : null,
      })
      .eq("id", contactMessage.id);

    // 6. DISPATCH NOTIFICATION (new_contact_message) - Using service role bypasses RLS
    console.log("[ContactFormHandler] Dispatching new_contact_message notification...");

    // Check notification preferences
    const { data: prefData, error: prefError } = await supabase
      .from("notification_preferences")
      .select("email_enabled, whatsapp_enabled")
      .eq("event_type", "new_contact_message")
      .single();

    if (prefError || !prefData) {
      console.log("[ContactFormHandler] No preferences found for new_contact_message, logging as blocked");
      await forceLog(
        "new_contact_message",
        "system",
        "N/A",
        "blocked",
        `Nova mensagem de ${email}: ${subject}`,
        "No notification preferences configured for new_contact_message"
      );
    } else {
      const emailGlobalEnabled = settings?.email_global_enabled !== false;
      const whatsappGlobalEnabled = settings?.whatsapp_global_enabled === true;

      // Get custom template
      const { data: template } = await supabase
        .from("notification_templates")
        .select("*")
        .eq("event_type", "new_contact_message")
        .single();

      const variables: Record<string, string> = {
        sender_name: email.split("@")[0],
        sender_email: email,
        snippet: message.substring(0, 100),
        timestamp,
        platform_name: "KnowYOU AI",
      };

      const injectVars = (tpl: string) => {
        let result = tpl;
        for (const [key, value] of Object.entries(variables)) {
          result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
        }
        return result;
      };

      // Send admin email notification if enabled
      if (prefData.email_enabled && emailGlobalEnabled && recipientEmail) {
        try {
          const emailSubject = template?.email_subject
            ? injectVars(template.email_subject)
            : `📬 Nova mensagem de contato - ${email}`;

          const emailBody = template?.email_body
            ? injectVars(template.email_body)
            : `Nova mensagem de contato de ${email}:\n\nAssunto: ${subject}\n\n${message.substring(0, 200)}`;

          const adminEmailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "KnowYOU AI <noreply@knowyou.app>",
              to: [recipientEmail],
              subject: emailSubject,
              html: `<pre style="font-family: sans-serif;">${emailBody}</pre>`,
            }),
          });

          if (adminEmailResponse.ok) {
            await forceLog("new_contact_message", "email", recipientEmail, "success", emailBody);
            console.log("[ContactFormHandler] Admin notification email sent");
          } else {
            const errorData = await adminEmailResponse.json();
            await forceLog("new_contact_message", "email", recipientEmail, "failed", emailBody, errorData.message || "Email send failed");
          }
        } catch (adminEmailError) {
          await forceLog(
            "new_contact_message",
            "email",
            recipientEmail,
            "failed",
            `Nova mensagem de ${email}`,
            adminEmailError instanceof Error ? adminEmailError.message : "Unknown error"
          );
        }
      } else if (!prefData.email_enabled) {
        await forceLog(
          "new_contact_message",
          "email",
          recipientEmail || "N/A",
          "blocked",
          `Nova mensagem de ${email}: ${subject}`,
          "Email notifications disabled for this event"
        );
      }

      // Send WhatsApp notification if enabled
      if (prefData.whatsapp_enabled && whatsappGlobalEnabled && settings?.whatsapp_target_phone) {
        try {
          const whatsappMessage = template?.whatsapp_message
            ? injectVars(template.whatsapp_message)
            : `📬 ${timestamp} - Nova mensagem de contato de ${email}: ${subject.substring(0, 50)}`;

          const whatsappResponse = await supabase.functions.invoke("send-whatsapp", {
            body: {
              phoneNumber: settings.whatsapp_target_phone,
              message: whatsappMessage,
              eventType: "new_contact_message",
            },
          });

          if (!whatsappResponse.error) {
            await forceLog("new_contact_message", "whatsapp", settings.whatsapp_target_phone, "success", whatsappMessage);
            console.log("[ContactFormHandler] WhatsApp notification sent");
          } else {
            await forceLog(
              "new_contact_message",
              "whatsapp",
              settings.whatsapp_target_phone,
              "failed",
              whatsappMessage,
              whatsappResponse.error.message
            );
          }
        } catch (whatsappError) {
          await forceLog(
            "new_contact_message",
            "whatsapp",
            settings.whatsapp_target_phone,
            "failed",
            `Nova mensagem de ${email}`,
            whatsappError instanceof Error ? whatsappError.message : "Unknown error"
          );
        }
      } else if (!prefData.whatsapp_enabled || !whatsappGlobalEnabled) {
        await forceLog(
          "new_contact_message",
          "whatsapp",
          settings?.whatsapp_target_phone || "N/A",
          "blocked",
          `Nova mensagem de ${email}: ${subject}`,
          "WhatsApp notifications disabled for this event or globally"
        );
      }
    }

    console.log("[ContactFormHandler] Contact form processed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Contact form processed",
        supportEmailSent,
        confirmationEmailSent,
        contactMessageId: contactMessage.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ContactFormHandler] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
