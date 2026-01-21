// ============================================
// VERSAO: 3.0.0 | DEPLOY: 2026-01-04
// AUDITORIA: Added WhatsApp limit check + SMS fallback
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface NotificationRequest {
  phoneNumber: string;
  message: string;
  eventType?: string;
  preferredChannel?: 'whatsapp' | 'sms' | 'auto';
  forceSms?: boolean;
}

interface NotificationResult {
  success: boolean;
  channel: 'whatsapp' | 'sms' | null;
  sid?: string;
  error?: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
}

interface WhatsAppLimitCheck {
  canSendWhatsApp: boolean;
  remaining: number;
  limit: number;
  used: number;
  thresholdPercent: number;
}

const sanitizePhoneNumber = (phone: string): string => {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    cleaned = cleaned.replace(/^0+/, '');
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }
    cleaned = '+' + cleaned;
  }
  return cleaned;
};

// Check WhatsApp daily limit
async function checkWhatsAppLimit(supabase: any): Promise<WhatsAppLimitCheck> {
  const today = new Date().toISOString().split("T")[0];

  // Get tier status
  const { data: tierStatus } = await supabase
    .from("whatsapp_tier_status")
    .select("messaging_limit")
    .single();

  // Get fallback config
  const { data: fallbackConfig } = await supabase
    .from("notification_fallback_config")
    .select("enabled, threshold_percent")
    .single();

  const limit = tierStatus?.messaging_limit || 1000;
  const thresholdPercent = fallbackConfig?.threshold_percent || 80;
  const fallbackEnabled = fallbackConfig?.enabled ?? true;

  // Count today's WhatsApp messages
  const { count } = await supabase
    .from("notification_logs")
    .select("*", { count: "exact", head: true })
    .eq("channel", "whatsapp")
    .gte("created_at", `${today}T00:00:00`)
    .lt("created_at", `${today}T23:59:59.999`);

  const used = count || 0;
  const remaining = limit - used;
  
  // Calculate if we can send based on threshold
  const currentUsagePercent = (used / limit) * 100;
  const canSendWhatsApp = !fallbackEnabled || currentUsagePercent < thresholdPercent;

  console.log(`[Notification] WhatsApp limit check: used=${used}, limit=${limit}, remaining=${remaining}, threshold=${thresholdPercent}%, canSend=${canSendWhatsApp}`);

  return {
    canSendWhatsApp,
    remaining,
    limit,
    used,
    thresholdPercent,
  };
}

// Log fallback event
async function logFallback(
  supabase: any,
  originalChannel: string,
  fallbackChannel: string,
  reason: string,
  recipient: string,
  notificationId?: string
): Promise<void> {
  try {
    await supabase.from("notification_fallback_logs").insert({
      original_channel: originalChannel,
      fallback_channel: fallbackChannel,
      reason,
      recipient,
      notification_id: notificationId || null,
    });
    console.log(`[Notification] Fallback logged: ${originalChannel} -> ${fallbackChannel}, reason: ${reason}`);
  } catch (error) {
    console.warn("[Notification] Failed to log fallback:", error);
  }
}

async function sendWhatsApp(phoneNumber: string, message: string): Promise<NotificationResult> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, channel: null, error: 'WhatsApp not configured' };
  }

  try {
    const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('Body', message);
    formData.append('From', `whatsapp:${fromNumber}`);
    formData.append('To', `whatsapp:${phoneNumber}`);

    const response = await fetch(twilioApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      // Check for rate limit errors
      const errorMessage = data.message || 'WhatsApp send failed';
      const isRateLimited = errorMessage.toLowerCase().includes('rate limit') || 
                           errorMessage.toLowerCase().includes('limit exceeded') ||
                           data.code === 63018 || // Message limit reached
                           data.code === 21614;   // Invalid To number
      
      return { 
        success: false, 
        channel: 'whatsapp', 
        error: errorMessage,
        fallbackReason: isRateLimited ? 'whatsapp_rate_limited' : undefined
      };
    }

    return { success: true, channel: 'whatsapp', sid: data.sid };
  } catch (error: any) {
    return { success: false, channel: 'whatsapp', error: error.message };
  }
}

async function sendSMS(phoneNumber: string, message: string): Promise<NotificationResult> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_SMS_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, channel: null, error: 'SMS not configured' };
  }

  try {
    const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('Body', message);
    formData.append('From', fromNumber);
    formData.append('To', phoneNumber);

    const response = await fetch(twilioApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, channel: 'sms', error: data.message || 'SMS send failed' };
    }

    return { success: true, channel: 'sms', sid: data.sid };
  } catch (error: any) {
    return { success: false, channel: 'sms', error: error.message };
  }
}

