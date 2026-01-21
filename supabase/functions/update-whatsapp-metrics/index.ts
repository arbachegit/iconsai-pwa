// ============================================
// UPDATE WHATSAPP METRICS
// Agrega logs diários de WhatsApp em métricas
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("update-whatsapp-metrics");

interface DailyMetrics {
  metric_date: string;
  messages_sent: number;
  unique_users: number;
  messages_delivered: number;
  messages_failed: number;
  messages_queued: number;
  template_breakdown: Record<string, number>;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  logger.requestStart(req.method, "/update-whatsapp-metrics");

  try {
    // Only allow GET and POST
    if (req.method !== "GET" && req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse date parameter (default = today)
    const url = new URL(req.url);
    let targetDate = url.searchParams.get("date");
    
    if (!targetDate) {
      // Default to today in UTC
      targetDate = new Date().toISOString().split("T")[0];
    }

    // Validate date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(targetDate)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid date format. Use YYYY-MM-DD" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info(`Processing metrics for date: ${targetDate}`);

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query notification_logs for WhatsApp messages on target date
    const startOfDay = `${targetDate}T00:00:00.000Z`;
    const endOfDay = `${targetDate}T23:59:59.999Z`;

    const { data: logs, error: logsError } = await supabase
      .from("notification_logs")
      .select("*")
      .eq("channel", "whatsapp")
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);

    if (logsError) {
      logger.error("Failed to fetch notification logs", logsError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch logs", details: logsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info(`Found ${logs?.length || 0} WhatsApp logs for ${targetDate}`);

    // Calculate metrics
    const metrics: DailyMetrics = {
      metric_date: targetDate,
      messages_sent: 0,
      unique_users: new Set<string>(),
      messages_delivered: 0,
      messages_failed: 0,
      messages_queued: 0,
      template_breakdown: {},
    } as unknown as DailyMetrics;

    const uniqueRecipients = new Set<string>();

    if (logs && logs.length > 0) {
      for (const log of logs) {
        // Count total messages
        metrics.messages_sent++;

        // Track unique users by recipient
        if (log.recipient) {
          uniqueRecipients.add(log.recipient);
        }

        // Count by status
        const status = log.final_status || log.status;
        if (status === "delivered") {
          metrics.messages_delivered++;
        } else if (status === "failed" || status === "undelivered") {
          metrics.messages_failed++;
        } else if (status === "queued" || status === "sent" || status === "pending") {
          metrics.messages_queued++;
        }

        // Count by template
        const template = log.metadata?.template || log.metadata?.template_name || "unknown";
        metrics.template_breakdown[template] = (metrics.template_breakdown[template] || 0) + 1;
      }
    }

    metrics.unique_users = uniqueRecipients.size;

    logger.info("Calculated metrics", {
      messages_sent: metrics.messages_sent,
      unique_users: metrics.unique_users,
      delivered: metrics.messages_delivered,
      failed: metrics.messages_failed,
      queued: metrics.messages_queued,
      templates: Object.keys(metrics.template_breakdown).length,
    });

    // Upsert into whatsapp_daily_metrics
    const { data: upsertData, error: upsertError } = await supabase
      .from("whatsapp_daily_metrics")
      .upsert(
        {
          metric_date: metrics.metric_date,
          messages_sent: metrics.messages_sent,
          unique_users: metrics.unique_users,
          messages_delivered: metrics.messages_delivered,
          messages_failed: metrics.messages_failed,
          messages_queued: metrics.messages_queued,
          template_breakdown: metrics.template_breakdown,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "metric_date" }
      )
      .select()
      .single();

    if (upsertError) {
      logger.error("Failed to upsert metrics", upsertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to save metrics", details: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info("Successfully saved metrics", { id: upsertData?.id });
    logger.requestEnd(200);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          date: targetDate,
          logs_processed: logs?.length || 0,
          metrics: {
            messages_sent: metrics.messages_sent,
            unique_users: metrics.unique_users,
            messages_delivered: metrics.messages_delivered,
            messages_failed: metrics.messages_failed,
            messages_queued: metrics.messages_queued,
            template_breakdown: metrics.template_breakdown,
          },
          saved_at: upsertData?.updated_at,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logger.error("Unexpected error", error);
    logger.requestEnd(500);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : String(error) 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
