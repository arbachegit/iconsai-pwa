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
    const { email, code } = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ valid: false, error: "Email e código são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find valid code
    const now = new Date().toISOString();
    const { data: codeRecord, error: codeError } = await supabase
      .from("password_recovery_codes")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("code", code)
      .eq("is_used", false)
      .gte("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (codeError || !codeRecord) {
      console.log("Invalid or expired code for:", email);
      
      // Log failed attempt
      await supabase.from("user_activity_logs").insert({
        user_email: email,
        action: "Tentativa de validação de código falhou",
        action_category: "PASSWORD_RECOVERY",
        details: { code_valid: false, reason: codeError?.message || "Code not found" },
      });

      return new Response(
        JSON.stringify({ valid: false, error: "Código inválido ou expirado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark code as used
    const { error: updateError } = await supabase
      .from("password_recovery_codes")
      .update({ is_used: true, used_at: now })
      .eq("id", codeRecord.id);

    if (updateError) {
      console.error("Error marking code as used:", updateError);
    }

    // Generate temporary token for password reset
    const tempToken = crypto.randomUUID();

    // Store token in the same record for verification during password update
    await supabase
      .from("password_recovery_codes")
      .update({ code: tempToken }) // Reuse code field to store temp token
      .eq("id", codeRecord.id);

    // Log successful validation
    await supabase.from("user_activity_logs").insert({
      user_email: email,
      action: "Código de recuperação validado com sucesso",
      action_category: "PASSWORD_RECOVERY",
      details: { code_valid: true },
    });

    return new Response(
      JSON.stringify({ valid: true, token: tempToken }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in verify-recovery-code:", error);
    return new Response(
      JSON.stringify({ valid: false, error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
