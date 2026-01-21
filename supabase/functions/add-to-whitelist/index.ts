import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AddWhitelistPayload {
  ipAddress?: string;
  deviceFingerprint?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  description?: string;
  expiresAt?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("❌ No authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Create user client to validate token
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from token
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error("❌ Invalid user token:", userError);
      return new Response(
        JSON.stringify({ success: false, error: "Token inválido" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    console.log("✅ User authenticated:", user.email);

    // Verify user is admin via user_roles
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "superadmin"])
      .single();

    if (!userRole) {
      console.error("❌ User is not admin:", user.email);
      return new Response(
        JSON.stringify({ success: false, error: "Acesso negado - apenas admins" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    console.log("✅ Admin role verified:", userRole.role);

    // Parse payload
    const payload: AddWhitelistPayload = await req.json();
    const { ipAddress, deviceFingerprint, userId, userName, userEmail, description, expiresAt } = payload;

    // Validate - need at least IP or device fingerprint
    if (!ipAddress && !deviceFingerprint) {
      return new Response(
        JSON.stringify({ success: false, error: "IP ou Device Fingerprint é obrigatório" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("📝 Adding to whitelist:", { ipAddress, deviceFingerprint, userName });

    // Check for existing entry
    let existingQuery = supabase.from("security_whitelist").select("id");
    
    if (ipAddress && deviceFingerprint) {
      existingQuery = existingQuery.or(`ip_address.eq.${ipAddress},device_fingerprint.eq.${deviceFingerprint}`);
    } else if (ipAddress) {
      existingQuery = existingQuery.eq("ip_address", ipAddress);
    } else if (deviceFingerprint) {
      existingQuery = existingQuery.eq("device_fingerprint", deviceFingerprint);
    }

    const { data: existing } = await existingQuery;

    if (existing && existing.length > 0) {
      // Update existing entry
      const updateData: Record<string, unknown> = {
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      
      if (ipAddress) updateData.ip_address = ipAddress;
      if (deviceFingerprint) updateData.device_fingerprint = deviceFingerprint;
      if (userId) updateData.user_id = userId;
      if (userName) updateData.user_name = userName;
      if (userEmail) updateData.user_email = userEmail;
      if (description) updateData.description = description;
      if (expiresAt) updateData.expires_at = expiresAt;

      const { error: updateError } = await supabase
        .from("security_whitelist")
        .update(updateData)
        .eq("id", existing[0].id);

      if (updateError) {
        console.error("❌ Error updating whitelist:", updateError);
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      console.log("✅ Whitelist entry updated:", existing[0].id);

      // Log audit
      await supabase.from("security_audit_log").insert({
        event_type: "whitelist_updated",
        ip_address: ipAddress || "unknown",
        device_fingerprint: deviceFingerprint || null,
        user_id: user.id,
        details: {
          action: "update",
          target_user: userName || userEmail || "unknown",
          updated_by: user.email,
          description,
        },
      });

      return new Response(
        JSON.stringify({ success: true, message: "Entrada atualizada na whitelist", id: existing[0].id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert new entry
    const { data: newEntry, error: insertError } = await supabase
      .from("security_whitelist")
      .insert({
        ip_address: ipAddress || "0.0.0.0",
        device_fingerprint: deviceFingerprint || null,
        user_id: userId || null,
        user_name: userName || null,
        user_email: userEmail || null,
        description: description || `Adicionado via admin por ${user.email}`,
        expires_at: expiresAt || null,
        is_active: true,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("❌ Error inserting whitelist:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("✅ Whitelist entry created:", newEntry.id);

    // Log audit
    await supabase.from("security_audit_log").insert({
      event_type: "whitelist_added",
      ip_address: ipAddress || "unknown",
      device_fingerprint: deviceFingerprint || null,
      user_id: user.id,
      details: {
        action: "create",
        target_user: userName || userEmail || "unknown",
        added_by: user.email,
        description,
      },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Adicionado à whitelist com sucesso", id: newEntry.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Error in add-to-whitelist:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
