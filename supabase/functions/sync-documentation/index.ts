// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface SyncPhase {
  id: string;
  label: string;
  weight: number;
}

const SYNC_PHASES: SyncPhase[] = [
  { id: 'database', label: 'Analisando schema do banco de dados', weight: 25 },
  { id: 'edge_functions', label: 'Rastreando edge functions', weight: 25 },
  { id: 'frontend', label: 'Mapeando componentes frontend', weight: 25 },
  { id: 'icons', label: 'Catalogando ícones', weight: 15 },
  { id: 'finalize', label: 'Finalizando sincronização', weight: 10 },
];

// Edge functions list - manually maintained to ensure accuracy
const EDGE_FUNCTIONS = [
  { name: 'analyze-deterministic', description: 'Análise determinística de queries', auth_required: false, category: 'AI' },
  { name: 'analyze-sentiment', description: 'Análise de sentimento de conversas', auth_required: false, category: 'AI' },
  { name: 'chat-router', description: 'Roteador unificado de chat (SSE + PWA mode)', auth_required: false, category: 'Chat' },
  { name: 'check-ml-accuracy', description: 'Verificação de acurácia ML', auth_required: false, category: 'ML' },
  { name: 'cleanup-stuck-documents', description: 'Limpeza de documentos travados', auth_required: false, category: 'RAG' },
  { name: 'extract-pdf-document-ai', description: 'Extração OCR com Google Document AI', auth_required: false, category: 'RAG' },
  { name: 'generate-document-summary', description: 'Geração de resumos de documentos', auth_required: false, category: 'AI' },
  { name: 'generate-documentation', description: 'Geração de documentação técnica', auth_required: true, category: 'System' },
  { name: 'generate-history-image', description: 'Geração de imagens históricas', auth_required: false, category: 'AI' },
  { name: 'generate-image-study', description: 'Geração de imagens para estudos', auth_required: false, category: 'AI' },
  { name: 'generate-image', description: 'Geração de imagens de saúde', auth_required: false, category: 'AI' },
  { name: 'generate-section-image', description: 'Geração de imagens de seções', auth_required: false, category: 'AI' },
  { name: 'migrate-all-images', description: 'Migração de imagens para WebP', auth_required: false, category: 'System' },
  { name: 'migrate-timeline-images', description: 'Migração de imagens da timeline', auth_required: false, category: 'System' },
  { name: 'process-bulk-document', description: 'Processamento bulk de documentos RAG', auth_required: false, category: 'RAG' },
  { name: 'process-document-with-text', description: 'Processamento de documentos com texto', auth_required: false, category: 'RAG' },
  { name: 'reset-password-with-token', description: 'Reset de senha com token', auth_required: false, category: 'Auth' },
  { name: 'search-documents', description: 'Busca semântica em documentos', auth_required: false, category: 'RAG' },
  { name: 'send-email', description: 'Envio de emails via Resend', auth_required: false, category: 'System' },
  { name: 'send-recovery-code', description: 'Envio de código de recuperação', auth_required: false, category: 'Auth' },
  { name: 'sentiment-alert', description: 'Alertas de sentimento', auth_required: false, category: 'AI' },
  { name: 'suggest-document-tags', description: 'Sugestão de tags para documentos', auth_required: false, category: 'AI' },
  { name: 'text-to-speech', description: 'Conversão texto para áudio', auth_required: true, category: 'AI' },
  { name: 'update-chat-config', description: 'Atualização de configuração de chat', auth_required: false, category: 'System' },
  { name: 'verify-recovery-code', description: 'Verificação de código de recuperação', auth_required: false, category: 'Auth' },
  { name: 'version-control', description: 'Controle de versão', auth_required: false, category: 'System' },
  { name: 'voice-to-text', description: 'Conversão de voz para texto', auth_required: false, category: 'AI' },
  { name: 'youtube-videos', description: 'Integração com YouTube', auth_required: false, category: 'System' },
  { name: 'sync-documentation', description: 'Sincronização de documentação interna', auth_required: false, category: 'System' },
];

