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
    const { email, token, newPassword } = await req.json();

    if (!email || !token || !newPassword) {
      return new Response(
        JSON.stringify({ success: false, error: "Dados incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ success: false, error: "Senha deve ter pelo menos 8 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify token exists and was recently validated (within 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: tokenRecord, error: tokenError } = await supabase
      .from("password_recovery_codes")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("code", token) // Token is stored in code field after validation
      .eq("is_used", true) // Must be used (validated)
      .gte("used_at", tenMinutesAgo) // Must be validated recently
      .order("used_at", { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokenRecord) {
      // [SECURITY] Email redacted from logs
      console.log("Invalid token for password reset attempt");
      
      await supabase.from("user_activity_logs").insert({
        user_email: email,
        action: "Tentativa de redefinição de senha com token inválido",
        action_category: "PASSWORD_RECOVERY",
        details: { token_valid: false },
      });

      return new Response(
        JSON.stringify({ success: false, error: "Token inválido ou expirado. Solicite novo código." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      throw new Error("Erro ao buscar usuário");
    }

    const user = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: "Usuário não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      // [SECURITY] Error details redacted from logs
      console.error("Error updating password");
      throw new Error("Erro ao atualizar senha");
    }

    // Invalidate the token record completely
    await supabase
      .from("password_recovery_codes")
      .update({ code: "USED_" + token })
      .eq("id", tokenRecord.id);

    // Log successful password reset
    await supabase.from("user_activity_logs").insert({
      user_email: email,
      action: "Senha redefinida com sucesso via código",
      action_category: "PASSWORD_RECOVERY",
      details: { success: true },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Senha atualizada com sucesso" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in reset-password-with-token:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
