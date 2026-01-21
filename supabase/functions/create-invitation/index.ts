// ============================================
// VERSAO: 3.8.0 | DEPLOY: 2026-01-14
// FIX: URL atualizada para pwa.iconsai.ai
// ============================================

const FUNCTION_VERSION = "3.8.0";
const SITE_URL = "https://pwa.iconsai.ai";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface CreateInvitationRequest {
  name: string;
  email: string;
  phone?: string;
  role: "user" | "admin" | "superadmin";
  sendViaEmail: boolean;
  sendViaWhatsapp: boolean;
  hasPlatformAccess: boolean;
  hasAppAccess: boolean;
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
  console.log(`[CREATE-INVITATION v${FUNCTION_VERSION}] ${new Date().toISOString()}`);
  console.log(`${"=".repeat(50)}`);

  const results: SendResult[] = [];

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Configuração do servidor incompleta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: CreateInvitationRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error_code: "VALIDATION_ERROR", error: "Corpo da requisição inválido" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { name, email, phone, role, sendViaEmail, sendViaWhatsapp, hasPlatformAccess, hasAppAccess } = body;

    console.log(`[REQUEST] Nome: ${name} | Email: ${email} | Phone: ${phone ? "***" + phone.slice(-4) : "N/A"}`);

    // Validações
    if (!name || !email) {
      return new Response(
        JSON.stringify({ success: false, error_code: "VALIDATION_ERROR", error: "Nome e email são obrigatórios" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!hasPlatformAccess && !hasAppAccess) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "VALIDATION_ERROR",
          error: "Selecione pelo menos um tipo de acesso",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // PWA-only requer telefone
    let finalSendViaEmail = sendViaEmail;
    let finalSendViaWhatsapp = sendViaWhatsapp;

    if (hasAppAccess && !hasPlatformAccess) {
      if (!phone) {
        return new Response(
          JSON.stringify({
            success: false,
            error_code: "PHONE_REQUIRED_FOR_PWA",
            error: "Telefone obrigatório para APP",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      finalSendViaWhatsapp = true;
      finalSendViaEmail = false;
      console.log("[CONFIG] PWA-only: Forçando SMS, desabilitando Email");
    }

    // Verificar duplicados
    const { data: existingInvite } = await supabase
      .from("user_invitations")
      .select("id")
      .eq("email", email.toLowerCase())
      .in("status", ["pending", "form_submitted"])
      .maybeSingle();

    if (existingInvite) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "DUPLICATE_INVITE",
          error: "Já existe um convite pendente para este email",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Gerar token
    const tokenArray = new Uint8Array(32);
    crypto.getRandomValues(tokenArray);
    const token = Array.from(tokenArray)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Criar convite
    const { data: invitation, error: insertError } = await supabase
      .from("user_invitations")
      .insert({
        token,
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        role,
        send_via_email: finalSendViaEmail,
        send_via_whatsapp: finalSendViaWhatsapp,
        expires_at: expiresAt.toISOString(),
        status: "pending",
        has_platform_access: hasPlatformAccess,
        has_app_access: hasAppAccess,
        pwa_access: hasAppAccess ? ["economia", "health", "ideias"] : [],
      })
      .select()
      .single();

    if (insertError) {
      console.error("[DB] Erro ao inserir:", insertError);
      return new Response(JSON.stringify({ error: "Erro ao criar convite: " + insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`✅ Convite criado: ${invitation.id}`);

    // URLs
    const platformUrl = `${SITE_URL}/invite/${token}`;
    const appUrlLong = `${SITE_URL}/pwa-register/${token}`;

    // ENCURTAR URL DO APP VIA IS.GD
    const appUrlShort = await shortenUrl(appUrlLong);
    console.log(`📲 URL original: ${appUrlLong}`);
    console.log(`📲 URL encurtada: ${appUrlShort}`);

    const inviteUrl = hasAppAccess && !hasPlatformAccess ? appUrlLong : platformUrl;
    const firstName = getFirstName(name);

    // Email para Plataforma
    if (hasPlatformAccess && finalSendViaEmail) {
      const hasResendKey = !!Deno.env.get("RESEND_API_KEY");

      if (hasResendKey) {
        try {
          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; text-align: center;">
                <h1>🖥️ Convite KnowYOU Plataforma</h1>
              </div>
              <div style="padding: 30px; background: #f8fafc;">
                <p>Olá <strong>${name}</strong>,</p>
                <p>Você foi convidado para a KnowYOU Plataforma!</p>
                <p style="text-align: center;">
                  <a href="${platformUrl}" style="background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block;">Acessar Plataforma</a>
                </p>
                <p style="color: #64748b; text-align: center;">⏰ Expira em 7 dias</p>
              </div>
            </body>
            </html>
          `;

          const { error: emailError } = await supabase.functions.invoke("send-email", {
            body: { to: email, subject: "🖥️ Convite KnowYOU Plataforma", body: emailHtml },
          });

          results.push({ channel: "email", product: "platform", success: !emailError, error: emailError?.message });
          console.log(`📧 Email: ${emailError ? "❌ " + emailError.message : "✅ Enviado"}`);
        } catch (e: any) {
          results.push({ channel: "email", product: "platform", success: false, error: e.message });
        }
      } else {
        console.warn("⚠️ RESEND_API_KEY não configurada");
        results.push({
          channel: "email",
          product: "platform",
          success: false,
          error: "RESEND_API_KEY não configurada",
        });
      }
    }

    // SMS para APP
    if (hasAppAccess && phone) {
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
        console.log(`📱 SMS: ${success ? "✅ Enviado" : "❌ " + (notifError?.message || notifResult?.error)}`);
      } catch (e: any) {
        results.push({ channel: "sms", product: "app", success: false, error: e.message });
      }
    }

    // SMS informativo para Plataforma (se não tem APP)
    if (hasPlatformAccess && !hasAppAccess && phone) {
      try {
        const smsMsg = `KnowYOU: Ola ${firstName}! Enviamos email com convite. Acesse pelo computador.`;
        await supabase.functions.invoke("send-sms", { body: { phoneNumber: phone, message: smsMsg } });
        results.push({ channel: "sms", product: "platform_info", success: true });
        console.log("📱 SMS info plataforma: ✅ Enviado");
      } catch (e: any) {
        results.push({ channel: "sms", product: "platform_info", success: false, error: e.message });
      }
    }

    // Log
    await supabase.from("notification_logs").insert({
      event_type: "user_invitation_created",
      channel: "system",
      recipient: email,
      subject: "Convite criado",
      status: results.some((r) => r.success) ? "success" : "failed",
      metadata: { token, results, shortUrl: appUrlShort, version: FUNCTION_VERSION },
    });

    const successCount = results.filter((r) => r.success).length;
    console.log(`\n📊 Resultados: ${successCount}/${results.length} sucesso`);
    console.log(`${"=".repeat(50)}\n`);

    return new Response(
      JSON.stringify({
        success: true,
        inviteUrl,
        invitation: { id: invitation.id, token, expiresAt: expiresAt.toISOString() },
        sendResults: results,
        shortUrl: appUrlShort,
        version: FUNCTION_VERSION,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("❌ FATAL ERROR:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