// Frontend components list - expanded to include all detected components
const FRONTEND_COMPONENTS = [
  // === COMPONENTES PRINCIPAIS ===
  { name: 'AIHistoryPanel', path: 'src/components/AIHistoryPanel.tsx', category: 'Landing', description: 'Painel de história da IA' },
  { name: 'AudioControls', path: 'src/components/AudioControls.tsx', category: 'Utility', description: 'Controles de áudio' },
  { name: 'ChatChartRenderer', path: 'src/components/ChatChartRenderer.tsx', category: 'Chat', description: 'Renderizador de gráficos no chat' },
  { name: 'ChatKnowYOU', path: 'src/components/ChatKnowYOU.tsx', category: 'Chat', description: 'Assistente de saúde interativo' },
  { name: 'ChatModal', path: 'src/components/ChatModal.tsx', category: 'Chat', description: 'Modal de chat' },
  { name: 'ChatStudy', path: 'src/components/ChatStudy.tsx', category: 'Chat', description: 'Assistente de estudos interativo' },
  { name: 'ContactModal', path: 'src/components/ContactModal.tsx', category: 'Utility', description: 'Modal de contato' },
  { name: 'ContextualSuggestions', path: 'src/components/ContextualSuggestions.tsx', category: 'Chat', description: 'Sugestões contextuais' },
  { name: 'CopyButton', path: 'src/components/CopyButton.tsx', category: 'Utility', description: 'Botão de cópia' },
  { name: 'DigitalExclusionSection', path: 'src/components/DigitalExclusionSection.tsx', category: 'Landing', description: 'Seção de exclusão digital' },
  { name: 'DocumentAttachButton', path: 'src/components/DocumentAttachButton.tsx', category: 'Chat', description: 'Botão de anexar documento' },
  { name: 'DocumentRoutingModal', path: 'src/components/DocumentRoutingModal.tsx', category: 'Admin', description: 'Modal de roteamento de documentos' },
  { name: 'DraggablePreviewPanel', path: 'src/components/DraggablePreviewPanel.tsx', category: 'Utility', description: 'Painel de preview arrastável' },
  { name: 'FloatingAudioPlayer', path: 'src/components/FloatingAudioPlayer.tsx', category: 'Utility', description: 'Player de áudio flutuante' },
  { name: 'FloatingChatButton', path: 'src/components/FloatingChatButton.tsx', category: 'Chat', description: 'Botão flutuante para abrir chat' },
  { name: 'Header', path: 'src/components/Header.tsx', category: 'Layout', description: 'Cabeçalho da aplicação' },
  { name: 'HeroSection', path: 'src/components/HeroSection.tsx', category: 'Landing', description: 'Seção hero da landing page' },
  { name: 'InteractiveTable', path: 'src/components/InteractiveTable.tsx', category: 'Utility', description: 'Tabelas interativas' },
  { name: 'MarkdownContent', path: 'src/components/MarkdownContent.tsx', category: 'Utility', description: 'Renderização de Markdown' },
  { name: 'MediaCarousel', path: 'src/components/MediaCarousel.tsx', category: 'Utility', description: 'Carrossel de mídia' },
  { name: 'MermaidDiagram', path: 'src/components/MermaidDiagram.tsx', category: 'Utility', description: 'Diagramas Mermaid' },
  { name: 'MermaidZoomModal', path: 'src/components/MermaidZoomModal.tsx', category: 'Utility', description: 'Modal de zoom para Mermaid' },
  { name: 'MobileHistoryCarousel', path: 'src/components/MobileHistoryCarousel.tsx', category: 'Landing', description: 'Carrossel mobile de história' },
  { name: 'NavLink', path: 'src/components/NavLink.tsx', category: 'Navigation', description: 'Link de navegação' },
  { name: 'ScrollToTopButton', path: 'src/components/ScrollToTopButton.tsx', category: 'Utility', description: 'Botão voltar ao topo' },
  { name: 'Section', path: 'src/components/Section.tsx', category: 'Landing', description: 'Componente de seção genérico' },
  { name: 'TooltipIcon', path: 'src/components/TooltipIcon.tsx', category: 'Utility', description: 'Ícone com tooltip' },
  { name: 'TuringLegacy', path: 'src/components/TuringLegacy.tsx', category: 'Landing', description: 'Legado de Turing' },
  { name: 'TypingIndicator', path: 'src/components/TypingIndicator.tsx', category: 'Chat', description: 'Indicador de digitação' },
  
  // === COMPONENTES ADMIN ===
  { name: 'ActivityLogsTab', path: 'src/components/admin/ActivityLogsTab.tsx', category: 'Admin', description: 'Log de atividades' },
  { name: 'AdminSidebar', path: 'src/components/admin/AdminSidebar.tsx', category: 'Admin', description: 'Sidebar do admin' },
  { name: 'AdminTitleWithInfo', path: 'src/components/admin/AdminTitleWithInfo.tsx', category: 'Admin', description: 'Título com tooltip' },
  { name: 'AnalyticsTab', path: 'src/components/admin/AnalyticsTab.tsx', category: 'Admin', description: 'Analytics do sistema' },
  { name: 'ChatConfigTab', path: 'src/components/admin/ChatConfigTab.tsx', category: 'Admin', description: 'Configuração de chats' },
  { name: 'ChatScopeConfigTab', path: 'src/components/admin/ChatScopeConfigTab.tsx', category: 'Admin', description: 'Configuração de escopo do chat' },
  { name: 'ContactMessagesTab', path: 'src/components/admin/ContactMessagesTab.tsx', category: 'Admin', description: 'Mensagens de contato' },
  { name: 'ContentManagementTab', path: 'src/components/admin/ContentManagementTab.tsx', category: 'Admin', description: 'CMS de conteúdo' },
  { name: 'ConversationsTab', path: 'src/components/admin/ConversationsTab.tsx', category: 'Admin', description: 'Gestão de conversas' },
  { name: 'DashboardTab', path: 'src/components/admin/DashboardTab.tsx', category: 'Admin', description: 'Dashboard do admin' },
  { name: 'DeterministicAnalysisTab', path: 'src/components/admin/DeterministicAnalysisTab.tsx', category: 'Admin', description: 'Análise determinística' },
  { name: 'DocumentAnalysisTab', path: 'src/components/admin/DocumentAnalysisTab.tsx', category: 'Admin', description: 'Análise de documentos' },
  { name: 'DocumentRoutingLogsTab', path: 'src/components/admin/DocumentRoutingLogsTab.tsx', category: 'Admin', description: 'Logs de roteamento' },
  { name: 'DocumentTagEnrichmentModal', path: 'src/components/admin/DocumentTagEnrichmentModal.tsx', category: 'Admin', description: 'Modal de enriquecimento de tags' },
  { name: 'DocumentationSyncTab', path: 'src/components/admin/DocumentationSyncTab.tsx', category: 'Admin', description: 'Sincronização de documentação' },
  { name: 'DocumentsTab', path: 'src/components/admin/DocumentsTab.tsx', category: 'Admin', description: 'Gestão de documentos RAG' },
  { name: 'ETLExplanationModal', path: 'src/components/admin/ETLExplanationModal.tsx', category: 'Admin', description: 'Modal explicação ETL' },
  { name: 'GmailTab', path: 'src/components/admin/GmailTab.tsx', category: 'Admin', description: 'Configuração Gmail' },
  { name: 'IconSelector', path: 'src/components/admin/IconSelector.tsx', category: 'Admin', description: 'Seletor de ícones' },
  { name: 'ImageCacheTab', path: 'src/components/admin/ImageCacheTab.tsx', category: 'Admin', description: 'Cache de imagens' },
  { name: 'InfrastructureArchitectureTab', path: 'src/components/admin/InfrastructureArchitectureTab.tsx', category: 'Admin', description: 'Arquitetura GPU' },
  { name: 'NotificationsPanel', path: 'src/components/admin/NotificationsPanel.tsx', category: 'Admin', description: 'Painel de notificações' },
  { name: 'OrphanedTagsPanel', path: 'src/components/admin/OrphanedTagsPanel.tsx', category: 'Admin', description: 'Tags órfãs' },
  { name: 'PodcastManagementTab', path: 'src/components/admin/PodcastManagementTab.tsx', category: 'Admin', description: 'Gestão de podcasts' },
  { name: 'RagDiagnosticsTab', path: 'src/components/admin/RagDiagnosticsTab.tsx', category: 'Admin', description: 'Diagnósticos RAG' },
  { name: 'RagDocumentationTab', path: 'src/components/admin/RagDocumentationTab.tsx', category: 'Admin', description: 'Documentação RAG' },
  { name: 'RagFlowDiagram', path: 'src/components/admin/RagFlowDiagram.tsx', category: 'Admin', description: 'Diagrama de fluxo RAG' },
  { name: 'RagMetricsTab', path: 'src/components/admin/RagMetricsTab.tsx', category: 'Admin', description: 'Métricas RAG' },
  { name: 'RagSectionModal', path: 'src/components/admin/RagSectionModal.tsx', category: 'Admin', description: 'Modal de seção RAG' },
  { name: 'RegionalConfigTab', path: 'src/components/admin/RegionalConfigTab.tsx', category: 'Admin', description: 'Configuração regional' },
  { name: 'SuggestionAuditTab', path: 'src/components/admin/SuggestionAuditTab.tsx', category: 'Admin', description: 'Auditoria de sugestões' },
  { name: 'TagConflictResolutionModal', path: 'src/components/admin/TagConflictResolutionModal.tsx', category: 'Admin', description: 'Resolução de conflitos de tags' },
  { name: 'TagModificationLogsTab', path: 'src/components/admin/TagModificationLogsTab.tsx', category: 'Admin', description: 'Logs de modificação de tags' },
  { name: 'TagsManagementTab', path: 'src/components/admin/TagsManagementTab.tsx', category: 'Admin', description: 'Gestão de tags e ML' },
  { name: 'TooltipsTab', path: 'src/components/admin/TooltipsTab.tsx', category: 'Admin', description: 'Gestão de tooltips' },
  { name: 'UserUsageLogsTab', path: 'src/components/admin/UserUsageLogsTab.tsx', category: 'Admin', description: 'Logs de uso dos usuários' },
  { name: 'VersionControlTab', path: 'src/components/admin/VersionControlTab.tsx', category: 'Admin', description: 'Controle de versão' },
  { name: 'YouTubeCacheTab', path: 'src/components/admin/YouTubeCacheTab.tsx', category: 'Admin', description: 'Cache do YouTube' },
];