// Send SMS via Infobip
async function sendSMSInfobip(phoneNumber: string, message: string): Promise<NotificationResult> {
  const apiKey = Deno.env.get('INFOBIP_API_KEY');
  const baseUrl = Deno.env.get('INFOBIP_BASE_URL');
  const sender = Deno.env.get('INFOBIP_SENDER');

  if (!apiKey || !baseUrl) {
    console.warn("[Notification] Infobip not configured, falling back to Twilio SMS");
    return sendSMS(phoneNumber, message);
  }

  try {
    const response = await fetch(`${baseUrl}/sms/2/text/advanced`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            destinations: [{ to: phoneNumber.replace('+', '') }],
            from: sender || 'InfoSMS',
            text: message,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        channel: 'sms', 
        error: data.requestError?.serviceException?.text || 'Infobip SMS send failed' 
      };
    }

    const messageId = data.messages?.[0]?.messageId;
    return { success: true, channel: 'sms', sid: messageId };
  } catch (error: any) {
    console.error("[Notification] Infobip error:", error);
    return { success: false, channel: 'sms', error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json() as NotificationRequest;
    const { phoneNumber, message, eventType, preferredChannel = 'auto', forceSms = false } = body;

    if (!phoneNumber || !message) {
      throw new Error('phoneNumber and message are required');
    }

    const sanitizedPhone = sanitizePhoneNumber(phoneNumber);
    
    // Validate E.164 format
    if (!sanitizedPhone.match(/^\+[1-9]\d{7,14}$/)) {
      throw new Error('Invalid phone number format');
    }

    console.log(`[Notification] Processing for event: ${eventType || 'manual'}, channel: ${preferredChannel}, forceSms: ${forceSms}`);

    let result: NotificationResult;
    let fallbackReason: string | null = null;

    // Determine which SMS provider to use
    const { data: fallbackConfig } = await supabase
      .from("notification_fallback_config")
      .select("sms_provider")
      .single();
    
    const smsProvider = fallbackConfig?.sms_provider || 'infobip';
    const sendSMSFn = smsProvider === 'infobip' ? sendSMSInfobip : sendSMS;

    // If forcing SMS or preferring SMS
    if (forceSms || preferredChannel === 'sms') {
      result = await sendSMSFn(sanitizedPhone, message);
    }
    // If preferring WhatsApp without fallback
    else if (preferredChannel === 'whatsapp') {
      // Still check limit but don't auto-fallback
      const limitCheck = await checkWhatsAppLimit(supabase);
      
      if (!limitCheck.canSendWhatsApp) {
        console.warn(`[Notification] WhatsApp limit threshold reached (${limitCheck.used}/${limitCheck.limit})`);
      }
      
      result = await sendWhatsApp(sanitizedPhone, message);
    }
    // Auto: WhatsApp with smart fallback
    else {
      // Check WhatsApp limit first
      const limitCheck = await checkWhatsAppLimit(supabase);
      
      if (!limitCheck.canSendWhatsApp) {
        // Threshold reached, use SMS directly
        console.log(`[Notification] WhatsApp threshold reached (${limitCheck.used}/${limitCheck.limit}), using SMS fallback`);
        fallbackReason = 'whatsapp_limit_reached';
        
        result = await sendSMSFn(sanitizedPhone, message);
        result.fallbackUsed = true;
        result.fallbackReason = fallbackReason;
      } else {
        // Try WhatsApp first
        result = await sendWhatsApp(sanitizedPhone, message);
        
        // If WhatsApp failed, try SMS fallback
        if (!result.success) {
          console.warn(`[Notification] WhatsApp failed: ${result.error}, trying SMS fallback`);
          fallbackReason = result.fallbackReason || 'whatsapp_send_failed';
          
          const smsResult = await sendSMSFn(sanitizedPhone, message);
          
          if (smsResult.success) {
            result = { ...smsResult, fallbackUsed: true, fallbackReason };
            console.log(`[Notification] SMS fallback successful: ${result.sid}`);
          } else {
            // Both failed
            result = {
              success: false,
              channel: null,
              error: `WhatsApp: ${result.error}. SMS: ${smsResult.error}`,
              fallbackUsed: true,
              fallbackReason,
            };
          }
        }
      }
    }

    // Log notification to database
    let notificationId: string | null = null;
    try {
      const { data: logData } = await supabase.from('notification_logs').insert({
        event_type: eventType || 'manual',
        channel: result.channel,
        recipient: sanitizedPhone,
        subject: eventType || 'Notificação',
        message_body: message.substring(0, 500),
        status: result.success ? 'sent' : 'failed',
        message_sid: result.sid || null,
        error_message: result.error || null,
        fallback_used: result.fallbackUsed || false,
        metadata: { preferredChannel, forceSms, fallbackReason }
      }).select('id').single();
      
      notificationId = logData?.id;
    } catch (logError) {
      console.warn('[Notification] Failed to log notification:', logError);
    }

    // Log fallback if used
    if (result.fallbackUsed && fallbackReason) {
      await logFallback(
        supabase,
        'whatsapp',
        result.channel || 'sms',
        fallbackReason,
        sanitizedPhone,
        notificationId || undefined
      );
    }

    if (result.success) {
      return new Response(
        JSON.stringify({
          success: true,
          channel: result.channel,
          sid: result.sid,
          fallbackUsed: result.fallbackUsed || false,
          fallbackReason: result.fallbackReason || null,
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: result.error,
          fallbackUsed: result.fallbackUsed || false,
          fallbackReason: result.fallbackReason || null,
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error: any) {
    console.error('[Notification] Error:', error.message);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
