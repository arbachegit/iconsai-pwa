// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface AlertRequest {
  session_id: string;
  sentiment_label: string;
  sentiment_score: number;
  last_messages: Array<{ role: string; content: string }>;
  alert_email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, sentiment_label, sentiment_score, last_messages, alert_email }: AlertRequest = await req.json();

    console.log(`[ALERT] Negative sentiment detected: ${sentiment_label} (${sentiment_score}) for session ${session_id}`);
    console.log(`[ALERT] Would send email to: ${alert_email}`);

    // Montar resumo da conversa (últimas 3 mensagens)
    const messagesPreview = last_messages
      .slice(-3)
      .map((m) => `${m.role === "user" ? "👤 Usuário" : "🤖 KnowYOU"}: ${m.content}`)
      .join("\n\n");

    console.log('[ALERT] Conversation preview:', messagesPreview);

    // TODO: Integrate with Resend when properly configured
    // For now, just log the alert
    console.log(`[ALERT] Email would be sent with subject: 🚨 Alerta: Conversa com Sentimento Negativo (${session_id})`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Alert logged (email integration pending)' 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[ALERT] Error processing alert:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
