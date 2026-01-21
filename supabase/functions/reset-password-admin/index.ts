// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface ResetPasswordRequest {
  userId: string;
  userEmail: string;
  userName: string;
  reason?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, userEmail, userName, reason } = await req.json() as ResetPasswordRequest;

    if (!userId || !userEmail) {
      return new Response(
        JSON.stringify({ error: 'userId e userEmail são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[reset-password-admin] Iniciando reset para usuário: ${userEmail}`);

    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store the recovery code
    const { error: codeError } = await supabase
      .from('password_recovery_codes')
      .insert({
        email: userEmail.toLowerCase(),
        code,
        expires_at: expiresAt.toISOString(),
        is_used: false,
      });

    if (codeError) {
      console.error('[reset-password-admin] Erro ao salvar código:', codeError);
      throw new Error('Erro ao gerar código de recuperação');
    }

    // Send email notification
    if (resendApiKey) {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .header h1 { color: #fff; margin: 0; font-size: 24px; }
            .content { background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef; }
            .code-box { background: #fff; border: 2px solid #e74c3c; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #e74c3c; }
            .warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0; }
            .warning-icon { color: #856404; font-size: 18px; }
            .footer { background: #1a1a2e; color: #aaa; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; }
            .highlight { color: #e74c3c; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔐 Reset de Senha</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${userName || 'Usuário'}</strong>,</p>
            
            <div class="warning">
              <p class="warning-icon">⚠️ <strong>Atenção:</strong></p>
              <p>Sua senha foi <span class="highlight">resetada pelo Super Administrador</span> do sistema.</p>
              ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
            </div>
            
            <p>Use o código abaixo para criar uma nova senha:</p>
            
            <div class="code-box">
              <div class="code">${code}</div>
              <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Válido por 30 minutos</p>
            </div>
            
            <p>Se você não esperava este reset, entre em contato imediatamente com o suporte.</p>
            
            <p style="margin-top: 30px;">Atenciosamente,<br><strong>Equipe KnowYOU</strong></p>
          </div>
          <div class="footer">
            <p>Este é um email automático. Por favor, não responda.</p>
            <p>© ${new Date().getFullYear()} KnowYOU. Todos os direitos reservados.</p>
          </div>
        </body>
        </html>
      `;

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'KnowYOU <noreply@knowyou.com.br>',
          to: [userEmail],
          subject: '🔐 Sua senha foi resetada pelo Administrador',
          html: emailHtml,
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.text();
        console.error('[reset-password-admin] Erro ao enviar email:', errorData);
        throw new Error('Erro ao enviar email de notificação');
      }

      console.log('[reset-password-admin] Email enviado com sucesso');
    } else {
      console.warn('[reset-password-admin] RESEND_API_KEY não configurada, email não enviado');
    }

    // Log the action
    await supabase.from('notification_logs').insert({
      event_type: 'password_reset_by_admin',
      channel: 'email',
      recipient: userEmail,
      subject: 'Senha resetada pelo Administrador',
      message_body: `Senha do usuário ${userName || userEmail} foi resetada pelo administrador`,
      status: 'sent',
      metadata: { userId, reason },
    });

    // Log user activity
    await supabase.from('user_activity_logs').insert({
      user_email: 'admin',
      action_category: 'ADMIN_ACTION',
      action: `Senha resetada para usuário: ${userEmail}`,
      details: { userId, reason },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Código de reset enviado com sucesso',
        codeExpiration: expiresAt.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[reset-password-admin] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
