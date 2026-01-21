// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== SEND-EMAIL START ===");

  try {
    const { to, subject, body, replyTo }: EmailRequest = await req.json();

    // Validações
    if (!to || !subject || !body) {
      console.error("❌ Missing required fields");
      return new Response(
        JSON.stringify({ success: false, error: "Campos obrigatórios: to, subject, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      console.error("❌ Invalid email format:", to);
      return new Response(
        JSON.stringify({ success: false, error: "Email inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (subject.length > 200) {
      console.error("❌ Subject too long");
      return new Response(
        JSON.stringify({ success: false, error: "Assunto muito longo (máximo 200 caracteres)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.length > 50000) {
      console.error("❌ Body too long");
      return new Response(
        JSON.stringify({ success: false, error: "Corpo muito longo (máximo 50000 caracteres)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📧 Sending to: ${to}`);
    console.log(`📋 Subject: ${subject.substring(0, 50)}...`);

    // Verificar API Key
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    console.log("🔑 RESEND_API_KEY configured:", !!RESEND_API_KEY);
    
    if (!RESEND_API_KEY) {
      console.error("❌ RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "RESEND_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Preparar payload
    const emailPayload: any = {
      from: "KnowYOU <noreply@knowyou.app>",
      to: [to],
      subject: subject,
      html: body,
    };

    if (replyTo && emailRegex.test(replyTo)) {
      emailPayload.reply_to = replyTo;
      console.log(`↩️ Reply-to: ${replyTo}`);
    }

    console.log("📤 Sending via Resend...");

    // Enviar
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Resend API error:", {
        status: response.status,
        error: data
      });
      
      // Mensagens de erro amigáveis
      let friendlyError = data.message || `Erro Resend: ${response.status}`;
      
      if (data.message?.includes("domain")) {
        friendlyError = "Domínio não verificado no Resend. Verifique knowyou.app no painel do Resend.";
      } else if (data.message?.includes("API key")) {
        friendlyError = "API Key do Resend inválida ou expirada.";
      } else if (data.message?.includes("rate limit")) {
        friendlyError = "Limite de envios atingido. Tente novamente em alguns minutos.";
      }
      
      return new Response(
        JSON.stringify({ success: false, error: friendlyError }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Email sent: ${data?.id}`);
    console.log("=== SEND-EMAIL END ===");

    return new Response(
      JSON.stringify({ success: true, id: data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("=== SEND-EMAIL FATAL ERROR ===", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
