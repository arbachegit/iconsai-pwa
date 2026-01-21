// ============================================
// CHECK TIER ELIGIBILITY
// Avalia elegibilidade para upgrade de tier WhatsApp
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("check-tier-eligibility");

// WhatsApp Business API Tier Limits
const TIER_LIMITS: Record<number, number> = {
  0: 250,
  1: 1000,
  2: 10000,
  3: 100000,
  4: 1000000,
};

interface TierStatus {
  id: string;
  current_tier: number;
  messaging_limit: number;
  quality_rating: string;
  phone_status: string;
  business_verified: boolean;
}

interface DailyMetric {
  metric_date: string;
  messages_sent: number;
  unique_users: number;
  messages_delivered: number;
  messages_failed: number;
}

interface EligibilityResponse {
  current_tier: number;
  current_limit: number;
  next_tier: number | null;
  next_limit: number | null;
  quality_rating: string;
  phone_status: string;
  business_verified: boolean;
  threshold_required: number;
  days_above_threshold: number;
  avg_daily_users: number;
  percent_limit_used: number;
  blocks_7days: number;
  reports_7days: number;
  eligible_for_upgrade: boolean;
  recommendation: string;
  daily_metrics: DailyMetric[];
}

function generateRecommendation(
  eligibleForUpgrade: boolean,
  daysAboveThreshold: number,
  qualityRating: string,
  phoneStatus: string,
  thresholdRequired: number,
  nextTier: number | null,
  blocks7days: number,
  reports7days: number
): string {
  if (eligibleForUpgrade) {
    return `Elegível para upgrade ao Tier ${nextTier}! O sistema deve promover automaticamente em breve.`;
  }

  const issues: string[] = [];

  if (qualityRating === "low") {
    issues.push("qualidade baixa (precisa melhorar taxas de entrega e reduzir bloqueios)");
  }

  if (phoneStatus !== "connected") {
    issues.push(`telefone ${phoneStatus} (precisa estar conectado)`);
  }

  if (daysAboveThreshold < 7) {
    const daysNeeded = 7 - daysAboveThreshold;
    issues.push(`mais ${daysNeeded} dia(s) com ${thresholdRequired}+ usuários únicos`);
  }

  if (blocks7days > 0) {
    issues.push(`${blocks7days} bloqueio(s) nos últimos 7 dias`);
  }

  if (reports7days > 0) {
    issues.push(`${reports7days} denúncia(s) nos últimos 7 dias`);
  }

  if (issues.length === 0) {
    return "Continue enviando mensagens de qualidade para manter elegibilidade.";
  }

  return `Precisa de: ${issues.join("; ")}.`;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  logger.requestStart(req.method, "/check-tier-eligibility");

  try {
    // Only allow GET
    if (req.method !== "GET" && req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch current tier status
    let { data: tierStatus, error: tierError } = await supabase
      .from("whatsapp_tier_status")
      .select("*")
      .limit(1)
      .single();

    if (tierError && tierError.code === "PGRST116") {
      // No record found, create default
      logger.info("No tier status found, creating default");
      
      const { data: newStatus, error: insertError } = await supabase
        .from("whatsapp_tier_status")
        .insert({
          current_tier: 0,
          messaging_limit: TIER_LIMITS[0],
          quality_rating: "unknown",
          phone_status: "connected",
          business_verified: false,
        })
        .select()
        .single();

      if (insertError) {
        logger.error("Failed to create default tier status", insertError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to initialize tier status" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      tierStatus = newStatus;
    } else if (tierError) {
      logger.error("Failed to fetch tier status", tierError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch tier status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const status = tierStatus as TierStatus;
    logger.info("Current tier status", { tier: status.current_tier, limit: status.messaging_limit });

    // 2. Fetch last 7 days of metrics
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split("T")[0];

    const { data: metricsData, error: metricsError } = await supabase
      .from("whatsapp_daily_metrics")
      .select("metric_date, messages_sent, unique_users, messages_delivered, messages_failed")
      .gte("metric_date", startDate)
      .order("metric_date", { ascending: true });

    if (metricsError) {
      logger.error("Failed to fetch daily metrics", metricsError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch metrics" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const metrics = (metricsData || []) as DailyMetric[];
    logger.info(`Found ${metrics.length} days of metrics`);

    // 3. Calculate eligibility metrics
    const thresholdRequired = Math.floor(status.messaging_limit * 0.5);
    let daysAboveThreshold = 0;
    let totalUsers = 0;

    for (const m of metrics) {
      if (m.unique_users >= thresholdRequired) {
        daysAboveThreshold++;
      }
      totalUsers += m.unique_users;
    }

    const avgDailyUsers = metrics.length > 0 ? totalUsers / metrics.length : 0;
    const percentLimitUsed = status.messaging_limit > 0 
      ? (avgDailyUsers / status.messaging_limit) * 100 
      : 0;

    // 4. Fetch quality events (blocks, reports) from last 7 days
    const { data: qualityEvents, error: eventsError } = await supabase
      .from("whatsapp_quality_events")
      .select("event_type")
      .gte("event_date", startDate);

    if (eventsError) {
      logger.warn("Failed to fetch quality events", eventsError);
    }

    let blocks7days = 0;
    let reports7days = 0;

    if (qualityEvents) {
      for (const event of qualityEvents) {
        if (event.event_type === "block") {
          blocks7days++;
        } else if (event.event_type === "report") {
          reports7days++;
        }
      }
    }

    // 5. Determine next tier
    const currentTier = status.current_tier;
    const nextTier = currentTier < 4 ? currentTier + 1 : null;
    const nextLimit = nextTier !== null ? TIER_LIMITS[nextTier] : null;

    // 6. Check eligibility
    const eligibleForUpgrade = 
      status.quality_rating !== "low" &&
      status.phone_status === "connected" &&
      daysAboveThreshold >= 7 &&
      nextTier !== null;

    // 7. Generate recommendation
    const recommendation = generateRecommendation(
      eligibleForUpgrade,
      daysAboveThreshold,
      status.quality_rating,
      status.phone_status,
      thresholdRequired,
      nextTier,
      blocks7days,
      reports7days
    );

    // 8. Build response
    const response: EligibilityResponse = {
      current_tier: currentTier,
      current_limit: status.messaging_limit,
      next_tier: nextTier,
      next_limit: nextLimit,
      quality_rating: status.quality_rating,
      phone_status: status.phone_status,
      business_verified: status.business_verified,
      threshold_required: thresholdRequired,
      days_above_threshold: daysAboveThreshold,
      avg_daily_users: Math.round(avgDailyUsers * 100) / 100,
      percent_limit_used: Math.round(percentLimitUsed * 100) / 100,
      blocks_7days: blocks7days,
      reports_7days: reports7days,
      eligible_for_upgrade: eligibleForUpgrade,
      recommendation,
      daily_metrics: metrics,
    };

    logger.info("Eligibility check complete", {
      eligible: eligibleForUpgrade,
      daysAbove: daysAboveThreshold,
      avgUsers: avgDailyUsers,
    });
    
    logger.requestEnd(200);

    return new Response(
      JSON.stringify({ success: true, data: response }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logger.error("Unexpected error", error);
    logger.requestEnd(500);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
