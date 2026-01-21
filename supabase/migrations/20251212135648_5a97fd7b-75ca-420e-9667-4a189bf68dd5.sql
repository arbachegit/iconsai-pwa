-- Insert new notification event type in preferences
INSERT INTO notification_preferences (event_type, event_label, email_enabled, whatsapp_enabled)
VALUES ('api_ready_for_implementation', 'API Pronta para Implementação', true, true)
ON CONFLICT (event_type) DO NOTHING;

-- Insert custom template for the new event
INSERT INTO notification_templates (
  event_type, 
  platform_name,
  email_subject, 
  email_body, 
  whatsapp_message,
  variables_available
) VALUES (
  'api_ready_for_implementation',
  'Plataforma KnowYOU Health',
  '🚀 Nova API Pronta: {api_name}',
  'A API "{api_name}" ({provider}) foi testada com sucesso e está pronta para implementação.

Variáveis selecionadas: {selected_variables}
Período: {period_start} → {period_end}

Acesse o painel administrativo para copiar os parâmetros e implementar na Gestão de APIs Externas.

Data: {timestamp}',
  '🚀 *Nova API Pronta*

API: {api_name}
Provedor: {provider}
Variáveis: {selected_variables}
Período: {period_start} → {period_end}

Acesse o Admin para implementar.
{timestamp}',
  ARRAY['api_name', 'provider', 'selected_variables', 'period_start', 'period_end', 'timestamp']
)
ON CONFLICT (event_type) DO NOTHING;