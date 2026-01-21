// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface TableInfo {
  table_name: string;
  columns: Array<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }>;
  rls_enabled: boolean;
  policies: Array<{
    policy_name: string;
    command: string;
    permissive: string;
    using_expression: string | null;
    with_check_expression: string | null;
  }>;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse body for version info (from Minor/Major releases)
    let requestData: { version?: string; release_notes?: string; tags?: string[] } = {};
    if (req.method === 'POST') {
      try {
        requestData = await req.json();
      } catch {
        // Se não tiver body, continua normalmente
      }
    }

    console.log('🔍 Starting documentation generation...');
    if (requestData.version) {
      console.log(`📌 Version: ${requestData.version}`);
    }

    // 1. Extract Database Schema via RPC function
    console.log('📊 Extracting database schema...');
    
    let tables: TableInfo[] = [];
    
    try {
      const { data: schemaData, error: schemaError } = await supabaseClient
        .rpc('get_schema_info');
      
      if (schemaError) {
        console.warn('⚠️ Schema extraction error:', schemaError);
        console.log('Using fallback to known tables...');
        
        // Fallback to known tables
        const KNOWN_TABLES = [
          'documents', 'document_chunks', 'document_tags', 'document_versions',
          'conversation_history', 'admin_settings', 'chat_analytics', 
          'rag_analytics', 'version_control', 'documentation_versions',
          'generated_images', 'tooltip_contents', 'user_roles', 'feature_flags',
          'section_audio', 'credits_usage', 'debug_logs', 'image_analytics',
          'auto_preload_config'
        ];
        
        tables = KNOWN_TABLES.map(name => ({
          table_name: name,
          columns: [],
          rls_enabled: true,
          policies: []
        }));
      } else {
        tables = schemaData || [];
        console.log(`✅ Extracted ${tables.length} tables from schema`);
      }
    } catch (err) {
      console.error('❌ Schema RPC failed:', err);
      tables = [];
    }

    // 2. Extract Edge Functions metadata
    console.log('⚡ Extracting edge functions...');
    const edgeFunctions = [
      'chat-router', 'generate-image', 'generate-section-image',
      'text-to-speech', 'send-email', 'youtube-videos', 'analyze-sentiment',
      'sentiment-alert', 'generate-history-image', 'voice-to-text',
      'process-document-with-text', 'suggest-document-tags',
      'generate-document-summary', 'search-documents', 'process-bulk-document',
      'version-control', 'generate-documentation'
    ];

    const backendDocs = edgeFunctions.map(fn => ({
      name: fn,
      description: getEdgeFunctionDescription(fn),
      auth_required: ['text-to-speech', 'send-email'].includes(fn),
      category: categorizeFunction(fn),
    }));

    // 3. Generate Enhanced Mermaid Diagram
    const mermaidDiagram = `graph TB
    subgraph Admin["🔐 Admin Panel"]
        BTN[Gerar Documentação]
        DOCS[DocumentsTab]
        VER[VersionControlTab]
    end
    
    subgraph Version["🏷️ Controle de Versão"]
        VC[version-control]
        VER_TBL[(version_control)]
    end
    
    subgraph RAG["📚 RAG System"]
        PDF[PDF Upload]
        EXTRACT[Text Extraction]
        BULK[process-bulk-document]
        EMBED[OpenAI Embeddings]
        CHUNKS[(document_chunks)]
    end
    
    subgraph Chat["💬 Chat Systems"]
        STUDY[Study Assistant]
        HEALTH[Health Assistant]
        SEARCH[search-documents]
    end
    
    subgraph DB["🗄️ Database"]
        DOCS_TBL[(documents)]
        TAGS_TBL[(document_tags)]
        CONV[(conversation_history)]
    end
    
    BTN --> DOCS
    VER --> VC
    VC --> VER_TBL
    PDF --> EXTRACT
    EXTRACT --> BULK
    BULK --> EMBED
    EMBED --> CHUNKS
    BULK --> DOCS_TBL
    BULK --> TAGS_TBL
    BULK -.AUTO_PATCH.-> VC
    BULK -.trigger.-> BTN
    STUDY --> SEARCH
    HEALTH --> SEARCH
    SEARCH --> CHUNKS
    STUDY --> CONV
    HEALTH --> CONV`;

    // 4. Create Documentation Structure
    const documentationIndex = {
      title: "KnowRisk Technical Documentation",
      version: `v${new Date().toISOString().split('T')[0]}`,
      generated_at: new Date().toISOString(),
      sections: [
        { id: "database", title: "🗄️ Database", description: "Schema, tables, policies, and functions" },
        { id: "backend", title: "⚡ Backend", description: "Edge Functions and serverless logic" },
        { id: "frontend", title: "🖥️ Frontend", description: "Components, hooks, and UI" },
        { id: "version", title: "🏷️ Version Control", description: "Automatic versioning and changelog" }
      ],
      mermaid_diagram: mermaidDiagram
    };

    const databaseDoc = {
      title: "Database Schema",
      generated_at: new Date().toISOString(),
      tables: tables,
      total_tables: tables.length,
    };

    const backendDoc = {
      title: "Backend Edge Functions",
      generated_at: new Date().toISOString(),
      functions: backendDocs,
      total_functions: backendDocs.length,
      categories: {
        chat: backendDocs.filter(f => f.category === 'chat').length,
        rag: backendDocs.filter(f => f.category === 'rag').length,
        media: backendDocs.filter(f => f.category === 'media').length,
        analytics: backendDocs.filter(f => f.category === 'analytics').length,
        system: backendDocs.filter(f => f.category === 'system').length,
      }
    };

    const frontendDoc = {
      title: "Frontend Components",
      generated_at: new Date().toISOString(),
      components: [
        { name: "ChatKnowYOU", category: "Chat", description: "Health assistant chat with RAG" },
        { name: "ChatStudy", category: "Chat", description: "Study assistant for company knowledge" },
        { name: "DocumentsTab", category: "Admin", description: "RAG documents management with bulk operations" },
        { name: "VersionControlTab", category: "Admin", description: "Version control and changelog" },
        { name: "RagMetricsTab", category: "Admin", description: "RAG analytics and metrics" },
        { name: "AIHistoryPanel", category: "Educational", description: "AI history timeline with audio" },
        { name: "DraggablePreviewPanel", category: "UI", description: "Draggable tooltip preview system" }
      ]
    };

    // 5. Generate automatic changelog (for Minor/Major releases)
    console.log('📝 Generating changelog...');
    let changelogContent = '';
    
    // Buscar histórico desde última versão Minor/Major
    const { data: versionHistory } = await supabaseClient
      .from('version_control')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(20);
    
    if (versionHistory && versionHistory.length > 0) {
      changelogContent = `# 📋 Changelog KnowYOU\n\n`;
      changelogContent += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n\n`;
      changelogContent += `---\n\n`;
      
      // Se temos release notes customizadas, usar
      if (requestData.release_notes) {
        changelogContent += `## ${requestData.version || 'Versão Atual'}\n\n`;
        changelogContent += `**Data:** ${new Date().toLocaleString('pt-BR')}\n\n`;
        
        if (requestData.tags && requestData.tags.length > 0) {
          changelogContent += `**Tags:** ${requestData.tags.join(', ')}\n\n`;
        }
        
        changelogContent += `### Release Notes\n\n${requestData.release_notes}\n\n`;
        changelogContent += `---\n\n`;
      }
      
      // Adicionar histórico detalhado
      versionHistory.forEach((record: any) => {
        changelogContent += `## Versão ${record.current_version}\n`;
        changelogContent += `**Data:** ${new Date(record.timestamp).toLocaleString('pt-BR')}\n\n`;
        changelogContent += `**Tipo:** ${record.trigger_type}\n\n`;
        changelogContent += `**Mensagem:** ${record.log_message}\n\n`;
        
        // Incluir tags se existirem
        if (record.associated_data?.tags && record.associated_data.tags.length > 0) {
          changelogContent += `**Tags:** ${record.associated_data.tags.join(', ')}\n\n`;
        }
        
        // Incluir release notes se existirem
        if (record.associated_data?.release_notes) {
          changelogContent += `**Release Notes:** ${record.associated_data.release_notes}\n\n`;
        }
        
        changelogContent += `---\n\n`;
      });
    }

    // 6. Register version in database
    console.log('💾 Registering documentation version...');
    const version = requestData.version || `v${new Date().toISOString().split('T')[0]}`;
    const { error: versionError } = await supabaseClient
      .from('documentation_versions')
      .insert({
        version,
        author: requestData.release_notes ? 'Manual Release' : 'Auto-generated',
        changes: [
          { type: 'database', count: tables.length },
          { type: 'backend', count: backendDocs.length },
          { type: 'frontend', count: 7 }
        ]
      });

    if (versionError) {
      console.error('Error saving version:', versionError);
    }

    console.log('✅ Documentation generated successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        version,
        generated_at: new Date().toISOString(),
        structure: {
          index: documentationIndex,
          database: databaseDoc,
          backend: backendDoc,
          frontend: frontendDoc
        },
        changelog: changelogContent,
        stats: {
          tables: tables.length,
          edge_functions: backendDocs.length,
          components: 7
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error generating documentation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

function getEdgeFunctionDescription(name: string): string {
  const descriptions: Record<string, string> = {
    'chat-router': 'Unified chat router with SSE streaming and PWA JSON mode',
    'generate-image': 'Image generation via Lovable AI',
    'generate-section-image': 'Section-specific image generation',
    'text-to-speech': 'ElevenLabs voice synthesis',
    'send-email': 'Resend email integration',
    'youtube-videos': 'YouTube API video fetching with caching',
    'analyze-sentiment': 'Message sentiment analysis',
    'sentiment-alert': 'Sentiment threshold alerts',
    'generate-history-image': 'AI history timeline images',
    'voice-to-text': 'OpenAI Whisper transcription',
    'process-document-with-text': 'Document text processing and validation',
    'suggest-document-tags': 'AI hierarchical tag generation',
    'generate-document-summary': 'AI document summarization',
    'search-documents': 'RAG semantic search with pgvector',
    'process-bulk-document': 'Bulk document processing with auto-categorization',
    'version-control': 'Automatic version management (patch/minor/major)',
    'generate-documentation': 'Auto-generate technical documentation'
  };
  return descriptions[name] || 'No description available';
}

function categorizeFunction(name: string): string {
  if (['chat', 'chat-study'].includes(name)) return 'chat';
  if (['process-bulk-document', 'search-documents', 'process-document-with-text', 'suggest-document-tags', 'generate-document-summary'].includes(name)) return 'rag';
  if (['generate-image', 'generate-section-image', 'generate-history-image', 'text-to-speech', 'voice-to-text', 'youtube-videos'].includes(name)) return 'media';
  if (['analyze-sentiment', 'sentiment-alert'].includes(name)) return 'analytics';
  return 'system';
}
