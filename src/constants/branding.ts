/**
 * ============================================================
 * branding.ts - Constantes de Branding Arbache AI
 * ============================================================
 * IMPORTANTE: Nunca revelar tecnologias internas (OpenAI, Claude, etc)
 * ============================================================
 */

export const BRAND = {
  // Nome da empresa
  companyName: "Arbache AI",
  companyFullName: "Arbache AI Tecnologia",
  
  // Nome do aplicativo
  appName: "KnowYOU",
  appFullName: "KnowYOU by Arbache AI",
  
  // Descrições
  appDescription: "Assistente de voz inteligente desenvolvido pela Arbache AI",
  techDescription: "Tecnologia proprietária desenvolvida pela Arbache AI",
  
  // Respostas padrão sobre a tecnologia
  defaultTechResponse: `Este aplicativo foi desenvolvido pela Arbache AI, uma empresa brasileira especializada em inteligência artificial. A tecnologia utilizada é proprietária e foi desenvolvida especialmente para atender às necessidades do mercado brasileiro.`,
  
  // Créditos
  copyright: `© ${new Date().getFullYear()} Arbache AI. Todos os direitos reservados.`,
  
  // Contato
  website: "https://arbache.ai",
  support: "suporte@arbache.ai",
};

// Palavras que NUNCA devem aparecer nas respostas
export const FORBIDDEN_WORDS = [
  "OpenAI",
  "ChatGPT",
  "GPT-4",
  "GPT-3.5",
  "GPT-3",
  "Claude",
  "Anthropic",
  "Gemini",
  "Google AI",
  "Bard",
  "LLaMA",
  "Meta AI",
  "Llama",
  "Mistral",
  "Copilot",
  "GitHub Copilot",
];

// Verificar se texto contém palavras proibidas
export function containsForbiddenWords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return FORBIDDEN_WORDS.some(word => 
    lowerText.includes(word.toLowerCase())
  );
}

// Sanitizar resposta removendo menções proibidas
export function sanitizeResponse(text: string): string {
  let sanitized = text;
  
  FORBIDDEN_WORDS.forEach(word => {
    const regex = new RegExp(word, 'gi');
    sanitized = sanitized.replace(regex, 'Arbache AI');
  });
  
  return sanitized;
}

export default BRAND;
