// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface ClassificationResult {
  detectedCategories: {
    category_key: string;
    category_name: string;
    confidence: number;
    triggers: string[];
  }[];
  combinationValid: boolean;
  injectedPrompt: string;
  injectedAntiprompt: string;
  behavioralInstructions: string;
  cognitiveMode: "normal" | "maieutic" | "simplified";
}

// Mathematical/logical triggers
const MATH_TRIGGERS = [
  /\d+\s*[\+\-\*\/\\^]\s*\d+/i, // Operations
  /calcul[aeo]/i,
  /compar[aeo]/i,
  /gráfico|grafico/i,
  /estatística|estatistica/i,
  /porcentagem|percentual/i,
  /média|media|mediana/i,
  /soma|subtr|multiplic|divid/i,
  /fórmula|formula/i,
  /equação|equacao/i,
  /variáve[il]|variave/i,
  /integral|derivada/i,
  /logaritmo|exponencial/i,
  /ranking|rank/i,
  /tabela.*dados|dados.*tabela/i,
];

// Regional/slang triggers (Brazilian Portuguese variants)
const REGIONAL_TRIGGERS = {
  sudeste_sp: [/mano|véi|vei|truta|firmeza|suave|da hora|mó|tipo assim/i],
  sudeste_rj: [/carai|caraca|carioca|partiu|fechou|é nóis|parada/i],
  nordeste: [/oxe|oxente|arretado|massa|bichim|visse|abestado|égua/i],
  sul: [/bah|tchê|guri|guria|tri|barbaridade|capaz/i],
  norte: [/maninho|égua|papai|parente|meu rei/i],
};

// Superficiality level triggers
const HIGH_SUPERFICIAL_TRIGGERS = [
  /^o que é\s/i,
  /^me fala sobre/i,
  /^como funciona/i,
  /^explica\s/i,
  /^qual\s+[aeo]\s/i,
];

const MEDIUM_SUPERFICIAL_TRIGGERS = [
  /como (eu )?(posso|devo|consigo)/i,
  /qual (é )?a (melhor|diferença)/i,
  /por que\s/i,
  /quando (devo|usar)/i,
];

const DETERMINISTIC_TRIGGERS = [
  /\?$/,
  /especificamente/i,
  /exatamente/i,
  /passo a passo/i,
  /configure|configur/i,
  /instale|instal/i,
  /implemente|implement/i,
  /código|code/i,
];

// Cognitive capacity indicators
const LOW_COGNITION_INDICATORS = [
  /não entendi|nao entendi/i,
  /pode repetir/i,
  /não sei nada|nao sei nada/i,
  /sou leigo/i,
  /explica de novo/i,
  /me perdi/i,
  /confuso|confusa/i,
  /hã\?|hein\?|oi\?/i,
];

function calculateWordCount(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

function detectMath(message: string): { detected: boolean; triggers: string[] } {
  const triggers: string[] = [];
  for (const pattern of MATH_TRIGGERS) {
    const match = message.match(pattern);
    if (match) {
      triggers.push(match[0]);
    }
  }
  return { detected: triggers.length > 0, triggers };
}

function detectRegional(message: string): { detected: boolean; triggers: string[]; region?: string } {
  const triggers: string[] = [];
  let detectedRegion: string | undefined;
  
  for (const [region, patterns] of Object.entries(REGIONAL_TRIGGERS)) {
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        triggers.push(match[0]);
        detectedRegion = region;
      }
    }
  }
  
  return { detected: triggers.length > 0, triggers, region: detectedRegion };
}

function detectSuperficiality(message: string): { level: "high" | "medium" | "deterministic"; triggers: string[] } {
  const wordCount = calculateWordCount(message);
  const triggers: string[] = [];
  
  // Check for deterministic first (most specific)
  for (const pattern of DETERMINISTIC_TRIGGERS) {
    const match = message.match(pattern);
    if (match) {
      triggers.push(match[0]);
    }
  }
  
  if (triggers.length >= 2 || (wordCount > 15 && triggers.length >= 1)) {
    return { level: "deterministic", triggers };
  }
  
  // Check for high superficiality
  triggers.length = 0;
  for (const pattern of HIGH_SUPERFICIAL_TRIGGERS) {
    const match = message.match(pattern);
    if (match) {
      triggers.push(match[0]);
    }
  }
  
  if (triggers.length > 0 || wordCount < 6) {
    return { level: "high", triggers: triggers.length > 0 ? triggers : ["short message"] };
  }
  
  // Check for medium superficiality
  triggers.length = 0;
  for (const pattern of MEDIUM_SUPERFICIAL_TRIGGERS) {
    const match = message.match(pattern);
    if (match) {
      triggers.push(match[0]);
    }
  }
  
  if (triggers.length > 0) {
    return { level: "medium", triggers };
  }
  
  // Default to medium if nothing else matches
  return { level: "medium", triggers: ["default classification"] };
}

