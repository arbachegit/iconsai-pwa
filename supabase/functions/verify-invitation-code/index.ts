// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface VerifyCodeRequest {
  token: string;
  code: string;
  password: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, code, password }: VerifyCodeRequest = await req.json();

    // Fetch invitation
    const { data: invitation, error: fetchError } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchError || !invitation) {
      return new Response(
        JSON.stringify({ error: "Convite não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already completed
    if (invitation.status === "completed") {
      return new Response(
        JSON.stringify({ error: "Este convite já foi utilizado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if code expired
    if (new Date(invitation.verification_code_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Código expirado. Solicite um novo código." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check attempts limit (max 5)
    if (invitation.verification_attempts >= 5) {
      return new Response(
        JSON.stringify({ error: "Número máximo de tentativas excedido. Solicite um novo código." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment attempts
    await supabase
      .from("user_invitations")
      .update({ 
        verification_attempts: invitation.verification_attempts + 1,
        updated_at: new Date().toISOString()
      })
      .eq("token", token);

    // Verify code
    if (invitation.verification_code !== code) {
      const remainingAttempts = 4 - invitation.verification_attempts;
      return new Response(
        JSON.stringify({ 
          error: `Código incorreto. ${remainingAttempts > 0 ? `${remainingAttempts} tentativas restantes.` : 'Solicite um novo código.'}` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Code is correct! Create user in Supabase Auth or get existing
    let userId: string;
    
    // First, check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === invitation.email);
    
    if (existingUser) {
      console.log("User already exists, updating password...");
      userId = existingUser.id;
      
      // Update the existing user's password
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true,
        user_metadata: {
          first_name: invitation.name.split(" ")[0],
          last_name: invitation.name.split(" ").slice(1).join(" ") || "",
          phone: invitation.phone
        }
      });
      
      if (updateError) {
        console.error("Error updating existing user:", updateError);
        return new Response(
          JSON.stringify({ error: `Erro ao atualizar usuário: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Create new user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: invitation.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          first_name: invitation.name.split(" ")[0],
          last_name: invitation.name.split(" ").slice(1).join(" ") || "",
          phone: invitation.phone
        }
      });

      if (authError) {
        console.error("Error creating auth user:", authError);
        return new Response(
          JSON.stringify({ error: `Erro ao criar usuário: ${authError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      userId = authData.user.id;
    }

    

    // Assign role in user_roles table (delete+insert pattern for reliability)
    // First, remove any existing roles for this user to ensure correct role
    const { error: deleteRoleError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (deleteRoleError) {
      console.warn("Warning: Could not delete existing roles:", deleteRoleError);
    }

    // Now insert the correct role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: userId,
        role: invitation.role
      });

    if (roleError) {
      console.error("CRITICAL: Error assigning role:", roleError);
      
      // Log this critical error to notification_logs
      await supabase.from("notification_logs").insert({
        event_type: "role_assignment_error",
        channel: "system",
        recipient: invitation.email,
        subject: "Erro crítico ao atribuir role",
        message_body: `Falha ao atribuir role ${invitation.role} para ${invitation.email}: ${roleError.message}`,
        status: "error",
        metadata: { userId, role: invitation.role, error: roleError.message }
      });

      // Return error - role assignment is critical
      return new Response(
        JSON.stringify({ 
          error: "Erro ao configurar permissões. Contate o administrador.",
          details: roleError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Role ${invitation.role} assigned successfully to user ${userId}`);

    // Create profile
    const nameParts = invitation.name.split(" ");
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        first_name: nameParts[0],
        last_name: nameParts.slice(1).join(" ") || null,
        phone: invitation.phone
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
    }

    // Add to user_registrations for tracking (with new access fields)
    const { error: regError } = await supabase
      .from("user_registrations")
      .insert({
        first_name: nameParts[0],
        last_name: nameParts.slice(1).join(" ") || "",
        email: invitation.email,
        phone: invitation.phone,
        role: invitation.role,
        status: "approved",
        approved_at: new Date().toISOString(),
        has_platform_access: invitation.has_platform_access ?? true,
        has_app_access: invitation.has_app_access ?? false
      });

    if (regError) {
      console.error("Error creating registration record:", regError);
    }

    // Update invitation status to completed
    const { error: updateError } = await supabase
      .from("user_invitations")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("token", token);

    if (updateError) {
      console.error("Error updating invitation status:", updateError);
    }

    // Notify Super Admin
    try {
      const { data: settings } = await supabase
        .from("admin_settings")
        .select("whatsapp_target_phone, whatsapp_global_enabled")
        .single();

      if (settings?.whatsapp_global_enabled && settings?.whatsapp_target_phone) {
        const roleLabel = invitation.role === 'superadmin' ? 'Super Admin' : invitation.role === 'admin' ? 'Admin' : 'Usuário';
        const methodLabel = invitation.verification_method === 'email' ? 'Email' : 'WhatsApp';
        const accessLabels = [];
        if (invitation.has_platform_access) accessLabels.push("🖥️ Plataforma");
        if (invitation.has_app_access) accessLabels.push("📱 APP");
        
        const adminMessage = `✅ *Cadastro Concluído*

👤 ${invitation.name}
📧 ${invitation.email}
🔑 Role: ${roleLabel}
🔓 Acesso: ${accessLabels.join(" + ") || "Plataforma"}
✔️ Verificado via: ${methodLabel}

🎉 Usuário pode fazer login.`;

        await supabase.functions.invoke("send-whatsapp", {
          body: {
            phoneNumber: settings.whatsapp_target_phone,
            message: adminMessage
          }
        });
      }
    } catch (notifyError) {
      console.error("Error notifying admin:", notifyError);
    }

    // Log the event
    await supabase.from("notification_logs").insert({
      event_type: "user_invitation_completed",
      channel: "system",
      recipient: invitation.email,
      subject: "Cadastro concluído",
      message_body: `${invitation.name} completou o cadastro com role ${invitation.role}`,
      status: "success",
      metadata: { 
        token, 
        role: invitation.role, 
        verificationMethod: invitation.verification_method,
        hasPlatformAccess: invitation.has_platform_access,
        hasAppAccess: invitation.has_app_access
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Cadastro concluído com sucesso! Você pode fazer login agora.",
        email: invitation.email
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in verify-invitation-code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
