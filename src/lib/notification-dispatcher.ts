import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export type NotificationEventType = 
  | 'new_document'
  | 'document_failed'
  | 'new_contact_message'
  | 'security_alert'
  | 'ml_accuracy_drop'
  | 'new_conversation'
  // Security & Auth
  | 'password_reset'
  | 'login_alert'
  // Data Intelligence
  | 'sentiment_alert'
  | 'taxonomy_anomaly'
  // User Registration
  | 'user_registration_request'
  | 'user_registration_approved'
  | 'user_registration_rejected'
  // API Testing
  | 'api_ready_for_implementation';

interface NotificationTemplate {
  id: string;
  event_type: string;
  platform_name: string;
  email_subject: string | null;
  email_body: string | null;
  whatsapp_message: string | null;
  variables_available: string[];
}

interface NotificationPayload {
  eventType: NotificationEventType;
  subject: string;
  message: string;
  metadata?: Record<string, string>;
}

interface DispatchResult {
  emailSent: boolean;
  whatsappSent: boolean;
  errors: string[];
}

/**
 * Replace template variables with actual values
 */
function injectVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }
  return result;
}

/**
 * Get custom template from database or return default fallback
 */
async function getTemplate(eventType: NotificationEventType): Promise<NotificationTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('event_type', eventType)
      .single();

    if (error) {
      logger.warn('[NotificationDispatcher] Template not found, using defaults for:', eventType);
      return null;
    }

    return data as NotificationTemplate;
  } catch (error) {
    logger.error('[NotificationDispatcher] Error fetching template:', error);
    return null;
  }
}

/**
 * Dispatches notifications based on user preferences for the given event type.
 * Checks the notification_preferences table and sends via enabled channels.
 * Uses custom templates from notification_templates table when available.
 */
