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

    const { registrationId, rejectionReason } = await req.json();

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

    console.log("[reject-user-registration] Rejecting:", registration.email);

    // Update registration status
    const { error: updateError } = await supabase
      .from("user_registrations")
      .update({
        status: "rejected",
        rejection_reason: rejectionReason || null,
      })
      .eq("id", registrationId);

    if (updateError) {
      console.error("Registration update error:", updateError);
      return new Response(
        JSON.stringify({ error: `Failed to update registration: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send rejection notification via email
    const userName = `${registration.first_name} ${registration.last_name}`;
    
    // Get notification preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("email_enabled, whatsapp_enabled")
      .eq("event_type", "user_registration_rejected")
      .single();

    // Get template
    const { data: template } = await supabase
      .from("notification_templates")
      .select("email_subject, email_body")
      .eq("event_type", "user_registration_rejected")
      .single();

    if (prefs?.email_enabled && template) {
      // Replace variables in template
      let emailBody = template.email_body || "";
      let emailSubject = template.email_subject || "Solicitação de Cadastro Reprovada";
      
      const variables: Record<string, string> = {
        user_name: userName,
        user_email: registration.email,
        rejection_reason: rejectionReason || "Sem motivo especificado",
        timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        platform_name: "Plataforma KnowYOU",
      };

      for (const [key, value] of Object.entries(variables)) {
        emailBody = emailBody.replace(new RegExp(`\\{${key}\\}`, "g"), value);
        emailSubject = emailSubject.replace(new RegExp(`\\{${key}\\}`, "g"), value);
      }

      // Send email to the rejected user
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            to: registration.email,
            subject: emailSubject,
            body: emailBody,
          },
        });
        console.log("[reject-user-registration] Rejection email sent to:", registration.email);
      } catch (emailError) {
        console.error("Email send error:", emailError);
      }
    }

    // Log the action
    await supabase.from("user_activity_logs").insert({
      user_email: adminUser.email,
      user_id: adminUser.id,
      action_category: "USER_REGISTRATION_REJECTION",
      action: `Reprovou cadastro de ${userName} (${registration.email})`,
      details: {
        registration_id: registrationId,
        user_email: registration.email,
        user_name: userName,
        rejection_reason: rejectionReason || null,
      },
    });

    // Log notification
    await supabase.from("notification_logs").insert({
      event_type: "user_registration_rejected",
      channel: "email",
      recipient: registration.email,
      subject: "Solicitação de Cadastro Reprovada",
      message_body: `Usuário ${userName} reprovado. Motivo: ${rejectionReason || "Não especificado"}`,
      status: "success",
      metadata: { registration_id: registrationId, rejection_reason: rejectionReason },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User rejected successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[reject-user-registration] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
