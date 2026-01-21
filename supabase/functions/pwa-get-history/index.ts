// VERSAO: 1.0.1 | DEPLOY: 2026-01-09
// Busca histórico de mensagens do PWA

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

interface GetHistoryRequest {
  deviceId: string;
  moduleType?: string;
  sessionId?: string;
  limit?: number;
  offset?: number;
}

interface MessageResponse {
  id: string;
  role: string;
  content: string;
  transcription: string | null;
  audioUrl: string | null;
  audioDuration: number | null;
  timestamp: string;
  sessionId: string;
  city: string | null;
  moduleType: string;
}

const VALID_MODULES = ["world", "health", "ideas", "help"];

serve(async (req: Request) => {
  // 1. Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // 2. Validate POST method
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Método não permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // 3. Parse and validate request body
    const body: GetHistoryRequest = await req.json();

    if (!body.deviceId) {
      return new Response(
        JSON.stringify({ success: false, error: "deviceId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate moduleType if provided
    if (body.moduleType && !VALID_MODULES.includes(body.moduleType)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "moduleType deve ser: world, health, ideas ou help"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const limit = Math.min(body.limit ?? 100, 500); // Cap at 500
    const offset = body.offset ?? 0;

    const supabase = getSupabaseAdmin();

    // 4. Build sessions query
    let sessionsQuery = supabase
      .from("pwa_conversation_sessions")
      .select("id, module_type, city")
      .eq("device_id", body.deviceId);

    if (body.moduleType) {
      sessionsQuery = sessionsQuery.eq("module_type", body.moduleType);
    }

    if (body.sessionId) {
      sessionsQuery = sessionsQuery.eq("id", body.sessionId);
    }

    const { data: sessions, error: sessionsError } = await sessionsQuery;

    if (sessionsError) {
      console.error("[pwa-get-history] Erro ao buscar sessões:", sessionsError);
      throw new Error("Falha ao buscar sessões");
    }

    // Return empty if no sessions found
    if (!sessions || sessions.length === 0) {
      console.log(`[pwa-get-history] Nenhuma sessão encontrada para device ${body.deviceId}`);
      return new Response(
        JSON.stringify({
          success: true,
          messages: [],
          stats: { total: 0, user: 0, assistant: 0, summary: 0 },
          pagination: { limit, offset, hasMore: false }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create lookup map for session info
    const sessionMap = new Map(
      sessions.map(s => [s.id, { moduleType: s.module_type, city: s.city }])
    );
    const sessionIds = sessions.map(s => s.id);

    // 5. Get total count
    const { count: totalCount, error: countError } = await supabase
      .from("pwa_conversation_messages")
      .select("id", { count: "exact", head: true })
      .in("session_id", sessionIds);

    if (countError) {
      console.error("[pwa-get-history] Erro ao contar mensagens:", countError);
    }

    // 6. Get messages with pagination
    const { data: messages, error: messagesError } = await supabase
      .from("pwa_conversation_messages")
      .select("id, session_id, role, content, transcription, audio_url, audio_duration, created_at")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (messagesError) {
      console.error("[pwa-get-history] Erro ao buscar mensagens:", messagesError);
      throw new Error("Falha ao buscar mensagens");
    }

    // 7. Calculate stats by role
    const { data: roleCounts, error: roleError } = await supabase
      .from("pwa_conversation_messages")
      .select("role")
      .in("session_id", sessionIds);

    const stats = {
      total: totalCount ?? 0,
      user: 0,
      assistant: 0,
      summary: 0
    };

    if (!roleError && roleCounts) {
      for (const msg of roleCounts) {
        if (msg.role === "user") stats.user++;
        else if (msg.role === "assistant") stats.assistant++;
        else if (msg.role === "summary") stats.summary++;
      }
    }

    // 8. Format response
    const formattedMessages: MessageResponse[] = (messages ?? []).map(msg => {
      const sessionInfo = sessionMap.get(msg.session_id);
      return {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        transcription: msg.transcription,
        audioUrl: msg.audio_url,
        audioDuration: msg.audio_duration,
        timestamp: msg.created_at,
        sessionId: msg.session_id,
        city: sessionInfo?.city || null,
        moduleType: sessionInfo?.moduleType || "world"
      };
    });

    const hasMore = (totalCount ?? 0) > offset + limit;

    console.log(`[pwa-get-history] Retornando ${formattedMessages.length} mensagens para device ${body.deviceId}`);

    // 9. Return success response
    return new Response(
      JSON.stringify({
        success: true,
        messages: formattedMessages,
        stats,
        pagination: { limit, offset, hasMore }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro interno do servidor";
    console.error("[pwa-get-history] Erro:", errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
