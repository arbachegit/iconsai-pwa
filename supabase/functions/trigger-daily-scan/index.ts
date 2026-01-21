// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

/**
 * This Edge Function is called by pg_cron at 3:00 AM daily
 * It triggers the security-integrity-scan function and logs the result
 */
serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[TRIGGER-DAILY-SCAN] Starting scheduled security scan at', new Date().toISOString());

    // Call the security-integrity-scan function
    const { data, error } = await supabase.functions.invoke('security-integrity-scan', {
      body: { trigger: 'scheduled' }
    });

    if (error) {
      console.error('[TRIGGER-DAILY-SCAN] Error invoking security scan:', error);
      
      // Log the error to admin_settings
      await supabase.from('admin_settings')
        .update({ 
          last_scheduler_error: `Scan failed at ${new Date().toISOString()}: ${error.message}`,
          last_scheduled_scan: new Date().toISOString()
        })
        .not('id', 'is', null);

      throw error;
    }

    const duration = Date.now() - startTime;
    console.log(`[TRIGGER-DAILY-SCAN] Scan completed successfully in ${duration}ms`);
    console.log('[TRIGGER-DAILY-SCAN] Result:', JSON.stringify(data));

    // Update admin_settings with success status
    await supabase.from('admin_settings')
      .update({ 
        last_scheduled_scan: new Date().toISOString(),
        last_scheduler_error: null // Clear any previous errors
      })
      .not('id', 'is', null);

    // Send notification via dispatcher if configured
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('email_enabled, whatsapp_enabled')
      .eq('event_type', 'scan_complete')
      .single();

    if (prefs?.email_enabled || prefs?.whatsapp_enabled) {
      // Get template for scan_complete
      const { data: template } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('event_type', 'scan_complete')
        .single();

      const { data: settings } = await supabase
        .from('admin_settings')
        .select('gmail_notification_email, whatsapp_target_phone, whatsapp_global_enabled, email_global_enabled')
        .single();

      const eventDetails = `Status: ${data?.overall_status || 'unknown'} | Críticos: ${data?.findings_summary?.critical || 0} | Avisos: ${data?.findings_summary?.warning || 0}`;
      const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      // Send email if enabled
      if (prefs.email_enabled && (settings as any)?.email_global_enabled && settings?.gmail_notification_email) {
        const emailSubject = template?.email_subject?.replace('{event_details}', eventDetails).replace('{timestamp}', timestamp) 
          || '🔍 Scan de Segurança Concluído';
        const emailBody = template?.email_body?.replace('{event_details}', eventDetails).replace('{timestamp}', timestamp)
          || `Scan finalizado: ${eventDetails}`;

        await supabase.functions.invoke('send-email', {
          body: {
            to: settings.gmail_notification_email,
            subject: emailSubject,
            body: emailBody
          }
        });
        console.log('[TRIGGER-DAILY-SCAN] Email notification sent');
      }

      // Send WhatsApp if enabled
      if (prefs.whatsapp_enabled && settings?.whatsapp_global_enabled && settings?.whatsapp_target_phone) {
        const whatsappMessage = template?.whatsapp_message?.replace('{event_details}', eventDetails).replace('{timestamp}', timestamp)
          || `🔍 Scan Completo\n\n${eventDetails}\n\nConcluído em: ${timestamp}`;

        await supabase.functions.invoke('send-whatsapp', {
          body: {
            phoneNumber: settings.whatsapp_target_phone,
            message: whatsappMessage,
            eventType: 'scan_complete'
          }
        });
        console.log('[TRIGGER-DAILY-SCAN] WhatsApp notification sent');
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Scheduled scan completed successfully',
      scan_result: data,
      duration_ms: duration
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[TRIGGER-DAILY-SCAN] Fatal error:', errorMessage);

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      duration_ms: Date.now() - startTime
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
