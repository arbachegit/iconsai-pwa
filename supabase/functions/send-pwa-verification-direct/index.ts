// ============================================
// VERSAO: 3.0.0 | DEPLOY: 2026-01-02
// CORRECAO CRITICA: Usar send-pwa-notification com template
// REGRA: Delegar para send-pwa-notification que já tem fallback correto
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("\n=== SEND-PWA-VERIFICATION-DIRECT v3.0 START ===");
  console.log(`[TIMESTAMP] ${new Date().toISOString()}`);

  try {
    const { phone, code, name } = await req.json();

    // ===========================================
    // VALIDAÇÕES
    // ===========================================
    if (!phone) {
      console.error("❌ [ERRO] Campo 'phone' é obrigatório");
      return new Response(JSON.stringify({ success: false, error: "Phone is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!code) {
      console.error("❌ [ERRO] Campo 'code' é obrigatório");
      return new Response(JSON.stringify({ success: false, error: "Code is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`📱 [TELEFONE] ${phone.slice(0, 5)}***`);
    console.log(`🔑 [CÓDIGO] ${code}`);
    console.log(`👤 [NOME] ${name || "N/A"}`);

    // ===========================================
    // CHAMAR send-pwa-notification COM TEMPLATE OTP
    // Esta função já tem fallback correto (WhatsApp → SMS)
    // e NUNCA envia freeform
    // ===========================================
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log("\n📤 [DELEGANDO] Chamando send-pwa-notification com template 'otp'...");

    const notificationResponse = await fetch(`${supabaseUrl}/functions/v1/send-pwa-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        to: phone,
        template: "otp",
        variables: {
          "1": code, // Variável {{1}} = código de verificação
        },
        channel: "whatsapp", // Tentar WhatsApp primeiro, fallback SMS automático
        userId: null,
      }),
    });

    const notificationResult = await notificationResponse.json();

    console.log(`\n📩 [RESPOSTA] Status HTTP: ${notificationResponse.status}`);
    console.log(`📩 [RESPOSTA] Success: ${notificationResult.success}`);
    console.log(`📩 [RESPOSTA] Channel: ${notificationResult.channel || "N/A"}`);
    console.log(`📩 [RESPOSTA] Attempts: ${notificationResult.attempts || "N/A"}`);

    if (notificationResult.error) {
      console.error(`📩 [RESPOSTA] Error: ${notificationResult.error}`);
    }

    // ===========================================
    // REGISTRAR LOG ADICIONAL (OPCIONAL)
    // ===========================================
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase.from("notification_logs").insert({
        event_type: "pwa_verification_direct",
        channel: notificationResult.channel || "unknown",
        recipient: phone,
        subject: "Código de Verificação PWA (Direct)",
        message_body: `Código: ${code}`,
        status: notificationResult.success ? "sent" : "failed",
        error_message: notificationResult.success ? null : notificationResult.error,
        fallback_used: notificationResult.channel === "sms",
        metadata: {
          name,
          code_sent: true,
          delegated_to: "send-pwa-notification",
          template_used: "otp",
          attempts: notificationResult.attempts,
        },
      });
      console.log("📝 [LOG] Registro salvo no banco");
    } catch (logError) {
      console.warn("⚠️ [LOG] Falha ao salvar log:", logError);
    }

    // ===========================================
    // RETORNAR RESULTADO
    // ===========================================
    if (notificationResult.success) {
      console.log("✅ [SUCESSO] Código de verificação enviado!");
      console.log("=== SEND-PWA-VERIFICATION-DIRECT END ===\n");

      return new Response(
        JSON.stringify({
          success: true,
          channel: notificationResult.channel,
          messageId: notificationResult.messageId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else {
      console.error("❌ [FALHA] Não foi possível enviar código de verificação");
      console.log("=== SEND-PWA-VERIFICATION-DIRECT END ===\n");

      return new Response(
        JSON.stringify({
          success: false,
          error: notificationResult.error || "Failed to send verification code",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("💥 [ERRO FATAL]", errorMessage);
    console.error(error);
    console.log("=== SEND-PWA-VERIFICATION-DIRECT END (ERROR) ===\n");

    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
