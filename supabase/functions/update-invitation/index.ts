// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface UpdateInvitationRequest {
  invitation_id: string;
  updates: {
    name?: string;
    email?: string;
    phone?: string | null;
    role?: "user" | "admin" | "superadmin";
    has_platform_access?: boolean;
    has_app_access?: boolean;
  };
}

// Generate a random 6-character token
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const randomValues = new Uint8Array(48);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 48; i++) {
    token += chars[randomValues[i] % chars.length];
  }
  return token;
}

// Generate 6-digit verification code
function generateVerificationCode(): string {
  const randomValues = new Uint8Array(6);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues).map(v => v % 10).join('');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "superadmin"]);

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Acesso negado. Apenas administradores podem editar convites." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { invitation_id, updates }: UpdateInvitationRequest = await req.json();

    if (!invitation_id) {
      return new Response(
        JSON.stringify({ error: "ID do convite é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch existing invitation
    const { data: existingInvitation, error: fetchError } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("id", invitation_id)
      .single();

    if (fetchError || !existingInvitation) {
      return new Response(
        JSON.stringify({ error: "Convite não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cannot edit completed invitations
    if (existingInvitation.status === "completed") {
      return new Response(
        JSON.stringify({ error: "Não é possível editar um convite já completado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailChanged = updates.email && updates.email !== existingInvitation.email;

    // If email changed, check for duplicates
    if (emailChanged) {
      const { data: existingWithEmail } = await supabase
        .from("user_invitations")
        .select("id")
        .eq("email", updates.email)
        .neq("id", invitation_id)
        .neq("status", "completed")
        .maybeSingle();

      if (existingWithEmail) {
        return new Response(
          JSON.stringify({ error: "Já existe um convite pendente para este email" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Also check if email is already registered
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const emailExists = existingUsers?.users?.some(u => u.email === updates.email);
      if (emailExists) {
        return new Response(
          JSON.stringify({ error: "Este email já está cadastrado no sistema" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Prepare update payload
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (updates.name !== undefined) updatePayload.name = updates.name;
    if (updates.phone !== undefined) updatePayload.phone = updates.phone;
    if (updates.role !== undefined) updatePayload.role = updates.role;
    if (updates.has_platform_access !== undefined) updatePayload.has_platform_access = updates.has_platform_access;
    if (updates.has_app_access !== undefined) updatePayload.has_app_access = updates.has_app_access;

    // If email changed, generate new token and reset verification
    if (emailChanged) {
      updatePayload.email = updates.email;
      updatePayload.token = generateToken();
      updatePayload.verification_code = generateVerificationCode();
      updatePayload.verification_code_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      updatePayload.verification_attempts = 0;
      updatePayload.expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      updatePayload.status = "pending";
      // Reset tracking
      updatePayload.email_sent_at = null;
      updatePayload.whatsapp_sent_at = null;
      updatePayload.email_opened_at = null;
      updatePayload.whatsapp_opened_at = null;
      updatePayload.link_opened_at = null;
      updatePayload.form_started_at = null;
      updatePayload.verification_sent_at = null;
    }

    // Update invitation
    const { data: updatedInvitation, error: updateError } = await supabase
      .from("user_invitations")
      .update(updatePayload)
      .eq("id", invitation_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating invitation:", updateError);
      return new Response(
        JSON.stringify({ error: `Erro ao atualizar convite: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If email changed, resend invitation
    if (emailChanged && updatedInvitation) {
      console.log("Email changed, resending invitation...");
      
      try {
        // Send new invitation email
        await supabase.functions.invoke("send-email", {
          body: {
            to: updates.email,
            subject: `Convite atualizado - ${updatedInvitation.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Olá ${updatedInvitation.name}!</h2>
                <p>Seu convite foi atualizado. Por favor, use o link abaixo para completar seu cadastro:</p>
                <p style="margin: 20px 0;">
                  <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/invite?token=${updatedInvitation.token}" 
                     style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                    Completar Cadastro
                  </a>
                </p>
                <p style="color: #666; font-size: 14px;">Este link expira em 7 dias.</p>
              </div>
            `
          }
        });

        // Update email_sent_at
        await supabase
          .from("user_invitations")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", invitation_id);

      } catch (emailError) {
        console.error("Error sending updated invitation email:", emailError);
        // Don't fail the whole operation, just log it
      }
    }

    // Log the update
    await supabase.from("notification_logs").insert({
      event_type: "invitation_updated",
      channel: "system",
      recipient: updatedInvitation.email,
      subject: "Convite atualizado",
      message_body: `Convite para ${updatedInvitation.name} foi atualizado${emailChanged ? ' e reenviado' : ''}.`,
      status: "success",
      metadata: {
        invitation_id,
        emailChanged,
        updatedBy: user.email,
        changes: updates
      }
    });

    console.log(`Invitation ${invitation_id} updated successfully by ${user.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        invitation: updatedInvitation,
        emailResent: emailChanged
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in update-invitation:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
