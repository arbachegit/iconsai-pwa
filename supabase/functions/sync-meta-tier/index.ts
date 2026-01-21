// ============================================
// SYNC META TIER - Sincroniza tier real da Meta Business API
// VERSAO: 1.0.0 | DEPLOY: 2026-01-04
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapping de tier da Meta para limites diários
const TIER_TO_LIMIT: Record<string, number> = {
  "TIER_1K": 1000,
  "TIER_10K": 10000,
  "TIER_100K": 100000,
  "TIER_UNLIMITED": 1000000,
  "TIER_NOT_SET": 250, // Fallback for unverified
};

// Mapping de tier para número interno
const TIER_TO_NUMBER: Record<string, number> = {
  "TIER_NOT_SET": 0,
  "TIER_1K": 1,
  "TIER_10K": 2,
  "TIER_100K": 3,
  "TIER_UNLIMITED": 4,
};

interface MetaPhoneResponse {
  quality_rating?: "GREEN" | "YELLOW" | "RED" | "UNKNOWN";
  messaging_limit_tier?: string;
  verified_name?: string;
  code_verification_status?: string;
  display_phone_number?: string;
  error?: {
    message: string;
    code: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const phoneNumberId = Deno.env.get("META_PHONE_NUMBER_ID");
    const accessToken = Deno.env.get("META_ACCESS_TOKEN");

    if (!phoneNumberId || !accessToken) {
      console.error("[sync-meta-tier] Missing META credentials");
      return new Response(
        JSON.stringify({
          success: false,
          error: "META credentials not configured. Please add META_PHONE_NUMBER_ID and META_ACCESS_TOKEN secrets.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[sync-meta-tier] Fetching data from Meta Graph API...");

    // Buscar dados da Meta Graph API
    const metaUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}?fields=quality_rating,messaging_limit_tier,verified_name,code_verification_status,display_phone_number`;
    
    const metaResponse = await fetch(metaUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const metaData: MetaPhoneResponse = await metaResponse.json();

    if (metaData.error) {
      console.error("[sync-meta-tier] Meta API error:", metaData.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Meta API error: ${metaData.error.message}`,
          code: metaData.error.code,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[sync-meta-tier] Meta response:", JSON.stringify(metaData));

    // Mapear dados
    const tierString = metaData.messaging_limit_tier || "TIER_NOT_SET";
    const qualityRating = (metaData.quality_rating || "UNKNOWN").toLowerCase();
    const currentTier = TIER_TO_NUMBER[tierString] ?? 0;
    const messagingLimit = TIER_TO_LIMIT[tierString] ?? 250;
    const isVerified = metaData.code_verification_status === "VERIFIED";

    // Conectar ao Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Atualizar tabela whatsapp_tier_status
    const { data: existingStatus, error: fetchError } = await supabase
      .from("whatsapp_tier_status")
      .select("id")
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("[sync-meta-tier] Error fetching tier status:", fetchError);
    }

    const updateData = {
      current_tier: currentTier,
      messaging_limit: messagingLimit,
      quality_rating: qualityRating,
      phone_status: isVerified ? "verified" : "pending",
      business_verified: isVerified,
      last_synced_at: new Date().toISOString(),
      meta_phone_number_id: phoneNumberId,
      display_phone_number: metaData.display_phone_number || null,
      verified_name: metaData.verified_name || null,
    };

    let result;
    if (existingStatus?.id) {
      // Update existing
      result = await supabase
        .from("whatsapp_tier_status")
        .update(updateData)
        .eq("id", existingStatus.id)
        .select()
        .single();
    } else {
      // Insert new
      result = await supabase
        .from("whatsapp_tier_status")
        .insert(updateData)
        .select()
        .single();
    }

    if (result.error) {
      console.error("[sync-meta-tier] Error upserting tier status:", result.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[sync-meta-tier] Successfully synced tier status:", result.data);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          current_tier: currentTier,
          messaging_limit: messagingLimit,
          quality_rating: qualityRating,
          verified_name: metaData.verified_name,
          display_phone_number: metaData.display_phone_number,
          synced_at: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[sync-meta-tier] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