function detectLowCognition(message: string, conversationHistory: string[]): boolean {
  // Check current message
  for (const pattern of LOW_COGNITION_INDICATORS) {
    if (pattern.test(message)) {
      return true;
    }
  }
  
  // Check for repetitive questions in history
  if (conversationHistory.length >= 3) {
    const recentMessages = conversationHistory.slice(-3);
    const uniqueMessages = new Set(recentMessages.map(m => m.toLowerCase().trim()));
    if (uniqueMessages.size < recentMessages.length) {
      return true; // User is repeating themselves
    }
  }
  
  return false;
}

function validateCombinations(categories: string[]): boolean {
  const superficialityLevels = ["high_superficial", "medium_superficial", "deterministic"];
  const detectedSuperficiality = categories.filter(c => superficialityLevels.includes(c));
  
  // Only one superficiality level allowed
  if (detectedSuperficiality.length > 1) {
    return false;
  }
  
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [], chatType = "health" } = await req.json();
    
    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch active categories from database
    const { data: categories, error } = await supabase
      .from("maieutic_training_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }

    const detectedCategories: ClassificationResult["detectedCategories"] = [];
    
    // Detect Math
    const mathResult = detectMath(message);
    if (mathResult.detected) {
      const mathCategory = categories?.find(c => c.category_key === "math");
      if (mathCategory) {
        detectedCategories.push({
          category_key: "math",
          category_name: mathCategory.category_name,
          confidence: Math.min(0.9, 0.5 + (mathResult.triggers.length * 0.1)),
          triggers: mathResult.triggers,
        });
      }
    }

    // Detect Regional
    const regionalResult = detectRegional(message);
    if (regionalResult.detected) {
      const regionalCategory = categories?.find(c => c.category_key === "regional");
      if (regionalCategory) {
        detectedCategories.push({
          category_key: "regional",
          category_name: regionalCategory.category_name,
          confidence: Math.min(0.85, 0.5 + (regionalResult.triggers.length * 0.15)),
          triggers: regionalResult.triggers,
        });
      }
    }

    // Detect Superficiality Level
    const superficialityResult = detectSuperficiality(message);
    const superficialityKey = superficialityResult.level === "high" 
      ? "high_superficial" 
      : superficialityResult.level === "medium" 
        ? "medium_superficial" 
        : "deterministic";
    
    const superficialityCategory = categories?.find(c => c.category_key === superficialityKey);
    if (superficialityCategory) {
      detectedCategories.push({
        category_key: superficialityKey,
        category_name: superficialityCategory.category_name,
        confidence: 0.75,
        triggers: superficialityResult.triggers,
      });
    }

    // Validate combinations
    const categoryKeys = detectedCategories.map(c => c.category_key);
    const combinationValid = validateCombinations(categoryKeys);

    // If combination invalid, keep only the highest priority categories
    if (!combinationValid) {
      // Remove extra superficiality levels, keep only the first detected
      const superficialityLevels = ["high_superficial", "medium_superficial", "deterministic"];
      let foundFirst = false;
      const filtered = detectedCategories.filter(c => {
        if (superficialityLevels.includes(c.category_key)) {
          if (foundFirst) return false;
          foundFirst = true;
        }
        return true;
      });
      detectedCategories.length = 0;
      detectedCategories.push(...filtered);
    }

    // Build injected prompts from detected categories
    let injectedPrompt = "";
    let injectedAntiprompt = "";
    let behavioralInstructions = "";

    for (const detected of detectedCategories) {
      const category = categories?.find(c => c.category_key === detected.category_key);
      if (category) {
        if (category.positive_directives) {
          injectedPrompt += `
### ${category.category_name}:
${category.positive_directives}
`;
        }
        if (category.antiprompt) {
          injectedAntiprompt += `
### ${category.category_name} - PROIBIDO:
${category.antiprompt}
`;
        }
        if (category.behavioral_instructions) {
          behavioralInstructions += `
${category.behavioral_instructions}
`;
        }
      }
    }

    // Detect cognitive mode
    const isLowCognition = detectLowCognition(message, conversationHistory);
    const cognitiveMode: ClassificationResult["cognitiveMode"] = isLowCognition 
      ? "maieutic" 
      : superficialityResult.level === "high" 
        ? "simplified" 
        : "normal";

    // Add cognitive mode instructions
    if (cognitiveMode === "maieutic") {
      injectedPrompt += `
### 🧠 MODO MAIÊUTICO ATIVADO:
O usuário demonstra dificuldade de compreensão. Aplique:
1. Divida respostas em "pílulas" de 2-3 frases
2. Use analogias do dia-a-dia
3. Faça verificações de entendimento após cada pílula
4. Simplifique vocabulário significativamente
5. Pergunte "Isso ficou claro?" de formas variadas
`;
      injectedAntiprompt += `
### 🧠 MODO MAIÊUTICO - PROIBIDO:
- NÃO use jargão técnico
- NÃO dê respostas longas de uma vez
- NÃO seja condescendente
- NÃO pule etapas na explicação
`;
    }

    const result: ClassificationResult = {
      detectedCategories,
      combinationValid: true, // After filtering, it's always valid
      injectedPrompt,
      injectedAntiprompt,
      behavioralInstructions,
      cognitiveMode,
    };

    console.log(`[CLASSIFY] Message: "${message.substring(0, 50)}..." | Categories: ${detectedCategories.map(c => c.category_key).join(", ")} | Cognitive: ${cognitiveMode}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Classification error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
