// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const handler = async (req: Request): Promise<Response> => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get admin settings
    const { data: settings, error: settingsError } = await supabase
      .from("admin_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error("[check-ml-accuracy] Error fetching settings:", settingsError);
      throw settingsError;
    }

    if (!settings?.ml_accuracy_alert_enabled) {
      console.log("[check-ml-accuracy] ML accuracy alerts disabled");
      return new Response(
        JSON.stringify({ success: true, message: "Alerts disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const threshold = settings.ml_accuracy_threshold || 0.70;

    // Calculate ML accuracy from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: routingLogs, error: logsError } = await supabase
      .from("document_routing_log")
      .select("action_type")
      .in("action_type", ["ml_accepted", "ml_rejected"])
      .gte("created_at", sevenDaysAgo.toISOString());

    if (logsError) {
      console.error("[check-ml-accuracy] Error fetching routing logs:", logsError);
      throw logsError;
    }

    if (!routingLogs || routingLogs.length === 0) {
      console.log("[check-ml-accuracy] No ML routing data available");
      return new Response(
        JSON.stringify({ success: true, message: "No ML data available" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const totalML = routingLogs.length;
    const accepted = routingLogs.filter(l => l.action_type === "ml_accepted").length;
    const accuracyRate = totalML > 0 ? accepted / totalML : 0;

    console.log(`[check-ml-accuracy] ML Accuracy: ${(accuracyRate * 100).toFixed(1)}% (threshold: ${(threshold * 100).toFixed(0)}%)`);

    // Check if we need to send alert
    if (accuracyRate >= threshold) {
      console.log("[check-ml-accuracy] Accuracy above threshold, no alert needed");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Accuracy OK",
          accuracyRate: accuracyRate,
          threshold: threshold
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if we already sent an alert in the last 24 hours
    const lastAlert = settings.ml_accuracy_last_alert;
    if (lastAlert) {
      const lastAlertDate = new Date(lastAlert);
      const hoursSinceLastAlert = (Date.now() - lastAlertDate.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastAlert < 24) {
        console.log(`[check-ml-accuracy] Alert already sent ${hoursSinceLastAlert.toFixed(1)} hours ago`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Alert already sent recently",
            hoursSinceLastAlert
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Check notification preferences for ml_accuracy_drop event
    const { data: prefData } = await supabase
      .from("notification_preferences")
      .select("email_enabled, whatsapp_enabled")
      .eq("event_type", "ml_accuracy_drop")
      .single();

    // Get admin email from single source (gmail_notification_email)
    const adminEmail = settings.gmail_notification_email;
    const emailGlobalEnabled = settings.email_global_enabled !== false;
    const whatsappGlobalEnabled = settings.whatsapp_global_enabled || false;
    const whatsappPhone = settings.whatsapp_target_phone;

    if (!prefData) {
      console.log("[check-ml-accuracy] No notification preferences found for ml_accuracy_drop");
      return new Response(
        JSON.stringify({ success: true, message: "No preferences configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get custom template
    const { data: template } = await supabase
      .from("notification_templates")
      .select("*")
      .eq("event_type", "ml_accuracy_drop")
      .single();

    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    
    // Prepare template variables
    const variables: Record<string, string> = {
      model_name: 'Document Routing ML',
      current_accuracy: (accuracyRate * 100).toFixed(1),
      drop_percentage: ((threshold - accuracyRate) * 100).toFixed(1),
      timestamp,
      platform_name: 'Plataforma KnowYOU',
      total_suggestions: String(totalML),
      accepted_count: String(accepted),
      rejected_count: String(totalML - accepted)
    };

    const injectVars = (tpl: string) => {
      let result = tpl;
      for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
      return result;
    };

    let emailSent = false;
    let whatsappSent = false;

    // Send email notification if enabled
    if (prefData.email_enabled && emailGlobalEnabled && adminEmail && RESEND_API_KEY) {
      try {
        const emailSubject = template?.email_subject 
          ? injectVars(template.email_subject)
          : `⚠️ Alerta: Taxa de Acerto ML abaixo do threshold (${(accuracyRate * 100).toFixed(1)}%)`;
        
        const emailBody = template?.email_body
          ? injectVars(template.email_body)
          : `A taxa de acerto do sistema de roteamento ML caiu para ${(accuracyRate * 100).toFixed(1)}% (threshold: ${(threshold * 100).toFixed(0)}%).

Métricas (últimos 7 dias):
- Total de Sugestões: ${totalML}
- Aceitas: ${accepted}
- Rejeitadas: ${totalML - accepted}

Revise as regras de roteamento ML no painel de administração.`;

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Plataforma KnowYOU <noreply@knowyou.app>",
            to: [adminEmail],
            subject: emailSubject,
            html: `<pre style="font-family: sans-serif; white-space: pre-wrap;">${emailBody}</pre>`,
          }),
        });

        if (emailResponse.ok) {
          emailSent = true;
          console.log("[check-ml-accuracy] Email sent successfully");
        } else {
          const errData = await emailResponse.json();
          console.error("[check-ml-accuracy] Email send error:", errData);
        }

        // Log email attempt
        await supabase.from("notification_logs").insert({
          event_type: "ml_accuracy_drop",
          channel: "email",
          recipient: adminEmail,
          subject: emailSubject,
          message_body: emailBody,
          status: emailSent ? "success" : "failed",
          error_message: emailSent ? null : "Failed to send",
          metadata: { variables }
        });
      } catch (emailError: any) {
        console.error("[check-ml-accuracy] Email error:", emailError);
      }
    }

    // Send WhatsApp notification if enabled
    if (prefData.whatsapp_enabled && whatsappGlobalEnabled && whatsappPhone) {
      try {
        const whatsappMessage = template?.whatsapp_message
          ? injectVars(template.whatsapp_message)
          : `⚠️ ${timestamp} - Plataforma KnowYOU: Taxa de Acerto ML caiu para ${(accuracyRate * 100).toFixed(1)}% (threshold: ${(threshold * 100).toFixed(0)}%).`;

        const { data: whatsappData, error: whatsappError } = await supabase.functions.invoke("send-whatsapp", {
          body: {
            phoneNumber: whatsappPhone,
            message: whatsappMessage,
            eventType: "ml_accuracy_drop",
          },
        });

        if (!whatsappError && whatsappData?.success) {
          whatsappSent = true;
          console.log("[check-ml-accuracy] WhatsApp sent successfully");
        }

        // Log WhatsApp attempt
        await supabase.from("notification_logs").insert({
          event_type: "ml_accuracy_drop",
          channel: "whatsapp",
          recipient: whatsappPhone,
          subject: null,
          message_body: whatsappMessage,
          status: whatsappSent ? "success" : "failed",
          error_message: whatsappSent ? null : (whatsappError?.message || "Failed to send"),
          metadata: { variables }
        });
      } catch (whatsappErr: any) {
        console.error("[check-ml-accuracy] WhatsApp error:", whatsappErr);
      }
    }

    // Update last alert timestamp
    await supabase
      .from("admin_settings")
      .update({ ml_accuracy_last_alert: new Date().toISOString() })
      .eq("id", settings.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Alert processing complete",
        accuracyRate,
        threshold,
        emailSent,
        whatsappSent
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[check-ml-accuracy] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
