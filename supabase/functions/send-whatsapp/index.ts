// ============================================
// VERSAO: 3.0.0 | DEPLOY: 2026-01-02
// CORRECAO CRITICA: Erro 63016 - Templates obrigatórios
// REGRA: PROIBIDO enviar freeform (message/Body)
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ===========================================
// NORMALIZAÇÃO DE TELEFONE (E.164)
// ===========================================
function sanitizePhoneNumber(phone: string): string {
  let numbers = phone.replace(/\D/g, "");

  // Adicionar código do Brasil se necessário
  if (numbers.length === 11 || numbers.length === 10) {
    numbers = "55" + numbers;
  }

  return "+" + numbers;
}

// ===========================================
// MAPEAMENTO DE ERROS TWILIO
// ===========================================
const TWILIO_ERROR_MESSAGES: Record<string, string> = {
  "21608": "Número não registrado no WhatsApp",
  "21614": "Número de destino inválido",
  "21211": "Número de origem inválido - verifique TWILIO_FROM_NUMBER",
  "21408": "Número não está no sandbox do Twilio",
  "21610": "Número bloqueado ou não pode receber mensagens",
  "20003": "Autenticação falhou - verifique Account SID e Auth Token",
  "20404": "Recurso não encontrado - verifique TWILIO_FROM_NUMBER",
  "63015": "Número não está no sandbox - use WhatsApp Business",
  "63016": "Template não aprovado ou mensagem freeform fora da janela de 24h",
  "63024": "Número não habilitado para WhatsApp Business",
  "63025": "Taxa de envio excedida",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("\n=== SEND-WHATSAPP v3.0 START ===");
  console.log(`[TIMESTAMP] ${new Date().toISOString()}`);

  try {
    const body = await req.json();

    // Aceitar tanto 'phoneNumber' quanto 'to' para retrocompatibilidade
    const rawPhoneNumber = body.phoneNumber || body.to;
    const { message, eventType, contentSid, contentVariables } = body;

    console.log("[REQUEST] Keys recebidas:", Object.keys(body));
    console.log("[REQUEST] contentSid:", contentSid || "NÃO INFORMADO");
    console.log("[REQUEST] message:", message ? `"${message.slice(0, 30)}..."` : "NÃO INFORMADO");

    // ===========================================
    // VALIDAÇÃO: TELEFONE OBRIGATÓRIO
    // ===========================================
    if (!rawPhoneNumber) {
      console.error("❌ [ERRO] Campo phoneNumber/to é obrigatório");
      return new Response(JSON.stringify({ success: false, error: "phoneNumber ou to é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===========================================
    // VALIDAÇÃO CRÍTICA: PROIBIR FREEFORM!
    // ===========================================
    if (!contentSid) {
      console.error("❌ [ERRO CRÍTICO] contentSid é OBRIGATÓRIO!");
      console.error("❌ [ERRO] Envio de mensagem freeform (message/Body) é PROIBIDO!");
      console.error("❌ [ERRO] Use send-pwa-notification com template ou forneça contentSid");

      // Se tentou enviar message sem contentSid, rejeitar
      if (message) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "ERRO 63016: Envio de mensagem freeform é PROIBIDO. Use templates aprovados via contentSid.",
            code: 63016,
            help: "Use a edge function send-pwa-notification com um template válido (otp, welcome, invitation, resend_code, resend_welcome)",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: "contentSid é obrigatório. Forneça um template SID aprovado.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Sanitizar telefone
    const phoneNumber = sanitizePhoneNumber(rawPhoneNumber);
    console.log(`📱 [TELEFONE] Original: ${rawPhoneNumber}`);
    console.log(`📱 [TELEFONE] Normalizado: ${phoneNumber}`);

    // Validar formato E.164
    if (!phoneNumber.match(/^\+[1-9]\d{10,14}$/)) {
      console.error("❌ [ERRO] Formato de telefone inválido:", phoneNumber);
      return new Response(JSON.stringify({ success: false, error: "Formato de telefone inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===========================================
    // VERIFICAR CREDENCIAIS TWILIO
    // ===========================================
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER");

    console.log("🔑 [CREDENCIAIS]", {
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authToken,
      hasFromNumber: !!fromNumber,
      fromNumberPrefix: fromNumber?.slice(0, 10) || "N/A",
    });

    if (!accountSid || !authToken || !fromNumber) {
      const missing = [];
      if (!accountSid) missing.push("TWILIO_ACCOUNT_SID");
      if (!authToken) missing.push("TWILIO_AUTH_TOKEN");
      if (!fromNumber) missing.push("TWILIO_FROM_NUMBER");

      console.error("❌ [ERRO] Credenciais faltando:", missing);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Credenciais não configuradas: ${missing.join(", ")}`,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validar fromNumber
    if (!fromNumber.startsWith("+")) {
      console.error("❌ [ERRO] TWILIO_FROM_NUMBER deve começar com +");
      return new Response(JSON.stringify({ success: false, error: "TWILIO_FROM_NUMBER deve começar com +" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===========================================
    // PREPARAR E ENVIAR MENSAGEM COM TEMPLATE
    // ===========================================
    console.log(`\n📤 [ENVIO] ========================================`);
    console.log(`📤 [ENVIO] From: whatsapp:${fromNumber}`);
    console.log(`📤 [ENVIO] To: whatsapp:${phoneNumber}`);
    console.log(`📤 [ENVIO] ContentSid: ${contentSid}`);
    console.log(`📤 [ENVIO] ContentVariables: ${JSON.stringify(contentVariables || {})}`);
    if (eventType) {
      console.log(`📤 [ENVIO] Event type: ${eventType}`);
    }
    console.log(`📤 [ENVIO] ========================================\n`);

    const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    // Status callback URL para rastreamento de entrega
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const statusCallbackUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/twilio-status-callback` : null;

    // Construir form data - SEMPRE com ContentSid (template)
    const formData = new URLSearchParams();
    formData.append("From", `whatsapp:${fromNumber}`);
    formData.append("To", `whatsapp:${phoneNumber}`);
    formData.append("ContentSid", contentSid);

    if (contentVariables) {
      formData.append("ContentVariables", JSON.stringify(contentVariables));
    }

    if (statusCallbackUrl) {
      formData.append("StatusCallback", statusCallbackUrl);
      console.log(`📡 [CALLBACK] StatusCallback: ${statusCallbackUrl}`);
    }

    // Enviar para Twilio
    const response = await fetch(twilioApiUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const responseData = await response.json();

    // ===========================================
    // PROCESSAR RESPOSTA
    // ===========================================
    if (!response.ok) {
      const errorCode = responseData.code?.toString() || "UNKNOWN";
      const friendlyError =
        TWILIO_ERROR_MESSAGES[errorCode] || responseData.message || `Erro Twilio: ${response.status}`;

      console.error("❌ [TWILIO] API Error:", {
        status: response.status,
        code: responseData.code,
        message: responseData.message,
        moreInfo: responseData.more_info,
      });

      console.log("=== SEND-WHATSAPP END (FALHA) ===\n");

      return new Response(
        JSON.stringify({
          success: false,
          error: friendlyError,
          code: responseData.code,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`✅ [SUCESSO] Message SID: ${responseData.sid}`);
    console.log(`✅ [SUCESSO] Status: ${responseData.status}`);
    console.log("=== SEND-WHATSAPP END (SUCESSO) ===\n");

    return new Response(
      JSON.stringify({
        success: true,
        sid: responseData.sid,
        status: responseData.status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("=== SEND-WHATSAPP FATAL ERROR ===", errorMessage);
    console.error(error);

    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