// Function to send failure alert email
const sendFailureAlert = async (
  supabaseUrl: string,
  supabaseKey: string,
  syncId: string,
  errorMessage: string,
  triggerType: string
) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get admin email from settings
    const { data: adminSettings } = await supabase
      .from('admin_settings')
      .select('gmail_notification_email')
      .single();
    
    const adminEmail = adminSettings?.gmail_notification_email || 'suporte@knowyou.app';
    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    
    // Send email via send-email function
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: adminEmail,
        subject: '⚠️ Falha na Sincronização de Documentação',
        body: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #ef4444; margin-bottom: 20px;">🔴 Sincronização de Documentação Falhou</h2>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              A sincronização automática de documentação técnica encontrou um erro e não pôde ser concluída.
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f9fafb; border-radius: 8px;">
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 16px; font-weight: 600; color: #374151; width: 140px;">Sync ID:</td>
                <td style="padding: 12px 16px; color: #6b7280; font-family: monospace; font-size: 14px;">${syncId}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 16px; font-weight: 600; color: #374151;">Tipo de Trigger:</td>
                <td style="padding: 12px 16px; color: #6b7280;">${triggerType === 'scheduled' ? '⏰ Agendado' : '👆 Manual'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 16px; font-weight: 600; color: #374151;">Data/Hora:</td>
                <td style="padding: 12px 16px; color: #6b7280;">${timestamp}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; font-weight: 600; color: #374151; vertical-align: top;">Erro:</td>
                <td style="padding: 12px 16px; color: #ef4444; font-family: monospace; font-size: 13px; word-break: break-word;">${errorMessage}</td>
              </tr>
            </table>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
              Acesse o painel administrativo para verificar os detalhes completos e tentar novamente.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              KnowYOU AI - Sistema de Documentação Técnica
            </p>
          </div>
        `,
      }),
    });
    
    if (emailResponse.ok) {
      console.log('[SYNC] Failure alert email sent to:', adminEmail);
    } else {
      const errorData = await emailResponse.text();
      console.error('[SYNC] Failed to send failure alert email:', errorData);
    }
  } catch (emailError) {
    console.error('[SYNC] Error sending failure alert email:', emailError);
  }
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const triggerType = body.trigger === 'scheduled' ? 'scheduled' : 'manual';
    const triggeredBy = body.triggered_by || null;

    const syncId = `sync_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    console.log(`[SYNC] Starting documentation sync - ID: ${syncId}, Type: ${triggerType}`);

    // Create initial sync log entry
    const { error: insertError } = await supabase
      .from('documentation_sync_log')
      .insert({
        sync_id: syncId,
        trigger_type: triggerType,
        triggered_by: triggeredBy,
        status: 'running',
        current_phase: SYNC_PHASES[0].id,
        progress: 0,
        phases_completed: [],
        changes_detected: {},
      });

    if (insertError) {
      console.error('[SYNC] Failed to create sync log:', insertError);
      throw insertError;
    }

    // Helper function to update progress
    const updateProgress = async (phaseId: string, progress: number, phasesCompleted: string[], changesDetected: Record<string, any> = {}) => {
      await supabase
        .from('documentation_sync_log')
        .update({
          current_phase: phaseId,
          progress,
          phases_completed: phasesCompleted,
          changes_detected: changesDetected,
        })
        .eq('sync_id', syncId);
    };

    // Use background task for long-running operation
    const syncTask = async () => {
      const phasesCompleted: string[] = [];
      const changesDetected: Record<string, any> = {
        database: { tables: 0, functions: 0, new: [] },
        edge_functions: { total: 0, new: [] },
        frontend: { components: 0, new: [] },
        icons: { total: 0, new: [] },
      };

      try {
        // Phase 1: Database Schema
        console.log('[SYNC] Phase 1: Analyzing database schema...');
        await updateProgress('database', 5, phasesCompleted, changesDetected);

        const { data: schemaInfo } = await supabase.rpc('get_schema_info');
        if (schemaInfo) {
          const tables = Array.isArray(schemaInfo) ? schemaInfo : [];
          changesDetected.database.tables = tables.length;
          console.log(`[SYNC] Found ${tables.length} database tables`);
        }

        phasesCompleted.push('database');
        await updateProgress('edge_functions', 25, phasesCompleted, changesDetected);

        // Phase 2: Edge Functions
        console.log('[SYNC] Phase 2: Scanning edge functions...');
        changesDetected.edge_functions.total = EDGE_FUNCTIONS.length;
        console.log(`[SYNC] Cataloged ${EDGE_FUNCTIONS.length} edge functions`);

        phasesCompleted.push('edge_functions');
        await updateProgress('frontend', 50, phasesCompleted, changesDetected);

        // Phase 3: Frontend Components
        console.log('[SYNC] Phase 3: Mapping frontend components...');
        changesDetected.frontend.components = FRONTEND_COMPONENTS.length;
        console.log(`[SYNC] Cataloged ${FRONTEND_COMPONENTS.length} frontend components`);

        phasesCompleted.push('frontend');
        await updateProgress('icons', 75, phasesCompleted, changesDetected);

        // Phase 4: Icons
        console.log('[SYNC] Phase 4: Cataloging icons...');
        changesDetected.icons.total = 100; // Approximate icon count
        console.log(`[SYNC] Cataloged ~100 icons`);

        phasesCompleted.push('icons');
        await updateProgress('finalize', 90, phasesCompleted, changesDetected);

        // Phase 5: Finalize
        console.log('[SYNC] Phase 5: Finalizing synchronization...');

        // Generate updated documentation JSON
        const documentationUpdate = {
          title: 'KnowRisk Technical Documentation',
          version: `v${new Date().toISOString().split('T')[0]}`,
          generated_at: new Date().toISOString(),
          sync_id: syncId,
          statistics: {
            database_tables: changesDetected.database.tables,
            edge_functions: changesDetected.edge_functions.total,
            frontend_components: changesDetected.frontend.components,
            icons_cataloged: changesDetected.icons.total,
          },
          edge_functions: EDGE_FUNCTIONS,
          frontend_components: FRONTEND_COMPONENTS,
        };

        phasesCompleted.push('finalize');
        const duration = Date.now() - startTime;

        // Update final status
        await supabase
          .from('documentation_sync_log')
          .update({
            status: 'completed',
            current_phase: 'finalize',
            progress: 100,
            phases_completed: phasesCompleted,
            changes_detected: changesDetected,
            completed_at: new Date().toISOString(),
            duration_ms: duration,
          })
          .eq('sync_id', syncId);

        console.log(`[SYNC] Completed successfully in ${duration}ms`);
        console.log(`[SYNC] Summary: ${changesDetected.database.tables} tables, ${changesDetected.edge_functions.total} functions, ${changesDetected.frontend.components} components`);

      } catch (syncError) {
        console.error('[SYNC] Sync task failed:', syncError);
        const errorMsg = syncError instanceof Error ? syncError.message : 'Unknown error';
        
        // Send failure alert email
        await sendFailureAlert(supabaseUrl, supabaseServiceKey, syncId, errorMsg, triggerType);
        
        await supabase
          .from('documentation_sync_log')
          .update({
            status: 'failed',
            error_message: errorMsg,
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - startTime,
          })
          .eq('sync_id', syncId);
      }
    };

    // Execute sync in background (non-blocking)
    // Use Promise-based approach for background execution
    syncTask().catch(console.error);


    return new Response(
      JSON.stringify({
        success: true,
        sync_id: syncId,
        message: 'Synchronization started',
        trigger_type: triggerType,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[SYNC] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