export async function dispatchNotification(payload: NotificationPayload): Promise<DispatchResult> {
  const result: DispatchResult = {
    emailSent: false,
    whatsappSent: false,
    errors: []
  };

  // Force logging helper - always logs attempts even on early failures
  const forceLog = async (status: 'blocked' | 'success' | 'failed', channel: string, recipient: string, errorMessage?: string) => {
    try {
      await supabase.from('notification_logs').insert({
        event_type: payload.eventType,
        channel: channel,
        recipient: recipient || 'unknown',
        subject: payload.subject,
        message_body: payload.message.substring(0, 500),
        status: status,
        error_message: errorMessage || null,
        metadata: { 
          source: 'dispatcher',
          variables: payload.metadata || {},
          forced_log: true
        }
      });
    } catch (logError) {
      logger.error('[NotificationDispatcher] Force log failed:', logError);
    }
  };

  try {
    // Check notification preferences for this event type
    const { data: prefData, error: prefError } = await supabase
      .from('notification_preferences')
      .select('email_enabled, whatsapp_enabled')
      .eq('event_type', payload.eventType)
      .single();

    if (prefError) {
      logger.error('[NotificationDispatcher] Error fetching preferences:', prefError);
      result.errors.push(`Preference fetch error: ${prefError.message}`);
      // FORCE LOG: Log the blocked attempt due to RLS/preferences error
      await forceLog('blocked', 'system', 'N/A', `RLS/Preferences error: ${prefError.message}`);
      return result;
    }

    if (!prefData) {
      logger.log('[NotificationDispatcher] No preferences found for event:', payload.eventType);
      await forceLog('blocked', 'system', 'N/A', `No preferences found for event: ${payload.eventType}`);
      return result;
    }

    // Get admin settings for email and phone targets
    const { data: settings, error: settingsError } = await supabase
      .from('admin_settings')
      .select('gmail_notification_email, whatsapp_target_phone, whatsapp_global_enabled, email_global_enabled')
      .single();

    if (settingsError) {
      logger.error('[NotificationDispatcher] Error fetching admin settings:', settingsError);
      result.errors.push(`Settings fetch error: ${settingsError.message}`);
      await forceLog('blocked', 'system', 'N/A', `Admin settings error: ${settingsError.message}`);
      return result;
    }

    // Get custom template
    const template = await getTemplate(payload.eventType);
    
    // Prepare template variables with standard platform name
    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const variables: Record<string, string> = {
      timestamp,
      platform_name: 'Plataforma KnowYOU',
      ...(payload.metadata || {})
    };

    // Check if email_global_enabled (default true if not set)
    const emailGlobalEnabled = (settings as any)?.email_global_enabled !== false;

    // Send email notification if enabled (check global toggle too)
    if (prefData.email_enabled && emailGlobalEnabled && settings?.gmail_notification_email) {
      const emailRecipient = settings.gmail_notification_email;
      let emailSubject = '';
      let emailBody = '';
      let emailStatus: 'success' | 'failed' = 'failed';
      let emailError: string | null = null;

      try {
        // Use custom template or fallback to payload
        emailSubject = template?.email_subject 
          ? injectVariables(template.email_subject, variables)
          : payload.subject;
        emailBody = template?.email_body 
          ? injectVariables(template.email_body, variables)
          : payload.message;

        // Never send empty messages
        if (!emailBody || emailBody.trim() === '') {
          emailError = 'Email body is empty - skipping';
          result.errors.push(emailError);
        } else {
          const { error } = await supabase.functions.invoke('send-email', {
            body: {
              to: emailRecipient,
              subject: emailSubject || `[Plataforma KnowYOU] Notificação`,
              body: emailBody
            }
          });

          if (error) throw error;
          result.emailSent = true;
          emailStatus = 'success';
          logger.log('[NotificationDispatcher] Email sent successfully for:', payload.eventType);
        }
      } catch (err: any) {
        logger.error('[NotificationDispatcher] Email send error:', err);
        emailError = err.message || 'Unknown email error';
        result.errors.push(`Email error: ${emailError}`);
      }

      // Log email notification attempt
      await supabase.from('notification_logs').insert({
        event_type: payload.eventType,
        channel: 'email',
        recipient: emailRecipient,
        subject: emailSubject || payload.subject,
        message_body: emailBody || payload.message,
        status: emailStatus,
        error_message: emailError,
        metadata: { variables: payload.metadata || {} }
      });
    }

    // Send WhatsApp notification if enabled (check global toggle too)
    if (
      prefData.whatsapp_enabled && 
      settings?.whatsapp_global_enabled && 
      settings?.whatsapp_target_phone
    ) {
      const whatsappRecipient = settings.whatsapp_target_phone;
      let whatsappMessage = '';
      let whatsappStatus: 'success' | 'failed' = 'failed';
      let whatsappError: string | null = null;

      try {
        // Use custom template or fallback with standard format
        whatsappMessage = template?.whatsapp_message 
          ? injectVariables(template.whatsapp_message, variables)
          : `${timestamp} - Plataforma KnowYOU: ${payload.subject}. ${payload.message}`;

        // Never send empty messages
        if (!whatsappMessage || whatsappMessage.trim() === '') {
          whatsappError = 'WhatsApp message is empty - skipping';
          result.errors.push(whatsappError);
        } else {
          const { data, error } = await supabase.functions.invoke('send-whatsapp', {
            body: {
              phoneNumber: whatsappRecipient,
              message: whatsappMessage,
              eventType: payload.eventType
            }
          });

          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || 'Unknown WhatsApp error');
          
          result.whatsappSent = true;
          whatsappStatus = 'success';
          logger.log('[NotificationDispatcher] WhatsApp sent successfully for:', payload.eventType);
        }
      } catch (err: any) {
        logger.error('[NotificationDispatcher] WhatsApp send error:', err);
        whatsappError = err.message || 'Unknown WhatsApp error';
        result.errors.push(`WhatsApp error: ${whatsappError}`);
      }

      // Log WhatsApp notification attempt
      await supabase.from('notification_logs').insert({
        event_type: payload.eventType,
        channel: 'whatsapp',
        recipient: whatsappRecipient,
        subject: null,
        message_body: whatsappMessage || payload.message,
        status: whatsappStatus,
        error_message: whatsappError,
        metadata: { variables: payload.metadata || {} }
      });
    }

  } catch (error: any) {
    logger.error('[NotificationDispatcher] Unexpected error:', error);
    result.errors.push(`Unexpected error: ${error.message}`);
  }

  return result;
}

/**
 * Quick helpers to send specific notification types with proper variable mapping
 */
export const notifyNewDocument = (fileName: string, uploadDate?: string) => 
  dispatchNotification({
    eventType: 'new_document',
    subject: 'Novo Documento RAG',
    message: fileName,
    metadata: {
      file_name: fileName,
      upload_date: uploadDate || new Date().toLocaleString('pt-BR')
    }
  });

export const notifyDocumentFailed = (fileName: string, errorCode: string, processId?: string) => 
  dispatchNotification({
    eventType: 'document_failed',
    subject: 'Falha no Processamento',
    message: `${fileName} - ${errorCode}`,
    metadata: {
      file_name: fileName,
      error_code: errorCode,
      process_id: processId || 'N/A'
    }
  });

export const notifyNewContactMessage = (senderName: string, snippet: string) => 
  dispatchNotification({
    eventType: 'new_contact_message',
    subject: 'Nova Mensagem de Contato',
    message: `De: ${senderName}`,
    metadata: {
      sender_name: senderName,
      snippet: snippet.substring(0, 100)
    }
  });

