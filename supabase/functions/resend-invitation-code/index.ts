// ============================================
// VERSAO: 3.8.0 | DEPLOY: 2026-01-14
// FIX: URL atualizada para pwa.iconsai.ai
// ============================================

const FUNCTION_VERSION = "3.8.0";
const SITE_URL = "https://pwa.iconsai.ai";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface ResendRequest {
  token: string;
  product?: "platform" | "app" | "both";
}

interface SendResult {
  channel: string;
  product: string;
  success: boolean;
  error?: string;
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

  return longUrl;
}

function getFirstName(fullName: string): string {
  return (fullName || "Voce").split(" ")[0] || "Voce";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`[RESEND-INVITATION-CODE v${FUNCTION_VERSION}] ${new Date().toISOString()}`);
  console.log(`${"=".repeat(50)}`);

  const results: SendResult[] = [];

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, product = "both" }: ResendRequest = await req.json();

    console.log(`[REQUEST] Token: ${token?.slice(0, 8)}... | Produto: ${product}`);

    // Buscar convite
    const { data: invitation, error: fetchError } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchError || !invitation) {
      return new Response(
        JSON.stringify({ success: false, error_code: "INVALID_TOKEN", error: "Convite não encontrado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (invitation.status === "completed") {
      return new Response(
        JSON.stringify({ success: false, error_code: "INVITE_USED", error: "Este convite já foi utilizado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Rate limit
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    if (invitation.last_resend_at && new Date(invitation.last_resend_at) > oneHourAgo) {
      if ((invitation.resend_count || 0) >= 10) {
        return new Response(
          JSON.stringify({
            success: false,
            error_code: "RATE_LIMIT",
            error: "Limite de reenvios atingido. Tente em 1 hora.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // URLs
    const platformUrl = `${SITE_URL}/invite/${token}`;
    const appUrlLong = `${SITE_URL}/pwa-register/${token}`;

    // ENCURTAR URL VIA IS.GD
    const appUrlShort = await shortenUrl(appUrlLong);
    console.log(`📲 URL encurtada: ${appUrlShort}`);

    const { name, email, phone, has_platform_access, has_app_access } = invitation;
    const firstName = getFirstName(name);

    const shouldSendPlatform = (product === "platform" || product === "both") && has_platform_access;
    const shouldSendApp = (product === "app" || product === "both") && has_app_access;

    console.log(
      `[CONFIG] Nome: ${firstName} | Plataforma: ${shouldSendPlatform} | APP: ${shouldSendApp} | Phone: ${phone ? "Sim" : "Não"}`,
    );

    // PLATAFORMA: Email + SMS informativo
    if (shouldSendPlatform) {
      const hasResendKey = !!Deno.env.get("RESEND_API_KEY");

      if (hasResendKey) {
        try {
          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; text-align: center;">
                <h1>🖥️ Lembrete: KnowYOU Plataforma</h1>
              </div>
              <div style="padding: 30px; background: #f8fafc;">
                <p>Olá <strong>${name}</strong>,</p>
                <p>Você ainda não completou seu cadastro.</p>
                <p style="text-align: center;">
                  <a href="${platformUrl}" style="background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block;">Completar Cadastro</a>
                </p>
                <p style="color: #64748b; text-align: center;">⏰ Expira: ${new Date(invitation.expires_at).toLocaleDateString("pt-BR")}</p>
              </div>
            </body>
            </html>
          `;

          const { error: emailError } = await supabase.functions.invoke("send-email", {
            body: { to: email, subject: "🖥️ Lembrete: Complete seu cadastro", body: emailHtml },
          });

          results.push({ channel: "email", product: "platform", success: !emailError, error: emailError?.message });
          console.log(`📧 Email: ${emailError ? "❌ " + emailError.message : "✅ Enviado"}`);
        } catch (e: any) {
          results.push({ channel: "email", product: "platform", success: false, error: e.message });
        }
      }

      // SMS informativo (só se não tem APP)
      if (phone && !has_app_access) {
        try {
          const smsMsg = `KnowYOU: Ola ${firstName}! Reenviamos email com convite. Acesse pelo computador.`;
          await supabase.functions.invoke("send-sms", { body: { phoneNumber: phone, message: smsMsg } });
          results.push({ channel: "sms", product: "platform_info", success: true });
          console.log("📱 SMS info: ✅ Enviado");
        } catch (e: any) {
          results.push({ channel: "sms", product: "platform_info", success: false, error: e.message });
        }
      }
    }

    // APP: SMS com URL encurtada
    if (shouldSendApp) {
      if (!phone) {
        results.push({ channel: "sms", product: "app", success: false, error: "Telefone obrigatório para APP" });
      } else {
        try {
          console.log(`📱 Enviando SMS para ${firstName}: ${appUrlShort}`);

          const { data: notifResult, error: notifError } = await supabase.functions.invoke("send-pwa-notification", {
            body: {
              to: phone,
              template: "invitation",
              variables: {
                "1": firstName,
                "2": "Equipe KnowYOU",
                "3": appUrlShort, // URL JÁ ENCURTADA
              },
              channel: "sms",
            },
          });

          const success = !notifError && notifResult?.success;
          results.push({
            channel: notifResult?.channel || "sms",
            product: "app",
            success,
            error: notifError?.message || notifResult?.error,
          });
          console.log(`📱 SMS APP: ${success ? "✅ Enviado" : "❌ " + (notifError?.message || notifResult?.error)}`);
        } catch (e: any) {
          results.push({ channel: "sms", product: "app", success: false, error: e.message });
        }
      }
    }

    // Atualizar tracking
    await supabase
      .from("user_invitations")
      .update({
        resend_count: (invitation.resend_count || 0) + 1,
        last_resend_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("token", token);

    const successCount = results.filter((r) => r.success).length;
    console.log(`\n📊 Resultados: ${successCount}/${results.length} sucesso`);

    // Log
    await supabase.from("notification_logs").insert({
      event_type: "invitation_resend_summary",
      channel: "system",
      recipient: email,
      subject: `Reenvio: ${product}`,
      status: successCount > 0 ? "success" : "failed",
      metadata: { token, product, results, shortUrl: appUrlShort, version: FUNCTION_VERSION },
    });

    console.log(`${"=".repeat(50)}\n`);

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        results: results.map((r) => `${r.success ? "✅" : "❌"} ${r.channel}/${r.product}`),
        remainingResends: 10 - ((invitation.resend_count || 0) + 1),
        details: results,
        shortUrl: appUrlShort,
        version: FUNCTION_VERSION,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("❌ FATAL ERROR:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
