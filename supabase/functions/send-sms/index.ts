// ============================================
// VERSAO: 4.2.0 | DEPLOY: 2026-01-11
// FIX: SEMPRE retorna HTTP 200 com success:true/false
// Elimina erros "non-2xx" no frontend
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const FUNCTION_VERSION = "4.2.0";

const sanitizePhoneNumberForInfobip = (phone: string): string => {
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+")) {
    cleaned = cleaned.replace(/^0+/, "");
    if (!cleaned.startsWith("55")) {
      cleaned = "55" + cleaned;
    }
  }
  // Infobip não usa + no número
  return cleaned.replace("+", "");
};

const ensureE164 = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10 || cleaned.length === 11) cleaned = "55" + cleaned;
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
};

function resolveInfobipSmsEndpoint(rawBaseUrl: string): string {
  const base = (rawBaseUrl || "").trim();
  if (!base) throw new Error("INFOBIP_BASE_URL não configurada");

  // Caso venha como URL completa
  if (base.startsWith("http://") || base.startsWith("https://")) {
    const u = new URL(base);
    const path = (u.pathname || "").replace(/\/+$/, "");
    if (path && path !== "/") return `${u.origin}${path}`;
    return `${u.origin}/sms/2/text/advanced`;
  }

  // Caso venha como host OU host + path
  const noScheme = base.replace(/^https?:\/\//, "");
  const [host, ...rest] = noScheme.split("/");
  const pathPart = rest.join("/").replace(/^\/+/, "").replace(/\/+$/, "");

  if (!host) throw new Error("INFOBIP_BASE_URL inválida");

  // Se já veio com um path que parece endpoint SMS, respeita
  if (pathPart && pathPart.includes("sms/")) {
    return `https://${host}/${pathPart}`;
  }

  return `https://${host}/sms/2/text/advanced`;
}

async function readJsonOrText(resp: Response): Promise<{ json: any | null; text: string }> {
  const text = await resp.text();
  try {
    return { json: JSON.parse(text), text };
  } catch {
    return { json: null, text };
  }
}

async function sendViaTwilioSms(params: {
  toE164: string;
  fromE164: string;
  body: string;
}): Promise<{ success: boolean; messageId?: string; status?: string; error?: string }> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");

  if (!accountSid || !authToken) {
    return { success: false, error: "Twilio não configurado (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN)" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const bodyParams = new URLSearchParams({
    From: params.fromE164,
    To: params.toE164,
    Body: params.body,
  });

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
    },
    body: bodyParams.toString(),
  });

  const { json, text } = await readJsonOrText(resp);
  if (!resp.ok) {
    const msg = json?.message || text || "Falha ao enviar via Twilio";
    return { success: false, error: `Twilio HTTP ${resp.status}: ${msg}` };
  }

  return { success: true, messageId: json?.sid, status: json?.status };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log(`\n=== SEND-SMS v${FUNCTION_VERSION} START ===`);
  console.log(`[TIMESTAMP] ${new Date().toISOString()}`);

  // Helper para resposta padronizada (SEMPRE HTTP 200)
  const respond = (payload: Record<string, unknown>) => {
    const body = { ...payload, version: FUNCTION_VERSION };
    console.log(`[RESPONSE] ${JSON.stringify(body)}`);
    console.log(`=== SEND-SMS v${FUNCTION_VERSION} END ===\n`);
    return new Response(JSON.stringify(body), {
      status: 200, // SEMPRE 200
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  };

  try {
    const { phoneNumber: rawPhone, message, eventType } = await req.json();

    // Validação - retorna 200 com success:false
    if (!rawPhone || !message) {
      console.error("❌ Campos obrigatórios faltando");
      return respond({
        success: false,
        error: "phoneNumber and message are required",
        error_code: "VALIDATION_ERROR",
        channel: "sms",
      });
    }

    const infobipTo = sanitizePhoneNumberForInfobip(rawPhone);
    const toE164 = ensureE164(rawPhone);

    console.log(`📱 [TELEFONE] Original: ${rawPhone}`);
    console.log(`📱 [INFOBIP] To: ${infobipTo.slice(0, 6)}***`);
    console.log(`📱 [TWILIO] To: ${toE164.slice(0, 6)}***`);
    console.log(`📝 [EVENTO] ${eventType || "manual"}`);

    // =========================
    // 1) INFOBIP
    // =========================
    const apiKey = Deno.env.get("INFOBIP_API_KEY");
    const baseUrl = Deno.env.get("INFOBIP_BASE_URL") || "5589kd.api.infobip.com";
    const sender = Deno.env.get("INFOBIP_SENDER") || "KnowYOU";

    let infobipError: string | null = null;

    if (!apiKey) {
      infobipError = "INFOBIP_API_KEY não configurada";
      console.error(`❌ ${infobipError}`);
    } else {
      try {
        const endpoint = resolveInfobipSmsEndpoint(baseUrl);

        console.log(`\n📤 [INFOBIP] ========================================`);
        console.log(`📤 [INFOBIP] Base URL (raw): ${baseUrl}`);
        console.log(`📤 [INFOBIP] Endpoint: ${endpoint}`);
        console.log(`📤 [INFOBIP] From: ${sender}`);
        console.log(`📤 [INFOBIP] Message: ${String(message).slice(0, 50)}...`);
        console.log(`📤 [INFOBIP] ========================================\n`);

        const resp = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `App ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              {
                destinations: [{ to: infobipTo }],
                from: sender,
                text: message,
              },
            ],
          }),
        });

        const { json: data, text } = await readJsonOrText(resp);

        console.log(`📩 [INFOBIP] Response Status: ${resp.status}`);
        console.log(`📩 [INFOBIP] Response:`, data ? JSON.stringify(data) : text.slice(0, 600));

        const messageStatus = data?.messages?.[0];

        if (!resp.ok) {
          infobipError = `Infobip HTTP ${resp.status}: ${data?.message || text || "erro"}`;
        } else if (!messageStatus) {
          infobipError = "Resposta inválida da Infobip (messages[0] ausente)";
        } else if (messageStatus.status?.groupName === "REJECTED") {
          infobipError = `SMS rejeitado: ${messageStatus.status?.description || "sem descrição"}`;
        } else {
          console.log(`✅ [INFOBIP] Message ID: ${messageStatus.messageId}`);
          console.log(`✅ [INFOBIP] Status: ${messageStatus.status?.name}`);

          return respond({
            success: true,
            messageId: messageStatus.messageId,
            status: messageStatus.status?.name,
            statusGroup: messageStatus.status?.groupName,
            channel: "sms",
            provider: "infobip",
          });
        }
      } catch (e: unknown) {
        infobipError = e instanceof Error ? e.message : String(e);
      }

      console.warn(`⚠️ [INFOBIP] Falhou: ${infobipError}`);
    }

    // =========================
    // 2) FALLBACK: TWILIO SMS
    // =========================
    const fromE164 = Deno.env.get("TWILIO_SMS_NUMBER") || Deno.env.get("TWILIO_FROM_NUMBER");

    if (!fromE164) {
      const msg = `Falha Infobip e Twilio sem FROM. Infobip: ${infobipError}`;
      console.error(`❌ ${msg}`);
      return respond({
        success: false,
        error: msg,
        error_code: "MISSING_CREDENTIALS",
        channel: "sms",
        provider: "none",
        infobipError,
      });
    }

    console.log(`\n🔁 [FALLBACK] Tentando Twilio SMS...`);
    console.log(`📤 [TWILIO] From: ${fromE164}`);

    const twilioRes = await sendViaTwilioSms({ toE164, fromE164, body: message });

    if (!twilioRes.success) {
      const msg = `Infobip falhou (${infobipError}); Twilio falhou (${twilioRes.error})`;
      console.error(`❌ ${msg}`);
      return respond({
        success: false,
        error: msg,
        error_code: "SMS_FAILED",
        channel: "sms",
        provider: "twilio",
        infobipError,
        twilioError: twilioRes.error,
      });
    }

    console.log(`✅ [TWILIO] Message ID: ${twilioRes.messageId}`);
    console.log(`✅ [TWILIO] Status: ${twilioRes.status}`);

    return respond({
      success: true,
      messageId: twilioRes.messageId,
      status: twilioRes.status,
      channel: "sms",
      provider: "twilio",
      fallbackFrom: "infobip",
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ [ERRO]", errMsg);

    return respond({
      success: false,
      error: errMsg,
      error_code: "INTERNAL_ERROR",
      channel: "sms",
    });
  }
});
