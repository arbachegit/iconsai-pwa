import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      salesmanId,
      leadName,
      leadEmail,
      leadPhone,
      presentationTopic,
      durationSeconds,
      sendSummaryEmail,
      sendSummaryWhatsApp,
      sessionId,
    } = await req.json();

    if (!leadName) {
      throw new Error("Nome do lead é obrigatório");
    }

    if (!presentationTopic) {
      throw new Error("Topic da apresentação é obrigatório");
    }

    console.log("Capturando lead:", {
      name: leadName,
      topic: presentationTopic,
      salesman: salesmanId,
    });

    const supabase = getSupabaseAdmin();

    // Buscar script para obter resumo
    const { data: script } = await supabase
      .from("presentation_scripts")
      .select("title, description, audio_script")
      .eq("topic", presentationTopic)
      .single();

    // Gerar resumo simples baseado no script
    const summary = script
      ? `${script.title}\n\n${script.description || ""}\n\nApresentação: ${script.audio_script?.substring(0, 200)}...`
      : `Apresentação sobre ${presentationTopic}`;

    // Inserir visita no CRM
    const { data: visit, error: insertError } = await supabase
      .from("crm_visits")
      .insert({
        salesman_id: salesmanId || null,
        presentation_topic: presentationTopic,
        lead_name: leadName,
        lead_email: leadEmail || null,
        lead_phone: leadPhone || null,
        duration_seconds: durationSeconds || 0,
        summary: summary,
        session_id: sessionId || null,
        ended_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Erro ao inserir visita:", insertError);
      throw new Error("Falha ao salvar lead");
    }

    console.log("Visita criada:", visit.id);

    // Enviar email se solicitado e se tiver email
    if (sendSummaryEmail && leadEmail) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        
        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            to: leadEmail,
            subject: `[KnowYOU] Resumo da apresentação: ${script?.title || presentationTopic}`,
            html: `
              <h1>Olá ${leadName}!</h1>
              <p>Obrigado por assistir à nossa apresentação.</p>
              <h2>${script?.title || presentationTopic}</h2>
              <p>${script?.description || ""}</p>
              <hr />
              <p><strong>Resumo:</strong></p>
              <p>${script?.audio_script || "Conteúdo não disponível"}</p>
              <hr />
              <p>Ficou com dúvidas? Entre em contato conosco!</p>
              <p>Equipe KnowYOU</p>
            `,
          }),
        });

        // Atualizar flag
        await supabase
          .from("crm_visits")
          .update({ summary_sent_email: true })
          .eq("id", visit.id);

        console.log("Email enviado para:", leadEmail);
      } catch (emailError) {
        console.error("Erro ao enviar email:", emailError);
        // Não falha a operação principal
      }
    }

    // Enviar WhatsApp se solicitado e se tiver telefone
    if (sendSummaryWhatsApp && leadPhone) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        
        await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            to: leadPhone,
            message: `Olá ${leadName}! 👋\n\nObrigado por assistir à apresentação "${script?.title || presentationTopic}" do KnowYOU!\n\n${script?.description || ""}\n\nFicou com dúvidas? Responda esta mensagem!\n\n- Equipe KnowYOU`,
          }),
        });

        // Atualizar flag
        await supabase
          .from("crm_visits")
          .update({ summary_sent_whatsapp: true })
          .eq("id", visit.id);

        console.log("WhatsApp enviado para:", leadPhone);
      } catch (whatsappError) {
        console.error("Erro ao enviar WhatsApp:", whatsappError);
        // Não falha a operação principal
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        visitId: visit.id,
        message: "Lead capturado com sucesso!",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro:", errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
