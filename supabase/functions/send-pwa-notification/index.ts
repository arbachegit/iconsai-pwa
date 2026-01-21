// ============================================
// VERSÃO: 5.8.0 | DEPLOY: 2026-01-14
// FIX: URL atualizada para pwa.iconsai.ai
// ============================================

const FUNCTION_VERSION = "5.8.0";
const SITE_URL = "https://pwa.iconsai.ai";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEMPLATES: Record<string, { sid: string; type: string; totalVariables: number; variableNames: string[] }> = {
  otp: {
    sid: "HX15dbff375b023b2d1514038027db6ad0",
    type: "authentication",
    totalVariables: 1,
    variableNames: ["codigo"],
  },
  resend_code: {
    sid: "HX026907ac8e769389acfda75829c5d543",
    type: "authentication",
    totalVariables: 1,
    variableNames: ["codigo"],
  },
  welcome: { sid: "HX35461ac69adc68257f54eb030fafe4b1", type: "utility", totalVariables: 1, variableNames: ["nome"] },
  invitation: {
    sid: "HX76217d9d436086e8adc6d1e185c7e2ee",
    type: "utility",
    totalVariables: 3,
    variableNames: ["nome", "quem_convidou", "url"],
  },
  resend_welcome: {
    sid: "HX9ccbe49ea4063c9155c3ebd67738556e",
    type: "utility",
    totalVariables: 1,
    variableNames: ["nome"],
  },
};

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10 || cleaned.length === 11) cleaned = "55" + cleaned;
  return cleaned.startsWith("+") ? cleaned : "+" + cleaned;
}

// ===========================================
// URL SHORTENER - IS.GD API (gratuita, confiável)
// Endpoint: https://is.gd/create.php?format=simple&url=URL
// Retorna: URL curta em texto puro
// ===========================================
async function shortenUrl(longUrl: string): Promise<string> {
  try {
    console.log(`[URL-SHORTENER] Encurtando via is.gd: ${longUrl.slice(0, 50)}...`);

    const apiUrl = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { Accept: "text/plain" },
    });

    if (response.ok) {
      const shortUrl = await response.text();
      // Verificar se retornou uma URL válida (começa com https://is.gd/)
      if (shortUrl.startsWith("https://is.gd/")) {
        console.log(`[URL-SHORTENER] ✅ Sucesso: ${shortUrl}`);
        return shortUrl.trim();
      } else {
        console.warn(`[URL-SHORTENER] ⚠️ Resposta inválida: ${shortUrl.slice(0, 100)}`);
      }
    } else {
      console.warn(`[URL-SHORTENER] ⚠️ HTTP ${response.status}`);
    }
  } catch (e) {
    console.warn(`[URL-SHORTENER] ❌ Erro: ${e}`);
  }

  // Fallback: retorna URL original
  return longUrl;
}

function getFirstName(fullName: string): string {
  return (fullName || "Voce").split(" ")[0] || "Voce";
}

async function sendSms(
  to: string,
  templateName: string,
  variables: Record<string, string>,
): Promise<{ success: boolean; error?: string; messageId?: string; provider?: string }> {
  let smsText = "";
  // Para OTP: variables["1"] = código, variables["2"] = nome (opcional)
  // Para outros: variables["1"] = nome
  const codigo = templateName === "otp" || templateName === "resend_code" ? variables["1"] : null;
  const nome = getFirstName(
    templateName === "otp" || templateName === "resend_code" 
      ? (variables["2"] || "Usuario") 
      : (variables["1"] || "Usuario")
  );

  switch (templateName) {
    case "otp":
    case "resend_code":
      // Código de verificação - SEM NOME para simplificar
      smsText = `KnowYOU: Seu codigo de verificacao: ${codigo}. Valido por 10 minutos.`;
      break;

    case "welcome":
      smsText = `KnowYOU: Ola ${nome}! Bem-vindo. Acesse: ${SITE_URL}/pwa`;
      break;

    case "resend_welcome":
      smsText = `KnowYOU: Ola ${nome}! Acesse: ${SITE_URL}/pwa`;
      break;

    case "invitation": {
      // Convite - URL pode vir já encurtada ou não
      let inviteUrl = variables["3"] || `${SITE_URL}/pwa-register`;

      // Se URL é longa (não começa com https://is.gd/), encurtar
      if (!inviteUrl.startsWith("https://is.gd/") && inviteUrl.length > 30) {
        inviteUrl = await shortenUrl(inviteUrl);
      }

      smsText = `KnowYOU: Ola ${nome}! Voce foi convidado. Acesse: ${inviteUrl}`;
      break;
    }

    default:
      smsText = `KnowYOU: ${Object.values(variables).join(" ")}`;
  }

  console.log(`[SMS] ${smsText.length} chars: ${smsText}`);

  // Verificar se passou de 160 chars
  if (smsText.length > 160) {
    console.warn(`[SMS] ⚠️ AVISO: Mensagem com ${smsText.length} chars (limite 160)`);
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await supabase.functions.invoke("send-sms", {
      body: { phoneNumber: to, message: smsText, eventType: "pwa_notification" },
    });
    if (error) return { success: false, error: error.message };
    return { success: !!data?.success, messageId: data?.messageId, error: data?.error, provider: data?.provider };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  console.log(`\n${"=".repeat(50)}`);
  console.log(`[SEND-PWA-NOTIFICATION v${FUNCTION_VERSION}] ${new Date().toISOString()}`);
  console.log(`${"=".repeat(50)}`);

  try {
    const { to, template, variables } = await req.json();

    if (!to || !template) {
      return new Response(
        JSON.stringify({ success: false, error: "to e template obrigatórios", version: FUNCTION_VERSION }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const phone = normalizePhone(to);
    console.log(`[REQUEST] Template: ${template} | Phone: ${phone.slice(0, 8)}***`);

    const result = await sendSms(phone, template, variables || {});

    // Log no banco
    try {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await supabase.from("notification_logs").insert({
        event_type: "pwa_notification",
        recipient: phone,
        channel: "sms",
        subject: `${template} notification`,
        status: result.success ? "success" : "failed",
        message_sid: result.messageId || null,
        error_message: result.error || null,
        metadata: { template, variables, provider: result.provider, version: FUNCTION_VERSION },
      });
    } catch (logErr) {
      console.warn("[LOG] Erro ao registrar:", logErr);
    }

    console.log(`[RESULTADO] ${result.success ? "✅ Sucesso" : "❌ Falha"}: ${result.error || "OK"}`);

    return new Response(
      JSON.stringify({
        ...result,
        channel: "sms",
        version: FUNCTION_VERSION,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e: any) {
    console.error(`[ERRO FATAL] ${e.message}`);
    return new Response(JSON.stringify({ success: false, error: e.message, version: FUNCTION_VERSION }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
