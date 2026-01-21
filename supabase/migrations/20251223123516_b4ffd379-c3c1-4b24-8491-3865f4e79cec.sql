
-- ============================================================
-- FASE 6: Fix Security Definer Views
-- ============================================================

-- Fix maieutic_effectiveness view (convert to SECURITY INVOKER)
DROP VIEW IF EXISTS public.maieutic_effectiveness;
CREATE VIEW public.maieutic_effectiveness
WITH (security_invoker = true)
AS
SELECT 
    date_trunc('day'::text, created_at) AS date,
    cognitive_mode,
    count(*) AS total_interactions,
    sum(CASE WHEN user_confirmed_understanding THEN 1 ELSE 0 END) AS confirmed_understanding,
    sum(CASE WHEN user_asked_clarification THEN 1 ELSE 0 END) AS asked_clarification,
    (avg(pillbox_count))::numeric(10,2) AS avg_pillbox_count,
    (avg(questions_asked))::numeric(10,2) AS avg_questions_asked,
    (avg(time_to_next_message))::integer AS avg_response_time
FROM maieutic_metrics
GROUP BY (date_trunc('day'::text, created_at)), cognitive_mode
ORDER BY (date_trunc('day'::text, created_at)) DESC, cognitive_mode;

-- Fix v_document_taxonomies view (convert to SECURITY INVOKER)
DROP VIEW IF EXISTS public.v_document_taxonomies;
CREATE VIEW public.v_document_taxonomies
WITH (security_invoker = true)
AS
SELECT 
    d.id AS document_id,
    d.filename,
    d.target_chat,
    d.status,
    et.id AS entity_tag_id,
    gt.code AS taxonomy_code,
    gt.name AS taxonomy_name,
    gt.level AS taxonomy_level,
    et.confidence,
    et.source,
    et.created_at AS tagged_at
FROM documents d
LEFT JOIN entity_tags et ON et.entity_id = d.id AND et.entity_type = 'document'
LEFT JOIN global_taxonomy gt ON gt.id = et.taxonomy_id;

-- Fix indicator_stats_summary view (convert to SECURITY INVOKER)
DROP VIEW IF EXISTS public.indicator_stats_summary;
CREATE VIEW public.indicator_stats_summary
WITH (security_invoker = true)
AS
WITH national_stats AS (
    SELECT iv.indicator_id,
        count(*) AS record_count,
        min(iv.reference_date) AS min_date,
        max(iv.reference_date) AS max_date,
        (SELECT iv2.value FROM indicator_values iv2 
         WHERE iv2.indicator_id = iv.indicator_id 
         ORDER BY iv2.reference_date DESC LIMIT 1) AS last_value
    FROM indicator_values iv
    GROUP BY iv.indicator_id
), regional_stats AS (
    SELECT ir.indicator_id,
        count(*) AS record_count,
        min(ir.reference_date) AS min_date,
        max(ir.reference_date) AS max_date,
        (SELECT ir2.value FROM indicator_regional_values ir2 
         WHERE ir2.indicator_id = ir.indicator_id 
         ORDER BY ir2.reference_date DESC LIMIT 1) AS last_value
    FROM indicator_regional_values ir
    GROUP BY ir.indicator_id
), pac_estimated_stats AS (
    SELECT pe.pac_indicator_id AS indicator_id,
        count(*) AS record_count,
        min(pe.reference_date) AS min_date,
        max(pe.reference_date) AS max_date,
        (SELECT pe2.valor_estimado FROM pac_valores_estimados pe2 
         WHERE pe2.pac_indicator_id = pe.pac_indicator_id 
         ORDER BY pe2.reference_date DESC LIMIT 1) AS last_value
    FROM pac_valores_estimados pe
    WHERE pe.pac_indicator_id IS NOT NULL
    GROUP BY pe.pac_indicator_id
)
SELECT 
    COALESCE(n.indicator_id, r.indicator_id, p.indicator_id) AS indicator_id,
    (COALESCE(n.record_count, 0) + COALESCE(r.record_count, 0) + COALESCE(p.record_count, 0)) AS total_count,
    LEAST(n.min_date, r.min_date, p.min_date) AS min_date,
    GREATEST(n.max_date, r.max_date, p.max_date) AS max_date,
    COALESCE(
        CASE
            WHEN COALESCE(n.max_date, '1900-01-01') >= COALESCE(r.max_date, '1900-01-01') 
                AND COALESCE(n.max_date, '1900-01-01') >= COALESCE(p.max_date, '1900-01-01') THEN n.last_value
            WHEN COALESCE(r.max_date, '1900-01-01') >= COALESCE(p.max_date, '1900-01-01') THEN r.last_value
            ELSE p.last_value
        END, n.last_value, r.last_value, p.last_value
    ) AS last_value
FROM national_stats n
FULL JOIN regional_stats r ON n.indicator_id = r.indicator_id
FULL JOIN pac_estimated_stats p ON COALESCE(n.indicator_id, r.indicator_id) = p.indicator_id;

-- Grant permissions on views
GRANT SELECT ON public.maieutic_effectiveness TO authenticated, anon;
GRANT SELECT ON public.v_document_taxonomies TO authenticated, anon;
GRANT SELECT ON public.indicator_stats_summary TO authenticated, anon;
