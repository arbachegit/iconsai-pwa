-- Insert new notification event types for centralized notification system
INSERT INTO public.notification_preferences (event_type, event_label, email_enabled, whatsapp_enabled)
VALUES 
  -- Category A: Security & Auth
  ('password_reset', 'Recuperação de Senha', true, false),
  ('login_alert', 'Alerta de Login Suspeito', true, true),
  
  -- Category B: Data Intelligence
  ('sentiment_alert', 'Alerta de Sentimento Negativo', true, false),
  ('taxonomy_anomaly', 'Anomalia de Taxonomia', true, false),
  
  -- Category C: System Status
  ('scan_complete', 'Scan de Segurança Concluído', true, false)
ON CONFLICT (event_type) DO NOTHING;