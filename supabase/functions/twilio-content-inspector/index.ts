// ============================================
// VERSAO: 1.0.0 | DEPLOY: 2026-01-04
// Twilio Content API Inspector
// Diagnostica templates para resolver 63028
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const FUNCTION_VERSION = "1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContentVariable {
  key: string;
  location: string;
  index: number;
}

interface InspectorResult {
  success: boolean;
  version: string;
  contentSid: string;
  templateName?: string;
  friendlyName?: string;
  status?: string;
  language?: string;
  types?: Record<string, unknown>;
  variables: ContentVariable[];
  expectedBodyVariables: number;
  expectedButtonVariables: number;
  totalExpectedVariables: number;
  rawContent?: unknown;
  error?: string;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`[TWILIO-CONTENT-INSPECTOR v${FUNCTION_VERSION}] INICIANDO`);
  console.log(`${"=".repeat(60)}\n`);

  try {
    const { contentSid } = await req.json();

    if (!contentSid) {
      return new Response(
        JSON.stringify({ success: false, error: "contentSid é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[INSPECTOR] ContentSid: ${contentSid}`);

    // Get Twilio credentials
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return new Response(
        JSON.stringify({ success: false, error: "Credenciais Twilio não configuradas" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch content template from Twilio Content API
    const url = `https://content.twilio.com/v1/Content/${contentSid}`;
    
    console.log(`[INSPECTOR] Fetching: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[INSPECTOR] ❌ Twilio API Error:`, JSON.stringify(data));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.message || "Erro ao buscar template",
          code: data.code,
          moreInfo: data.more_info 
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[INSPECTOR] ✅ Template encontrado`);
    console.log(`[INSPECTOR] Friendly Name: ${data.friendly_name}`);
    console.log(`[INSPECTOR] Status: ${data.approval_requests?.status || 'unknown'}`);
    console.log(`[INSPECTOR] Language: ${data.language}`);

    // Analyze template structure to find variables
    const variables: ContentVariable[] = [];
    let bodyVarCount = 0;
    let buttonVarCount = 0;

    // Parse types to find variables
    const types = data.types || {};
    
    console.log(`\n[INSPECTOR] Analisando estrutura do template...`);
    console.log(`[INSPECTOR] Types disponíveis: ${Object.keys(types).join(", ")}`);

    // Check each type for variables
    for (const [typeName, typeContent] of Object.entries(types)) {
      const content = typeContent as Record<string, unknown>;
      console.log(`\n[INSPECTOR] Tipo: ${typeName}`);
      console.log(`[INSPECTOR] Conteúdo: ${JSON.stringify(content, null, 2)}`);

      // Check body for variables ({{1}}, {{2}}, etc.)
      if (content.body && typeof content.body === 'string') {
        const bodyMatches = content.body.match(/\{\{(\d+)\}\}/g) || [];
        bodyMatches.forEach((match) => {
          const index = parseInt(match.replace(/\D/g, ''), 10);
          variables.push({ key: match, location: 'body', index });
          bodyVarCount = Math.max(bodyVarCount, index);
        });
        console.log(`[INSPECTOR] Body vars: ${bodyMatches.join(", ") || "nenhum"}`);
      }

      // Check header for variables
      if (content.header && typeof content.header === 'object') {
        const header = content.header as Record<string, unknown>;
        if (header.text && typeof header.text === 'string') {
          const headerMatches = header.text.match(/\{\{(\d+)\}\}/g) || [];
          headerMatches.forEach((match) => {
            const index = parseInt(match.replace(/\D/g, ''), 10);
            variables.push({ key: match, location: 'header', index });
            bodyVarCount = Math.max(bodyVarCount, index);
          });
          console.log(`[INSPECTOR] Header vars: ${headerMatches.join(", ") || "nenhum"}`);
        }
      }

      // Check footer for variables
      if (content.footer && typeof content.footer === 'string') {
        const footerMatches = content.footer.match(/\{\{(\d+)\}\}/g) || [];
        footerMatches.forEach((match) => {
          const index = parseInt(match.replace(/\D/g, ''), 10);
          variables.push({ key: match, location: 'footer', index });
          bodyVarCount = Math.max(bodyVarCount, index);
        });
        console.log(`[INSPECTOR] Footer vars: ${footerMatches.join(", ") || "nenhum"}`);
      }

      // Check actions/buttons for dynamic URLs
      if (content.actions && Array.isArray(content.actions)) {
        content.actions.forEach((action: unknown, actionIndex: number) => {
          const act = action as Record<string, unknown>;
          console.log(`[INSPECTOR] Action ${actionIndex}: ${JSON.stringify(act)}`);
          
          // URL buttons can have {{1}} in suffix
          if (act.type === 'URL' && typeof act.url === 'string') {
            const urlMatches = act.url.match(/\{\{(\d+)\}\}/g) || [];
            urlMatches.forEach((match) => {
              const index = parseInt(match.replace(/\D/g, ''), 10);
              variables.push({ key: match, location: `button_url_${actionIndex}`, index });
              buttonVarCount = Math.max(buttonVarCount, index);
            });
            console.log(`[INSPECTOR] Button URL vars: ${urlMatches.join(", ") || "nenhum"}`);
          }
          
          // Quick reply or call buttons might also have variables
          if (typeof act.title === 'string') {
            const titleMatches = act.title.match(/\{\{(\d+)\}\}/g) || [];
            titleMatches.forEach((match) => {
              const index = parseInt(match.replace(/\D/g, ''), 10);
              variables.push({ key: match, location: `button_title_${actionIndex}`, index });
              buttonVarCount = Math.max(buttonVarCount, index);
            });
          }
        });
      }
    }

    // Calculate unique variables
    const uniqueVars = new Set(variables.map(v => `${v.location}:${v.index}`));
    const bodyVarsFound = variables.filter(v => ['body', 'header', 'footer'].includes(v.location));
    const buttonVarsFound = variables.filter(v => v.location.startsWith('button_'));

    const result: InspectorResult = {
      success: true,
      version: FUNCTION_VERSION,
      contentSid,
      templateName: data.friendly_name,
      friendlyName: data.friendly_name,
      status: data.approval_requests?.status,
      language: data.language,
      types: data.types,
      variables,
      expectedBodyVariables: bodyVarCount,
      expectedButtonVariables: buttonVarCount,
      totalExpectedVariables: bodyVarCount + buttonVarCount,
      rawContent: data,
    };

    console.log(`\n${"=".repeat(60)}`);
    console.log(`[INSPECTOR] RESUMO`);
    console.log(`${"=".repeat(60)}`);
    console.log(`Template: ${data.friendly_name}`);
    console.log(`ContentSid: ${contentSid}`);
    console.log(`Status: ${data.approval_requests?.status || 'unknown'}`);
    console.log(`Variáveis Body: ${bodyVarCount}`);
    console.log(`Variáveis Button: ${buttonVarCount}`);
    console.log(`Total esperado: ${bodyVarCount + buttonVarCount}`);
    console.log(`Detalhes: ${JSON.stringify(variables)}`);
    console.log(`${"=".repeat(60)}\n`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[INSPECTOR] ❌ ERRO: ${errMsg}`);
    
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
