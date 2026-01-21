// ============================================
// VERSAO: 3.2.0 | DEPLOY: 2026-01-12
// FIX: Mensagem de código com nome do usuário
// ============================================

const FUNCTION_VERSION = "3.2.0";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface SendVerificationRequest {
  token: string;
  phone: string;
  addressCep: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement?: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  password: string;
  verificationMethod: "email" | "sms" | "whatsapp";
}

function getFirstName(fullName: string): string {
  return (fullName || "Voce").split(" ")[0] || "Voce";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`[SEND-INVITATION-VERIFICATION v${FUNCTION_VERSION}] ${new Date().toISOString()}`);
  console.log(`${"=".repeat(50)}`);

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

    let body: SendVerificationRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error_code: "VALIDATION_ERROR", error: "Corpo da requisição inválido" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const {
      token,
      phone,
      addressCep,
      addressStreet,
      addressNumber,
      addressComplement,
      addressNeighborhood,
      addressCity,
      addressState,
      password,
      verificationMethod,
    } = body;

    console.log(`[REQUEST] Token: ${token?.slice(0, 8)}... | Método: ${verificationMethod}`);

    // Validações
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error_code: "VALIDATION_ERROR", error: "Token é obrigatório" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!verificationMethod || !["email", "sms", "whatsapp"].includes(verificationMethod)) {
      return new Response(
        JSON.stringify({ success: false, error_code: "VALIDATION_ERROR", error: "Método de verificação inválido" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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

    console.log(`[CONVITE] Nome: ${invitation.name} | Email: ${invitation.email}`);

    if (invitation.status === "completed") {
      return new Response(
        JSON.stringify({ success: false, error_code: "INVITE_USED", error: "Este convite já foi utilizado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error_code: "INVITE_EXPIRED", error: "Este convite expirou" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validar senha
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!password || !passwordRegex.test(password)) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "VALIDATION_ERROR",
          error: "Senha deve ter 8+ chars, maiúscula, minúscula e número",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validar telefone para SMS/WhatsApp
    if ((verificationMethod === "whatsapp" || verificationMethod === "sms") && !phone) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "PHONE_REQUIRED",
          error: "Telefone obrigatório para verificação via SMS/WhatsApp",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Gerar código de 6 dígitos
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiresAt = new Date();
    codeExpiresAt.setMinutes(codeExpiresAt.getMinutes() + 2);

    console.log("🔐 Código gerado, expira em 2 min");

    // Atualizar convite com dados do formulário
    const { error: updateError } = await supabase
      .from("user_invitations")
      .update({
        phone,
        address_cep: addressCep,
        address_street: addressStreet,
        address_number: addressNumber,
        address_complement: addressComplement || null,
        address_neighborhood: addressNeighborhood,
        address_city: addressCity,
        address_state: addressState,
        verification_code: verificationCode,
        verification_method: verificationMethod,
        verification_code_expires_at: codeExpiresAt.toISOString(),
        verification_attempts: 0,
        status: "form_submitted",
        updated_at: new Date().toISOString(),
      })
      .eq("token", token);

    if (updateError) {
      console.error("[DB] Erro ao atualizar:", updateError);
      return new Response(JSON.stringify({ error: "Erro ao salvar dados: " + updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // EXTRAIR PRIMEIRO NOME PARA MENSAGEM PERSONALIZADA
    const firstName = getFirstName(invitation.name);
    console.log(`[NOME] Primeiro nome: ${firstName}`);

    let sendResult = { success: false, error: "", method: verificationMethod };

    // ENVIO DO CÓDIGO
    if (verificationMethod === "email") {
      console.log("📧 Enviando código por EMAIL");
      try {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; text-align: center;">
              <h1>🔐 Código de Verificação</h1>
            </div>
            <div style="padding: 30px; background: #f8fafc; text-align: center;">
              <p>Olá <strong>${invitation.name}</strong>,</p>
              <p>Seu código de verificação:</p>
              <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #6366f1; background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                ${verificationCode}
              </div>
              <p style="color: #dc2626;">⏰ Expira em 2 minutos</p>
            </div>
          </body>
          </html>
        `;

        const { error: emailError } = await supabase.functions.invoke("send-email", {
          body: { to: invitation.email, subject: "🔐 Código de Verificação - KnowYOU", body: emailHtml },
        });

        sendResult = { success: !emailError, error: emailError?.message || "", method: "email" };
        console.log(`📧 Email: ${emailError ? "❌ " + emailError.message : "✅ Enviado"}`);
      } catch (e: any) {
        sendResult = { success: false, error: e.message, method: "email" };
      }
    } else if (verificationMethod === "sms" || verificationMethod === "whatsapp") {
      // SMS/WhatsApp - MENSAGEM COM NOME PERSONALIZADO
      console.log(`📱 Enviando código por SMS para ${firstName}`);

      try {
        // ✨ MENSAGEM PERSONALIZADA COM NOME ✨
        const smsMessage = `KnowYOU: Ola ${firstName}! Codigo: ${verificationCode}. Valido 2min.`;
        console.log(`[SMS] Mensagem (${smsMessage.length} chars): ${smsMessage}`);

        const { data: smsData, error: smsError } = await supabase.functions.invoke("send-sms", {
          body: {
            phoneNumber: phone,
            message: smsMessage,
            eventType: "verification_code",
          },
        });

        if (smsError || smsData?.error) {
          sendResult = { success: false, error: smsError?.message || smsData?.error, method: "sms" };
          console.log(`📱 SMS: ❌ ${smsError?.message || smsData?.error}`);
        } else {
          sendResult = { success: true, error: "", method: "sms" };
          console.log("📱 SMS: ✅ Enviado");
        }
      } catch (e: any) {
        sendResult = { success: false, error: e.message, method: "sms" };
      }
    }

    // Falha no envio
    if (!sendResult.success) {
      console.error("❌ Falha ao enviar código:", sendResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "SEND_FAILED",
          error: `Erro ao enviar código: ${sendResult.error}`,
          details: "Tente outro método de verificação.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Log
    await supabase.from("notification_logs").insert({
      event_type: "user_invitation_form_submitted",
      channel: sendResult.method,
      recipient: verificationMethod === "email" ? invitation.email : phone,
      subject: "Código de verificação enviado",
      status: "success",
      metadata: { token: token.slice(0, 8), verificationMethod, firstName, version: FUNCTION_VERSION },
    });

    const maskedDestination =
      verificationMethod === "email" ? `***@${invitation.email.split("@")[1]}` : `****${phone.slice(-4)}`;

    console.log(`\n✅ SUCESSO - Código enviado para ${maskedDestination}`);
    console.log(`${"=".repeat(50)}\n`);

    return new Response(
      JSON.stringify({
        success: true,
        maskedDestination,
        expiresAt: codeExpiresAt.toISOString(),
        method: sendResult.method,
        version: FUNCTION_VERSION,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("❌ FATAL ERROR:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
