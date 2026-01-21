
-- ============================================================
-- FASE 6: Security Fixes - Remaining functions with DROP
-- ============================================================

-- Drop function to recreate with search_path
DROP FUNCTION IF EXISTS public.get_taxonomy_analytics_report(integer);

-- Fix get_taxonomy_analytics_report
CREATE FUNCTION public.get_taxonomy_analytics_report(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'period_days', p_days,
        'generated_at', NOW(),
        'taxonomy_stats', (
            SELECT jsonb_build_object(
                'total', COUNT(*),
                'active', COUNT(*) FILTER (WHERE status = 'active'),
                'by_level', jsonb_object_agg(level, cnt)
            )
            FROM (
                SELECT level, COUNT(*) as cnt
                FROM global_taxonomy
                GROUP BY level
            ) lvl
        ),
        'tagging_stats', (
            SELECT jsonb_build_object(
                'total_tags', COUNT(*),
                'avg_confidence', ROUND(AVG(confidence)::numeric, 3),
                'by_source', jsonb_object_agg(source, cnt)
            )
            FROM (
                SELECT source, COUNT(*) as cnt
                FROM entity_tags
                WHERE created_at >= NOW() - (p_days || ' days')::interval
                GROUP BY source
            ) src
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$function$;
