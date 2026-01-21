// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header to verify admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin user
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !adminUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id)
      .in("role", ["admin", "superadmin"])
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { registrationId } = await req.json();

    if (!registrationId) {
      return new Response(
        JSON.stringify({ error: "Registration ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get registration
    const { data: registration, error: regError } = await supabase
      .from("user_registrations")
      .select("*")
      .eq("id", registrationId)
      .single();

    if (regError || !registration) {
      console.error("Registration fetch error:", regError);
      return new Response(
        JSON.stringify({ error: "Registration not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[approve-user-registration] Approving:", registration.email);

    // Create user in Supabase Auth
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: registration.email,
      email_confirm: true,
      user_metadata: {
        first_name: registration.first_name,
        last_name: registration.last_name,
        phone: registration.phone,
        institution_work: registration.institution_work,
        institution_study: registration.institution_study,
      },
    });

    if (createError) {
      console.error("Auth user creation error:", createError);
      return new Response(
        JSON.stringify({ error: `Failed to create auth user: ${createError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = authData.user.id;
    console.log("[approve-user-registration] Auth user created:", newUserId);

    // Insert role for new user
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: newUserId, role: registration.role });

    if (roleError) {
      console.error("Role insertion error:", roleError);
      // Continue anyway, role can be added later
    }

    // Update registration status
    const { error: updateError } = await supabase
      .from("user_registrations")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: adminUser.id,
      })
      .eq("id", registrationId);

    if (updateError) {
      console.error("Registration update error:", updateError);
    }

    // Generate password recovery link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: registration.email,
    });

    if (linkError) {
      console.error("Recovery link generation error:", linkError);
    }

    const recoveryLink = linkData?.properties?.action_link || `${supabaseUrl.replace('.supabase.co', '')}/admin/reset-password`;
    console.log("[approve-user-registration] Recovery link generated");

    // Send welcome notification via email
    const userName = `${registration.first_name} ${registration.last_name}`;
    
    // Get notification preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("email_enabled, whatsapp_enabled")
      .eq("event_type", "user_registration_approved")
      .single();

    const { data: settings } = await supabase
      .from("admin_settings")
      .select("gmail_notification_email")
      .single();

    // Get template
    const { data: template } = await supabase
      .from("notification_templates")
      .select("email_subject, email_body")
      .eq("event_type", "user_registration_approved")
      .single();

    if (prefs?.email_enabled && template) {
      // Replace variables in template
      let emailBody = template.email_body || "";
      let emailSubject = template.email_subject || "Bem-vindo à Plataforma KnowYOU!";
      
      const variables: Record<string, string> = {
        user_name: userName,
        user_email: registration.email,
        recovery_link: recoveryLink,
        timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        platform_name: "Plataforma KnowYOU",
      };

      for (const [key, value] of Object.entries(variables)) {
        emailBody = emailBody.replace(new RegExp(`\\{${key}\\}`, "g"), value);
        emailSubject = emailSubject.replace(new RegExp(`\\{${key}\\}`, "g"), value);
      }

      // Send email to the new user
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            to: registration.email,
            subject: emailSubject,
            body: emailBody,
          },
        });
        console.log("[approve-user-registration] Welcome email sent to:", registration.email);
      } catch (emailError) {
        console.error("Email send error:", emailError);
      }
    }

    // Notify admin about the approval
    if (settings?.gmail_notification_email) {
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            to: settings.gmail_notification_email,
            subject: `✅ Usuário Aprovado: ${userName}`,
            body: `O usuário ${userName} (${registration.email}) foi aprovado e recebeu o email de boas-vindas.`,
          },
        });
      } catch (emailError) {
        console.error("Admin notification email error:", emailError);
      }
    }

    // Log the action
    await supabase.from("user_activity_logs").insert({
      user_email: adminUser.email,
      user_id: adminUser.id,
      action_category: "USER_REGISTRATION_APPROVAL",
      action: `Aprovou cadastro de ${userName} (${registration.email})`,
      details: {
        registration_id: registrationId,
        user_email: registration.email,
        user_name: userName,
        role: registration.role,
      },
    });

    await supabase.from("notification_logs").insert({
      event_type: "user_registration_approved",
      channel: "email",
      recipient: registration.email,
      subject: "Bem-vindo à Plataforma KnowYOU!",
      message_body: `Usuário ${userName} aprovado com link de recuperação enviado.`,
      status: "success",
      metadata: { registration_id: registrationId },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User approved successfully",
        userId: newUserId,
        recoveryLink: recoveryLink 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[approve-user-registration] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
