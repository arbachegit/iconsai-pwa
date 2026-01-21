type Message = { 
  role: "user" | "assistant"; 
  content: string;
  fileData?: {
    data: any[];
    fileName: string;
    columns: string[];
    totalRecords?: number;
  };
};

export interface AgentConfig {
  systemPrompt?: string | null;
  maieuticLevel?: string | null;
  regionalTone?: string | null;
  ragCollection?: string;
  allowedTags?: string[] | null;
  forbiddenTags?: string[] | null;
  dashboardContext?: string;
}

interface StreamChatOptions {
  messages: Message[];
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError?: (error: Error) => void;
  chatType?: "health" | "study";
  region?: string;
  agentConfig?: AgentConfig;
}

export async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
  chatType = "health",
  region,
  agentConfig,
}: StreamChatOptions) {
  // Use the new unified chat-router endpoint
  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-router`;

  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ 
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
          fileData: m.fileData
        })),
        chatType,
        region,
        agentConfig,
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        throw new Error("Limite de uso excedido. Tente novamente em instantes.");
      }
      if (resp.status === 402) {
        throw new Error("Créditos insuficientes no workspace Lovable.");
      }
      throw new Error("Falha ao iniciar conversa com o assistente");
    }

    if (!resp.body) {
      throw new Error("Resposta sem conteúdo");
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Flush buffer final
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          // Ignora fragmentos parciais
        }
      }
    }

    onDone();
  } catch (error) {
    console.error("Erro no streaming:", error);
    if (onError) {
      onError(error instanceof Error ? error : new Error("Erro desconhecido"));
    }
  }
}

export function extractSuggestions(text: string): string[] {
  const match = text.match(/SUGESTÕES:\s*(\[.*?\])/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {
      return [];
    }
  }
  return [];
}

export function removeSuggestionsFromText(text: string): string {
  return text.replace(/\n*SUGESTÕES:\s*\[.*?\]\s*$/g, "").trim();
}
