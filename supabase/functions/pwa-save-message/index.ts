// ============================================
// VERSAO: 1.0.1 | DEPLOY: 2026-01-09
// Salva mensagens de conversa do PWA
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

interface SaveMessageRequest {
  deviceId: string;
  moduleType: string;
  sessionId?: string;
  role: string;
  content: string;
  transcription?: string;
  audioUrl?: string;
  audioDuration?: number;
  city?: string;
  metadata?: Record<string, unknown>;
}

const VALID_ROLES = ["user", "assistant", "summary"];
const VALID_MODULES = ["world", "health", "ideas", "help"];

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Validate POST method
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Método não permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: SaveMessageRequest = await req.json();

    // Validate required fields
    if (!body.deviceId || !body.moduleType || !body.role || !body.content) {
      console.error("[pwa-save-message] Campos faltando:", { 
        deviceId: !!body.deviceId, 
        moduleType: !!body.moduleType, 
        role: !!body.role, 
        content: !!body.content 
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Campos obrigatórios: deviceId, moduleType, role, content" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    if (!VALID_ROLES.includes(body.role)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `role deve ser: ${VALID_ROLES.join(", ")}` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate moduleType
    if (!VALID_MODULES.includes(body.moduleType)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `moduleType deve ser: ${VALID_MODULES.join(", ")}` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = getSupabaseAdmin();
    let sessionId = body.sessionId;
    let conversationId: string;

    // Get or create conversation session
    if (sessionId) {
      const { data: existingSession, error: sessionError } = await supabase
        .from("pwa_conversation_sessions")
        .select("id")
        .eq("id", sessionId)
        .single();

      if (sessionError || !existingSession) {
        console.log("[pwa-save-message] Sessão não encontrada, criando nova:", sessionId);
        sessionId = undefined;
      } else {
        conversationId = existingSession.id;
      }
    }

    if (!sessionId) {
      const { data: newSession, error: createError } = await supabase
        .from("pwa_conversation_sessions")
        .insert({
          device_id: body.deviceId,
          module_type: body.moduleType,
          city: body.city || null,
        })
        .select("id")
        .single();

      if (createError || !newSession) {
        console.error("[pwa-save-message] Erro ao criar sessão:", createError);
        throw new Error("Falha ao criar sessão de conversa");
      }

      sessionId = newSession.id;
      conversationId = newSession.id;
      console.log("[pwa-save-message] Nova sessão criada:", sessionId);
    }

    // Save message
  const { data: message, error: messageError } = await supabase
    .from("pwa_conversation_messages")
    .insert({
      session_id: sessionId,
      device_id: body.deviceId,
      role: body.role,
      content: body.content,
      transcription: body.transcription || null,
      audio_url: body.audioUrl || null,
      audio_duration: body.audioDuration || null,
    })
    .select("id, created_at")
    .single();

    if (messageError || !message) {
      console.error("[pwa-save-message] Erro ao salvar mensagem:", messageError);
      throw new Error("Falha ao salvar mensagem");
    }

    // Update session timestamp
    await supabase
      .from("pwa_conversation_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    console.log(`[pwa-save-message] ✓ Mensagem ${message.id} salva na sessão ${sessionId}`);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: message.id,
        conversationId: conversationId!,
        sessionId: sessionId,
        createdAt: message.created_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[pwa-save-message] Erro:", error.message || error);

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Erro interno do servidor" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