export const notifySecurityAlert = (severityLevel: string, threatType: string, affectedAsset: string) => {
  const severityIcons: Record<string, string> = { critical: '🔴', warning: '🟡', secure: '🟢' };
  return dispatchNotification({
    eventType: 'security_alert',
    subject: 'Alerta de Segurança',
    message: `${severityLevel}: ${threatType}`,
    metadata: {
      severity_level: severityLevel,
      severity_icon: severityIcons[severityLevel.toLowerCase()] || '⚪',
      threat_type: threatType,
      affected_asset: affectedAsset
    }
  });
};

export const notifyMLAccuracyDrop = (modelName: string, currentAccuracy: number, dropPercentage: number) => 
  dispatchNotification({
    eventType: 'ml_accuracy_drop',
    subject: 'Queda de Precisão ML',
    message: `${modelName}: ${currentAccuracy}%`,
    metadata: {
      model_name: modelName,
      current_accuracy: currentAccuracy.toFixed(1),
      drop_percentage: dropPercentage.toFixed(1)
    }
  });

export const notifyNewConversation = (senderName: string, snippet: string) => 
  dispatchNotification({
    eventType: 'new_conversation',
    subject: 'Nova Conversa',
    message: senderName,
    metadata: {
      sender_name: senderName,
      snippet: snippet.substring(0, 100)
    }
  });

// Security & Auth
export const notifyPasswordReset = (userName: string, otpCode: string) => 
  dispatchNotification({
    eventType: 'password_reset',
    subject: 'Solicitação de Recuperação de Senha',
    message: userName,
    metadata: {
      user_name: userName,
      otp_code: otpCode
    }
  });

export const notifyLoginAlert = (ipAddress: string, deviceName: string, location: string) => 
  dispatchNotification({
    eventType: 'login_alert',
    subject: 'Alerta de Login Suspeito',
    message: `${deviceName} - ${location}`,
    metadata: {
      ip_address: ipAddress,
      device_name: deviceName,
      location: location
    }
  });

// Data Intelligence
export const notifySentimentAlert = (userId: string, sentimentScore: string, triggerPhrase: string) => 
  dispatchNotification({
    eventType: 'sentiment_alert',
    subject: 'Alerta de Sentimento Negativo',
    message: `Score: ${sentimentScore}`,
    metadata: {
      user_id: userId,
      sentiment_score: sentimentScore,
      trigger_phrase: triggerPhrase.substring(0, 100)
    }
  });

export const notifyTaxonomyAnomaly = (category: string, conflictReason: string) => 
  dispatchNotification({
    eventType: 'taxonomy_anomaly',
    subject: 'Anomalia de Taxonomia',
    message: `${category}: ${conflictReason}`,
    metadata: {
      category: category,
      conflict_reason: conflictReason
    }
  });

// User Registration
export const notifyUserRegistrationRequest = (userName: string, userEmail: string, dnsOrigin: string, institutionWork?: string, institutionStudy?: string) => 
  dispatchNotification({
    eventType: 'user_registration_request',
    subject: 'Nova Solicitação de Cadastro',
    message: `${userName} (${userEmail})`,
    metadata: {
      user_name: userName,
      user_email: userEmail,
      dns_origin: dnsOrigin,
      institution_work: institutionWork || 'N/A',
      institution_study: institutionStudy || 'N/A'
    }
  });

export const notifyUserRegistrationApproved = (userName: string, userEmail: string, recoveryLink: string) => 
  dispatchNotification({
    eventType: 'user_registration_approved',
    subject: 'Bem-vindo à Plataforma KnowYOU',
    message: `Olá, ${userName}! Seu cadastro foi aprovado.`,
    metadata: {
      user_name: userName,
      user_email: userEmail,
      recovery_link: recoveryLink
    }
  });

export const notifyUserRegistrationRejected = (userName: string, userEmail: string, reason?: string) => 
  dispatchNotification({
    eventType: 'user_registration_rejected',
    subject: 'Solicitação de Cadastro Reprovada',
    message: reason || 'Sua solicitação foi reprovada.',
    metadata: {
      user_name: userName,
      user_email: userEmail,
      rejection_reason: reason || 'Sem motivo especificado'
    }
  });

// API Testing
export const notifyApiReadyForImplementation = (
  apiName: string, 
  provider: string, 
  selectedVariables: string[], 
  periodStart: string, 
  periodEnd: string
) => 
  dispatchNotification({
    eventType: 'api_ready_for_implementation',
    subject: `Nova API Pronta: ${apiName}`,
    message: `A API ${apiName} está pronta para implementação`,
    metadata: {
      api_name: apiName,
      provider: provider,
      selected_variables: selectedVariables.join(', '),
      period_start: periodStart || 'N/A',
      period_end: periodEnd || 'N/A'
    }
  });
