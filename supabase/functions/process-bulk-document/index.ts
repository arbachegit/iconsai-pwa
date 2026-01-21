// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "https://deno.land/std@0.177.0/node/crypto.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface PreSelectedTag {
  id: string;
  name: string;
  type: 'parent' | 'child';
  parentId?: string | null;
  parentName?: string | null;
}

interface DocumentInput {
  document_id: string;
  full_text: string;
  title: string;
  preSelectedTags?: PreSelectedTag[];
  additionalContext?: string;
}

// 0. GERAÇÃO DE HASH SHA256
function generateContentHash(text: string): string {
  const hash = createHash("sha256");
  hash.update(text);
  return hash.digest("hex").toString();
}

// 1. VALIDAÇÃO DE SANIDADE (OTIMIZADA PARA OCR)
interface ValidationParams {
  min_text_length?: number;
  valid_char_ratio?: number;
  min_letter_count?: number;
}

function validateTextSanity(text: string, params?: ValidationParams): { valid: boolean; reason?: string } {
  const minTextLength = params?.min_text_length ?? 50;
  const minValidCharRatio = params?.valid_char_ratio ?? 0.5;
  const minLetterCount = params?.min_letter_count ?? 30;
  
  if (!text || text.length < minTextLength) {
    return { valid: false, reason: `Texto muito curto (mínimo ${minTextLength} caracteres, encontrado: ${text?.length || 0})` };
  }
  
  // Contar caracteres válidos incluindo Unicode (acentos, etc.) e pontuação comum
  // Regex mais permissivo: letras (incluindo acentuadas), números, espaços, pontuação básica
  const validChars = text.match(/[\p{L}\p{N}\s.,;:!?'"()\-–—]/gu)?.length || 0;
  const ratio = validChars / text.length;
  
  if (ratio < minValidCharRatio) {
    return { 
      valid: false, 
      reason: `Proporção de caracteres válidos muito baixa (${Math.round(ratio * 100)}%, mínimo: ${Math.round(minValidCharRatio * 100)}%). Documento pode estar corrompido ou ser digitalização de baixa qualidade.`
    };
  }
  
  // Verificar se há texto substantivo (não só símbolos/números)
  const letterCount = text.match(/\p{L}/gu)?.length || 0;
  if (letterCount < minLetterCount) {
    return { valid: false, reason: `Texto contém poucas letras (${letterCount}, mínimo: ${minLetterCount}) - pode ser imagem ou tabela sem OCR` };
  }
  
  return { valid: true };
}

// 2. AUTO-CATEGORIZAÇÃO VIA LLM
async function classifyTargetChat(text: string, apiKey: string): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Você é um classificador de documentos. Analise o texto e classifique em UMA das categorias:
- HEALTH: Documentos sobre saúde, medicina, hospitais, tratamentos, Hospital Moinhos de Vento
- STUDY: Documentos sobre KnowRISK, KnowYOU, ACC, tecnologia da empresa
- BOTH: Documentos relevantes para AMBOS os contextos (saúde E tecnologia/empresa)
- GENERAL: Outros documentos

IMPORTANTE: Retorne APENAS a palavra: HEALTH, STUDY, BOTH ou GENERAL`
        },
        { role: "user", content: `Classifique:\n\n${text.substring(0, 3000)}` }
      ],
    }),
  });
  
  const data = await response.json();
  const classification = data.choices[0].message.content.trim().toUpperCase();
  
  if (["HEALTH", "STUDY", "BOTH", "GENERAL"].includes(classification)) {
    return classification.toLowerCase();
  }
  return "general";
}

// Sanitizar texto para remover estruturas de tabelas e caracteres problemáticos
function sanitizeTextForAI(text: string): string {
  return text
    // Remove linhas que parecem ser bordas de tabelas
    .replace(/[─│┌┐└┘├┤┬┴┼╔╗╚╝╠╣╦╩╬═║]+/g, " ")
    // Remove linhas com muitos pipes (tabelas ASCII)
    .replace(/\|[\s\-|]+\|/g, " ")
    // Remove sequências de traços/underlines (separadores de tabela)
    .replace(/[-_=]{3,}/g, " ")
    // Remove múltiplos espaços/tabs consecutivos (alinhamento de tabela)
    .replace(/[ \t]{3,}/g, " ")
    // Remove linhas com padrão de colunas numéricas
    .replace(/(\d+[\s,.\d]*){5,}/g, "[dados numéricos]")
    // Remove caracteres especiais que quebram JSON
    .replace(/[""'']/g, '"')
    .replace(/[\u2018\u2019\u201C\u201D]/g, '"')
    // Normaliza quebras de linha
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// 3. ENRIQUECIMENTO DE METADADOS
async function generateMetadata(text: string, apiKey: string): Promise<{
  tags: { parent: string; children: string[]; confidence: number }[];
  summary: string;
  implementation_status: string;
}> {
  // Sanitizar e limitar texto
  const sanitizedText = sanitizeTextForAI(text);
  const truncatedText = sanitizedText.substring(0, 2000);
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      max_tokens: 1000,
      messages: [
        {
          role: "system",
          content: `Analise e retorne SOMENTE JSON válido (sem markdown, sem texto extra):
{"tags":[{"parent":"Categoria","children":["Sub1","Sub2"],"confidence":0.8}],"summary":"Resumo curto de 50-100 palavras.","implementation_status":"ready"}`
        },
        { role: "user", content: `Documento:\n${truncatedText}` }
      ],
    }),
  });
  
  const data = await response.json();
  let content = data.choices?.[0]?.message?.content || "";
  
  // Limpar markdown e caracteres inválidos
  content = content
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/g, "")
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .trim();
  
  // Tentar extrair JSON válido
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    content = jsonMatch[0];
  }
  
  try {
    return JSON.parse(content);
  } catch (parseError) {
    console.error("JSON parse error, using fallback:", parseError, "Content:", content.substring(0, 500));
    // Fallback com valores padrão
    return {
      tags: [{ parent: "Documento", children: ["Geral"], confidence: 0.5 }],
      summary: truncatedText.substring(0, 300) + "...",
      implementation_status: "needs_review"
    };
  }
}

// 4. CHUNKING
function chunkText(text: string, size = 750, overlap = 180): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i += (size - overlap)) {
    const chunkWords = words.slice(i, i + size);
    chunks.push(chunkWords.join(" "));
    if (i + size >= words.length) break;
  }
  
  return chunks;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const results: { document_id: string; status: string; error?: string }[] = [];

  try {
    const { documents_data, validation_params } = await req.json() as { 
      documents_data: DocumentInput[];
      validation_params?: ValidationParams;
    };
    
    console.log(`Received ${documents_data.length} document(s), validation_params:`, validation_params);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const openAIKey = Deno.env.get("OPENAI_API_KEY")!;
    
    for (const doc of documents_data) {
      try {
        console.log(`Processing document ${doc.document_id}: ${doc.title}`);
        
        // 0. GERAR HASH SHA256 DO CONTEÚDO
        const contentHash = generateContentHash(doc.full_text);
        console.log(`Generated content hash for ${doc.document_id}: ${contentHash.substring(0, 16)}...`);
        
        // Verificar se já existe documento com o mesmo hash (duplicata exata)
        const { data: existingDoc } = await supabase
          .from("documents")
          .select("id, filename")
          .eq("content_hash", contentHash)
          .neq("id", doc.document_id)
          .single();
        
        if (existingDoc) {
          console.log(`⚠️ Duplicate detected (exact hash): ${doc.title} matches existing ${existingDoc.filename}`);
          results.push({
            document_id: doc.document_id,
            status: "duplicate",
            error: `Conteúdo duplicado (100% idêntico): ${existingDoc.filename}`,
            existing_doc_id: existingDoc.id,
            existing_filename: existingDoc.filename
          } as any);
          continue;
        }
        
        // 0.5 VERIFICAR SIMILARIDADE DE CONTEÚDO (>90%) VIA EMBEDDINGS
        console.log(`Checking content similarity for ${doc.document_id}...`);
        
        // Gerar embedding do novo documento (usando amostra para performance)
        const sampleText = doc.full_text.substring(0, 8000); // Primeiros ~8k caracteres
        const similarityEmbeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openAIKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: sampleText,
          }),
        });
        
        if (similarityEmbeddingResponse.ok) {
          const embData = await similarityEmbeddingResponse.json();
          const newDocEmbedding = embData.data[0].embedding;
          
          // Buscar threshold configurado do chat_config
          const { data: configData } = await supabase
            .from("chat_config")
            .select("duplicate_similarity_threshold")
            .limit(1)
            .single();
          
          const duplicateThreshold = configData?.duplicate_similarity_threshold || 0.90;
          console.log(`Using duplicate similarity threshold: ${duplicateThreshold}`);
          
          // Buscar documentos similares com threshold dinâmico
          const { data: similarDocs } = await supabase.rpc('search_documents', {
            query_embedding: newDocEmbedding,
            match_threshold: duplicateThreshold,
            match_count: 1
          });
          
          if (similarDocs && similarDocs.length > 0) {
            const similarDoc = similarDocs[0];
            const similarity = Math.round(similarDoc.similarity * 100);
            
            // Buscar nome do documento similar
            const { data: existingSimilarDoc } = await supabase
              .from("documents")
              .select("id, filename")
              .eq("id", similarDoc.document_id)
              .neq("id", doc.document_id)
              .single();
            
            if (existingSimilarDoc) {
              console.log(`⚠️ Similar content detected (${similarity}%): ${doc.title} matches ${existingSimilarDoc.filename}`);
              results.push({
                document_id: doc.document_id,
                status: "duplicate",
                error: `Conteúdo similar (${similarity}%): ${existingSimilarDoc.filename}`,
                existing_doc_id: existingSimilarDoc.id,
                existing_filename: existingSimilarDoc.filename,
                similarity_score: similarity
              } as any);
              continue;
            }
          }
        }
        
        console.log(`No similar content found for ${doc.document_id}, proceeding with processing...`);
        
        // 1. VALIDAÇÃO COM PARÂMETROS CUSTOMIZADOS
        const validation = validateTextSanity(doc.full_text, validation_params);
        if (!validation.valid) {
          await supabase.from("documents").update({
            status: "failed",
            error_message: validation.reason,
            is_readable: false
          }).eq("id", doc.document_id);
          
          results.push({ document_id: doc.document_id, status: "failed", error: validation.reason });
          continue;
        }
        
        // Update status to processing e salvar hash
        await supabase.from("documents").update({ 
          status: "processing",
          content_hash: contentHash
        }).eq("id", doc.document_id);
        
        // 2. AUTO-CATEGORIZAÇÃO
        const targetChat = await classifyTargetChat(doc.full_text, lovableKey);
        console.log(`Document ${doc.document_id} classified as: ${targetChat}`);
        
        // ✨ AUTO-INSERÇÃO para Health/Study/Both
        const isAutoInserted = targetChat === 'health' || targetChat === 'study' || targetChat === 'both';
        console.log(`Auto-insertion for ${doc.document_id}: ${isAutoInserted ? `YES (${targetChat})` : 'NO (general)'}`);
        
        // 3. ENRIQUECIMENTO
        // Prepend additional context to text if provided
        const textForMetadata = doc.additionalContext 
          ? `CONTEXTO ADICIONAL DO ADMIN:\n${doc.additionalContext}\n\n---\n\n${doc.full_text}`
          : doc.full_text;
        const metadata = await generateMetadata(textForMetadata, lovableKey);
        console.log(`Metadata generated for ${doc.document_id}`);
        
        // Save pre-selected tags first (from admin enrichment)
        const savedPreSelectedParentIds: { [tagName: string]: string } = {};
        if (doc.preSelectedTags && doc.preSelectedTags.length > 0) {
          console.log(`Saving ${doc.preSelectedTags.length} pre-selected tags for ${doc.document_id}`);
          
          // Save parent tags first
          const parentTags = doc.preSelectedTags.filter(t => t.type === 'parent');
          for (const tag of parentTags) {
            const { data: insertedTag } = await supabase.from("document_tags").insert({
              document_id: doc.document_id,
              tag_name: tag.name,
              tag_type: "parent",
              confidence: 1.0, // Manual selection = 100% confidence
              source: "admin"
            }).select().single();
            
            if (insertedTag) {
              savedPreSelectedParentIds[tag.name.toLowerCase()] = insertedTag.id;
            }
          }
          
          // Save child tags with parent reference
          const childTags = doc.preSelectedTags.filter(t => t.type === 'child');
          for (const tag of childTags) {
            const parentId = tag.parentName 
              ? savedPreSelectedParentIds[tag.parentName.toLowerCase()] 
              : null;
            
            await supabase.from("document_tags").insert({
              document_id: doc.document_id,
              tag_name: tag.name,
              tag_type: "child",
              parent_tag_id: parentId,
              confidence: 1.0, // Manual selection = 100% confidence
              source: "admin"
            });
          }
        }
        
        // Save AI-generated tags (avoid duplicates with pre-selected)
        const preSelectedTagNames = new Set(
          (doc.preSelectedTags || []).map(t => t.name.toLowerCase())
        );
        
        for (const tag of metadata.tags) {
          // Skip if parent tag was already pre-selected
          if (preSelectedTagNames.has(tag.parent.toLowerCase())) {
            console.log(`Skipping duplicate AI tag: ${tag.parent}`);
            continue;
          }
          
          const { data: parentTag } = await supabase.from("document_tags").insert({
            document_id: doc.document_id,
            tag_name: tag.parent,
            tag_type: "parent",
            confidence: tag.confidence,
            source: "ai"
          }).select().single();
          
          if (parentTag) {
            for (const child of tag.children) {
              // Skip if child was already pre-selected
              if (preSelectedTagNames.has(child.toLowerCase())) {
                console.log(`Skipping duplicate AI child tag: ${child}`);
                continue;
              }
              
              await supabase.from("document_tags").insert({
                document_id: doc.document_id,
                tag_name: child,
                tag_type: "child",
                parent_tag_id: parentTag.id,
                confidence: tag.confidence * 0.9,
                source: "ai"
              });
            }
          }
        }
        
        // 4. CHUNKING E EMBEDDINGS
        const chunks = chunkText(doc.full_text, 750, 180);
        console.log(`Created ${chunks.length} chunks for ${doc.document_id}`);
        
        for (let i = 0; i < chunks.length; i++) {
          const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openAIKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "text-embedding-3-small",
              input: chunks[i],
            }),
          });
          
          if (embeddingResponse.ok) {
            const embeddingData = await embeddingResponse.json();
            const embedding = embeddingData.data[0].embedding;
            
            await supabase.from("document_chunks").insert({
              document_id: doc.document_id,
              chunk_index: i,
              content: chunks[i],
              word_count: chunks[i].split(/\s+/).length,
              embedding: embedding,
              metadata: {
                target_chat: targetChat,
                document_title: doc.title,
                tags: metadata.tags.map(t => t.parent),
                implementation_status: metadata.implementation_status
              }
            });
          }
        }
        
        // Update document with completion
        await supabase.from("documents").update({
          status: "completed",
          target_chat: targetChat,
          ai_summary: metadata.summary,
          implementation_status: metadata.implementation_status,
          total_chunks: chunks.length,
          total_words: doc.full_text.split(/\s+/).length,
          // ✨ Campos de inserção automática
          is_inserted: isAutoInserted,
          inserted_in_chat: isAutoInserted ? targetChat : null,
          inserted_at: isAutoInserted ? new Date().toISOString() : null
        }).eq("id", doc.document_id);
        
        // Criar entrada inicial em document_versions
        await supabase.from("document_versions").insert({
          document_id: doc.document_id,
          version_number: 1,
          current_hash: contentHash,
          change_type: "INITIAL",
          log_message: `Documento "${doc.title}" ingerido inicialmente`,
          metadata: {
            target_chat: targetChat,
            total_chunks: chunks.length,
            total_words: doc.full_text.split(/\s+/).length,
            implementation_status: metadata.implementation_status
          }
        });
        
        // ✨ Registrar log de roteamento
        await supabase.from("document_routing_log").insert({
          document_id: doc.document_id,
          document_name: doc.title,
          original_category: targetChat,
          final_category: targetChat,
          action_type: isAutoInserted ? 'auto_expanded' : 'kept_general',
          session_id: `bulk-${Date.now()}`,
          scope_changed: isAutoInserted,
          disclaimer_shown: isAutoInserted,
          metadata: {
            auto_inserted: isAutoInserted,
            total_chunks: chunks.length,
            timestamp: new Date().toISOString()
          }
        });
        
        results.push({ document_id: doc.document_id, status: "completed" });
        console.log(`Document ${doc.document_id} processed successfully as ${targetChat}`);
        
        // 🔔 DISPATCH new_document NOTIFICATION with force logging
        try {
          const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
          
          // Check notification preferences
          const { data: prefData } = await supabase
            .from("notification_preferences")
            .select("email_enabled, whatsapp_enabled")
            .eq("event_type", "new_document")
            .single();
          
          const { data: settings } = await supabase
            .from("admin_settings")
            .select("gmail_notification_email, whatsapp_target_phone, whatsapp_global_enabled, email_global_enabled")
            .single();
          
          const forceLogDoc = async (channel: string, recipient: string, status: string, msg: string, err?: string) => {
            await supabase.from("notification_logs").insert({
              event_type: "new_document",
              channel,
              recipient: recipient || "N/A",
              status,
              message_body: msg.substring(0, 500),
              error_message: err || null,
              metadata: { force_logged: true, document_id: doc.document_id, filename: doc.title, timestamp },
            });
            console.log(`[ForceLog] new_document | ${channel} | ${status}`);
          };
          
          if (!prefData) {
            await forceLogDoc("system", "N/A", "blocked", `Novo documento: ${doc.title}`, "No preferences for new_document");
          } else {
            const { data: template } = await supabase
              .from("notification_templates")
              .select("*")
              .eq("event_type", "new_document")
              .single();
            
            const variables: Record<string, string> = {
              file_name: doc.title,
              upload_date: timestamp,
              target_chat: targetChat,
              platform_name: 'Plataforma KnowYOU'
            };
            
            const injectVars = (tpl: string) => {
              let result = tpl;
              for (const [key, value] of Object.entries(variables)) {
                result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
              }
              return result;
            };
            
            // Email notification
            const emailGlobalEnabled = (settings as any)?.email_global_enabled !== false;
            if (prefData.email_enabled && emailGlobalEnabled && settings?.gmail_notification_email) {
              const emailBody = template?.email_body
                ? injectVars(template.email_body)
                : `📄 Novo documento processado: ${doc.title}\nDestino: ${targetChat}\nData: ${timestamp}`;
              
              try {
                const emailResp = await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    from: "Plataforma KnowYOU <noreply@knowyou.app>",
                    to: [settings.gmail_notification_email],
                    subject: template?.email_subject ? injectVars(template.email_subject) : `📄 Novo Documento: ${doc.title}`,
                    html: `<pre style="font-family: sans-serif;">${emailBody}</pre>`,
                  }),
                });
                
                if (emailResp.ok) {
                  await forceLogDoc("email", settings.gmail_notification_email, "success", emailBody);
                } else {
                  const errData = await emailResp.json();
                  await forceLogDoc("email", settings.gmail_notification_email, "failed", emailBody, errData.message);
                }
              } catch (emailErr) {
                await forceLogDoc("email", settings.gmail_notification_email, "failed", emailBody, emailErr instanceof Error ? emailErr.message : "Unknown");
              }
            } else if (!prefData.email_enabled) {
              await forceLogDoc("email", settings?.gmail_notification_email || "N/A", "blocked", `Novo doc: ${doc.title}`, "Email disabled for new_document");
            }
            
            // WhatsApp notification
            if (prefData.whatsapp_enabled && settings?.whatsapp_global_enabled && settings?.whatsapp_target_phone) {
              const whatsappMsg = template?.whatsapp_message
                ? injectVars(template.whatsapp_message)
                : `📄 ${timestamp} - Novo documento: ${doc.title} (${targetChat})`;
              
              try {
                const waResp = await supabase.functions.invoke("send-whatsapp", {
                  body: { phoneNumber: settings.whatsapp_target_phone, message: whatsappMsg, eventType: "new_document" },
                });
                if (!waResp.error) {
                  await forceLogDoc("whatsapp", settings.whatsapp_target_phone, "success", whatsappMsg);
                } else {
                  await forceLogDoc("whatsapp", settings.whatsapp_target_phone, "failed", whatsappMsg, waResp.error.message);
                }
              } catch (waErr) {
                await forceLogDoc("whatsapp", settings.whatsapp_target_phone, "failed", whatsappMsg, waErr instanceof Error ? waErr.message : "Unknown");
              }
            } else if (!prefData.whatsapp_enabled || !settings?.whatsapp_global_enabled) {
              await forceLogDoc("whatsapp", settings?.whatsapp_target_phone || "N/A", "blocked", `Novo doc: ${doc.title}`, "WhatsApp disabled");
            }
          }
        } catch (notifyErr) {
          console.error("[ProcessBulkDoc] Notification dispatch error:", notifyErr);
        }
        
      } catch (docError) {
        console.error(`Error processing ${doc.document_id}:`, docError);
        
        await supabase.from("documents").update({
          status: "failed",
          error_message: docError instanceof Error ? docError.message : "Erro desconhecido"
        }).eq("id", doc.document_id);
        
        results.push({ 
          document_id: doc.document_id, 
          status: "failed", 
          error: docError instanceof Error ? docError.message : "Unknown error" 
        });
      }
    }
    
    // TRIGGER AUTO_PATCH após processamento bem-sucedido
    const successCount = results.filter(r => r.status === "completed").length;
    if (successCount > 0) {
      console.log(`✅ ${successCount} documento(s) processado(s). Disparando AUTO_PATCH e documentação...`);
      
      try {
        // Buscar target_chats dos documentos processados
        const completedDocIds = results
          .filter(r => r.status === "completed")
          .map(r => r.document_id);
        
        const { data: processedDocs } = await supabase
          .from("documents")
          .select("target_chat")
          .in("id", completedDocIds);
        
        const targetChats = [...new Set(
          (processedDocs || []).map((doc: any) => doc.target_chat)
        )];

        // 1. Incrementar versão (AUTO_PATCH)
        await fetch(`${supabaseUrl}/functions/v1/version-control`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            action: "patch",
            log_message: `Documentação atualizada: ${successCount} arquivo(s) processado(s)`,
            associated_data: {
              files_processed: successCount,
              target_chats: targetChats,
              timestamp: new Date().toISOString(),
            },
          }),
        });

        // 2. Gerar documentação automaticamente
        await fetch(`${supabaseUrl}/functions/v1/generate-documentation`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseKey}`,
          },
        });

        // 3. Atualizar chat configs com tags dos documentos
        for (const targetChat of targetChats) {
          await fetch(`${supabaseUrl}/functions/v1/update-chat-config`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              chatType: targetChat,
            }),
          });
        }

        console.log("✅ AUTO_PATCH, documentação e chat configs atualizados com sucesso");
      } catch (triggerError) {
        console.error("⚠️ Erro ao disparar AUTO_PATCH/documentação:", triggerError);
        // Não falhar o processo principal por causa deste erro
      }
    }
    
    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error in process-bulk-document:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
