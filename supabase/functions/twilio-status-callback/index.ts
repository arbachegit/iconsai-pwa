// ============================================
// VERSAO: 3.4.0 | DEPLOY: 2026-01-14
// FIX: URL atualizada para pwa.iconsai.ai
// ============================================

const FUNCTION_VERSION = "3.4.0";
const SITE_URL = "https://pwa.iconsai.ai";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

/**
 * Twilio Status Callback Endpoint
 * 
 * Receives delivery status updates from Twilio for WhatsApp/SMS messages.
 * Updates the notification_logs table with the final delivery status.
 * Triggers SMS fallback when WhatsApp delivery fails.
 * 
 * Twilio sends these statuses in order:
 * - queued: Message is queued to be sent
 * - sent: Message has been sent to the carrier
 * - delivered: Message was delivered to the recipient
 * - read: Message was read (WhatsApp only)
 * - undelivered: Message could not be delivered
 * - failed: Message failed to send
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log(`=== TWILIO STATUS CALLBACK v${FUNCTION_VERSION} START ===`);

  try {
    // Twilio sends data as application/x-www-form-urlencoded
    // Use text() + URLSearchParams for robust parsing
    const bodyText = await req.text();
    const formData = new URLSearchParams(bodyText);
    
    // Extract Twilio status data
    const messageSid = formData.get('MessageSid');
    const messageStatus = formData.get('MessageStatus');
    const errorCode = formData.get('ErrorCode');
    const errorMessage = formData.get('ErrorMessage');
    const to = formData.get('To');
    const from = formData.get('From');

    console.log('📬 Status callback received:', {
      messageSid,
      messageStatus,
      errorCode: errorCode || 'none',
      to: to?.slice(0, 10) + '***',
    });

    if (!messageSid || !messageStatus) {
      console.error('❌ Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing MessageSid or MessageStatus' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Map Twilio status to our final_status
    let finalStatus: string | null = null;
    const isSuccess = ['delivered', 'read'].includes(messageStatus);
    const isFailed = ['undelivered', 'failed'].includes(messageStatus);
    
    if (isSuccess || isFailed) {
      finalStatus = messageStatus;
    }
    // For 'queued', 'sent', 'sending' we update provider_status but not final_status

    // Find and update the notification log by message_sid
    const { data: existingLog, error: findError } = await supabase
      .from('notification_logs')
      .select('id, delivery_attempts, metadata, recipient, channel')
      .eq('message_sid', messageSid)
      .maybeSingle();

    if (findError) {
      console.error('❌ Error finding log:', findError);
      // Don't fail - Twilio will retry if we return error
    }

    if (existingLog) {
      console.log(`✅ Found notification log: ${existingLog.id}`);
      
      // Prepare update data
      const updateData: Record<string, unknown> = {
        provider_status: messageStatus,
        delivery_attempts: (existingLog.delivery_attempts || 0) + 1,
      };

      // Only update final_status if it's a terminal status
      if (finalStatus) {
        updateData.final_status = finalStatus;
        updateData.final_status_at = new Date().toISOString();
      }

      // Add error info if present
      if (errorCode) {
        updateData.provider_error_code = errorCode;
      }
      if (errorMessage && isFailed) {
        updateData.error_message = errorMessage;
        updateData.status = 'failed';
      }
      if (isSuccess) {
        updateData.status = 'success';
      }

      const { error: updateError } = await supabase
        .from('notification_logs')
        .update(updateData)
        .eq('id', existingLog.id);

      if (updateError) {
        console.error('❌ Error updating log:', updateError);
      } else {
        console.log(`✅ Updated notification log: ${existingLog.id} -> ${messageStatus}`);
      }

      // =====================================================
      // FALLBACK SMS: Se WhatsApp falhou, tentar SMS via Infobip
      // =====================================================
      if (isFailed && existingLog.channel === 'whatsapp') {
        const metadata = existingLog.metadata as Record<string, unknown> | null;
        const alreadyUsedFallback = metadata?.fallback_used === true;
        const phoneNumber = existingLog.recipient || (metadata?.phone as string);
        const templateName = (metadata?.template as string) || (metadata?.templateName as string);
        
        if (!alreadyUsedFallback && phoneNumber && templateName) {
          console.log(`\n🔄 [FALLBACK] WhatsApp falhou, tentando SMS...`);
          console.log(`[FALLBACK] Phone: ${phoneNumber?.slice(0, 5)}***`);
          console.log(`[FALLBACK] Template: ${templateName}`);
          
          try {
            // Recuperar variaveis do metadata
            const variables = (metadata?.variables as Record<string, string>) || {};
            
            // Montar mensagem SMS baseada no template
            // Função auxiliar para montar URL completa
            const buildUrl = (path: string) => {
              if (!path) return `${SITE_URL}/pwa`;
              if (path.startsWith("http")) return path;
              return `${SITE_URL}/${path.startsWith("/") ? path.slice(1) : path}`;
            };
            
            let smsText = "";
            switch (templateName) {
              case "otp":
              case "resend_code":
                smsText = `KnowYOU: Seu codigo de verificacao e ${variables["1"]}. Valido por 10 minutos.`;
                break;
              case "welcome":
                smsText = `KnowYOU: Ola ${variables["1"] || "Usuario"}! Bem-vindo ao KnowYOU. Acesse: ${buildUrl(variables["2"] || "login")}`;
                break;
              case "resend_welcome":
                smsText = `KnowYOU: Ola ${variables["1"] || "Usuario"}! Notamos que voce ainda nao acessou. Entre em: ${buildUrl(variables["2"] || "login")}`;
                break;
              case "invitation":
                smsText = `KnowYOU: ${variables["1"] || "Voce"} foi convidado por ${variables["2"] || "Equipe KnowYOU"}! Acesse: ${buildUrl(variables["3"] || "")}`;
                break;
              default:
                smsText = `KnowYOU: ${Object.values(variables).join(" ")}`;
            }

            // Enviar SMS via Infobip
            const smsResponse = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                phoneNumber: phoneNumber,
                message: smsText,
                eventType: "whatsapp_fallback",
              }),
            });

            const smsResult = await smsResponse.json();
            console.log(`[FALLBACK] SMS result:`, JSON.stringify(smsResult));

            // Atualizar log com fallback
            await supabase
              .from('notification_logs')
              .update({
                metadata: {
                  ...metadata,
                  fallback_used: true,
                  fallback_channel: 'sms',
                  fallback_result: smsResult,
                  fallback_at: new Date().toISOString(),
                }
              })
              .eq('id', existingLog.id);

            // Criar novo log para o SMS fallback
            await supabase.from('notification_logs').insert({
              event_type: 'whatsapp_fallback',
              channel: 'sms',
              recipient: phoneNumber,
              subject: `SMS Fallback (WhatsApp ${messageStatus})`,
              message_body: smsText,
              status: smsResult.success ? 'success' : 'failed',
              error_message: smsResult.error || null,
              metadata: {
                template: templateName,
                phone: phoneNumber,
                original_message_sid: messageSid,
                original_error_code: errorCode,
                original_error_message: errorMessage,
                variables,
              },
            });

            console.log(`✅ [FALLBACK] SMS enviado com sucesso`);
          } catch (fallbackError) {
            console.error(`❌ [FALLBACK] Erro ao enviar SMS:`, fallbackError);
            
            // Registrar falha do fallback
            await supabase
              .from('notification_logs')
              .update({
                metadata: {
                  ...metadata,
                  fallback_used: true,
                  fallback_failed: true,
                  fallback_error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
                }
              })
              .eq('id', existingLog.id);
          }
        } else if (alreadyUsedFallback) {
          console.log(`⚠️ [FALLBACK] Já foi usado anteriormente, não reenviar`);
        }
      }
    } else {
      console.log(`⚠️ No notification log found for SID: ${messageSid}`);
      
      // If no log found, create one for tracking purposes
      const { error: insertError } = await supabase
        .from('notification_logs')
        .insert({
          event_type: 'status_callback',
          channel: from?.includes('whatsapp') ? 'whatsapp' : 'sms',
          recipient: to?.replace('whatsapp:', '') || 'unknown',
          subject: 'Status callback (orphan)',
          message_body: `Twilio status update received for unknown message`,
          status: isSuccess ? 'success' : (isFailed ? 'failed' : 'pending'),
          message_sid: messageSid,
          provider_status: messageStatus,
          final_status: finalStatus,
          final_status_at: finalStatus ? new Date().toISOString() : null,
          provider_error_code: errorCode,
          error_message: errorMessage,
          metadata: { orphan: true, from, to },
        });

      if (insertError) {
        console.error('❌ Error creating orphan log:', insertError);
      } else {
        console.log('📝 Created orphan log for tracking');
      }
    }

    console.log(`=== TWILIO STATUS CALLBACK v${FUNCTION_VERSION} END ===`);

    // Twilio expects 200 OK
    return new Response('OK', { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('=== TWILIO STATUS CALLBACK ERROR ===', error);
    
    // Still return 200 to prevent Twilio from retrying
    return new Response('OK', { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
    });
  }
});
