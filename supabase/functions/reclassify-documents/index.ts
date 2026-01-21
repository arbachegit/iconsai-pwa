// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface ReclassifyRequest {
  action: 'start' | 'status' | 'process_batch' | 'apply' | 'cancel' | 'stats';
  jobId?: string;
  filter?: 'no_taxonomy' | 'pending_classification' | 'low_confidence' | 'all';
  batchSize?: number;
  autoApproveThreshold?: number;
  batch?: Array<{
    document_id: string;
    taxonomy_codes: string[];
    source?: string;
    confidence?: number;
  }>;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const request: ReclassifyRequest = await req.json();
    const { action } = request;

    console.log(`[reclassify-documents] Action: ${action}`, request);

    switch (action) {
      case 'stats': {
        // Retorna estatísticas de cobertura
        const { data: stats, error } = await supabase.rpc('get_taxonomy_coverage_stats');
        
        if (error) {
          console.error('[reclassify-documents] Error fetching stats:', error);
          throw error;
        }

        return new Response(JSON.stringify({
          success: true,
          stats: stats?.[0] || null
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'start': {
        const { filter = 'no_taxonomy', batchSize = 10, autoApproveThreshold = 0.9 } = request;

        // Conta documentos para o filtro
        const { data: countResult, error: countError } = await supabase
          .rpc('count_documents_for_reclassification', { p_filter: filter });

        if (countError) {
          console.error('[reclassify-documents] Error counting documents:', countError);
          throw countError;
        }

        const totalDocuments = countResult || 0;

        if (totalDocuments === 0) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Nenhum documento encontrado para o filtro selecionado'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Cria o job
        const { data: job, error: jobError } = await supabase
          .from('reclassification_jobs')
          .insert({
            filter,
            batch_size: batchSize,
            auto_approve_threshold: autoApproveThreshold,
            status: 'processing',
            total_documents: totalDocuments,
            processed_documents: 0,
            auto_approved_count: 0,
            pending_review_count: 0,
            error_count: 0,
            current_batch: 0,
            started_at: new Date().toISOString()
          })
          .select()
          .single();

        if (jobError) {
          console.error('[reclassify-documents] Error creating job:', jobError);
          throw jobError;
        }

        console.log(`[reclassify-documents] Job created: ${job.id}, total: ${totalDocuments}`);

        return new Response(JSON.stringify({
          success: true,
          job,
          message: `Job iniciado para ${totalDocuments} documentos`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'status': {
        const { jobId } = request;
        
        if (!jobId) {
          // Retorna o job mais recente
          const { data: jobs, error } = await supabase
            .from('reclassification_jobs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

          if (error) throw error;

          return new Response(JSON.stringify({
            success: true,
            job: jobs?.[0] || null
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: job, error } = await supabase
          .from('reclassification_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          job
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'process_batch': {
        const { jobId } = request;
        
        if (!jobId) {
          throw new Error('jobId is required for process_batch');
        }

        // Busca o job
        const { data: job, error: jobError } = await supabase
          .from('reclassification_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (jobError || !job) {
          throw new Error('Job não encontrado');
        }

        if (job.status !== 'processing') {
          return new Response(JSON.stringify({
            success: false,
            message: 'Job não está em processamento'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Busca próximo lote de documentos
        const offset = job.processed_documents;
        const { data: documents, error: docsError } = await supabase.rpc(
          'get_documents_for_reclassification',
          {
            p_filter: job.filter,
            p_limit: job.batch_size,
            p_offset: offset
          }
        );

        if (docsError) {
          console.error('[reclassify-documents] Error fetching documents:', docsError);
          throw docsError;
        }

        if (!documents || documents.length === 0) {
          // Job concluído
          await supabase
            .from('reclassification_jobs')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', jobId);

          return new Response(JSON.stringify({
            success: true,
            message: 'Job concluído',
            completed: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        let autoApproved = 0;
        let pendingReview = 0;
        let errors = 0;
        const errorList: any[] = [];

        // Processa cada documento
        for (const doc of documents) {
          try {
            console.log(`[reclassify-documents] Processing: ${doc.filename}`);

            // Chama suggest-document-tags
            const suggestResponse = await fetch(`${supabaseUrl}/functions/v1/suggest-document-tags`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                documentId: doc.document_id,
                text: doc.ai_summary || doc.text_preview || '',
                chatType: doc.target_chat,
                saveSuggestions: true
              })
            });

            if (!suggestResponse.ok) {
              throw new Error(`suggest-document-tags failed: ${suggestResponse.status}`);
            }

            const suggestions = await suggestResponse.json();
            console.log(`[reclassify-documents] Suggestions for ${doc.filename}:`, suggestions);

            if (suggestions.suggestions && suggestions.suggestions.length > 0) {
              // Filtra sugestões com confiança >= threshold para auto-aprovar
              const toAutoApprove = suggestions.suggestions.filter(
                (s: any) => s.confidence >= job.auto_approve_threshold
              );

              if (toAutoApprove.length > 0) {
                // Auto-aprova inserindo em entity_tags
                const batch = [{
                  document_id: doc.document_id,
                  taxonomy_codes: toAutoApprove.map((s: any) => s.code),
                  source: 'ai_auto',
                  confidence: Math.min(...toAutoApprove.map((s: any) => s.confidence))
                }];

                const { data: applyResult, error: applyError } = await supabase.rpc(
                  'apply_batch_taxonomy',
                  { p_batch: batch }
                );

                if (applyError) {
                  console.error('[reclassify-documents] Error applying taxonomy:', applyError);
                  errors++;
                  errorList.push({ document_id: doc.document_id, error: applyError.message });
                } else {
                  autoApproved++;
                  console.log(`[reclassify-documents] Auto-approved: ${doc.filename}`);
                }
              } else {
                // Marca para revisão (sugestões já foram salvas em ml_tag_suggestions)
                pendingReview++;
                console.log(`[reclassify-documents] Marked for review: ${doc.filename}`);
              }
            } else {
              // Sem sugestões - marca para revisão manual
              pendingReview++;
            }

          } catch (docError: any) {
            console.error(`[reclassify-documents] Error processing ${doc.filename}:`, docError);
            errors++;
            errorList.push({ document_id: doc.document_id, error: docError.message });
          }
        }

        // Atualiza o job
        const newProcessed = job.processed_documents + documents.length;
        const isComplete = newProcessed >= job.total_documents;

        await supabase
          .from('reclassification_jobs')
          .update({
            processed_documents: newProcessed,
            auto_approved_count: job.auto_approved_count + autoApproved,
            pending_review_count: job.pending_review_count + pendingReview,
            error_count: job.error_count + errors,
            current_batch: job.current_batch + 1,
            errors: [...(job.errors || []), ...errorList],
            status: isComplete ? 'completed' : 'processing',
            completed_at: isComplete ? new Date().toISOString() : null
          })
          .eq('id', jobId);

        return new Response(JSON.stringify({
          success: true,
          processed: documents.length,
          autoApproved,
          pendingReview,
          errors,
          completed: isComplete,
          progress: Math.round((newProcessed / job.total_documents) * 100)
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'apply': {
        const { batch } = request;
        
        if (!batch || !Array.isArray(batch) || batch.length === 0) {
          throw new Error('batch is required and must be a non-empty array');
        }

        const { data: result, error } = await supabase.rpc('apply_batch_taxonomy', {
          p_batch: batch
        });

        if (error) {
          console.error('[reclassify-documents] Error applying batch:', error);
          throw error;
        }

        return new Response(JSON.stringify({
          success: true,
          result: result?.[0] || { success_count: 0, error_count: 0, errors: [] }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'cancel': {
        const { jobId } = request;
        
        if (!jobId) {
          throw new Error('jobId is required for cancel');
        }

        await supabase
          .from('reclassification_jobs')
          .update({
            status: 'cancelled',
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId);

        return new Response(JSON.stringify({
          success: true,
          message: 'Job cancelado'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error: any) {
    console.error('[reclassify-documents] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
