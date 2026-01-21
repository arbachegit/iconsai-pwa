-- Fix application functions missing search_path
ALTER FUNCTION public.collect_daily_taxonomy_metrics(p_date date) SET search_path = public;
ALTER FUNCTION public.get_classification_sources_stats() SET search_path = public;
ALTER FUNCTION public.get_taxonomy_distribution_by_domain() SET search_path = public;
ALTER FUNCTION public.get_taxonomy_metrics_timeseries(p_days integer) SET search_path = public;
ALTER FUNCTION public.normalize_document_names() SET search_path = public;
ALTER FUNCTION public.update_reclassification_job_timestamp() SET search_path = public;