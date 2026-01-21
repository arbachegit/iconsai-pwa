-- PART 1 & 4 & 5: Update notification templates with specific variables and professional content
-- Remove scan_complete event
DELETE FROM notification_preferences WHERE event_type = 'scan_complete';
DELETE FROM notification_templates WHERE event_type = 'scan_complete';

-- Update all templates with specific variables and professional content
-- Password Reset
UPDATE notification_templates 
SET 
  platform_name = 'Plataforma KnowYOU Health',
  variables_available = ARRAY['otp_code', 'user_name', 'timestamp', 'platform_name'],
  email_subject = '🔐 Código de Recuperação - Plataforma KnowYOU Health',
  email_body = 'Olá, {user_name}.

Recebemos uma solicitação para redefinir sua senha na Plataforma KnowYOU Health.

Seu código de verificação é:

{otp_code}

Este código expira em 10 minutos. Se você não solicitou, ignore este e-mail.',
  whatsapp_message = '🔐 {timestamp} - Plataforma KnowYOU Health: Seu código de recuperação é: {otp_code}. Não compartilhe.'
WHERE event_type = 'password_reset';

-- Security Alert (with severity templates)
UPDATE notification_templates 
SET 
  platform_name = 'Plataforma KnowYOU Health',
  variables_available = ARRAY['severity_level', 'severity_icon', 'threat_type', 'affected_asset', 'timestamp', 'platform_name'],
  email_subject = '🛡️ Alerta de Segurança - Plataforma KnowYOU Health',
  email_body = 'Alerta de segurança detectado.

Nível: {severity_level}
Tipo: {threat_type}
Ativo afetado: {affected_asset}

Horário: {timestamp}

Ação recomendada conforme severidade do alerta.',
  whatsapp_message = '🛡️ {timestamp} - Plataforma KnowYOU Health: Status: {severity_icon} {severity_level}. Detalhe: {threat_type} em {affected_asset}.'
WHERE event_type = 'security_alert';

-- Login Alert
UPDATE notification_templates 
SET 
  platform_name = 'Plataforma KnowYOU Health',
  variables_available = ARRAY['ip_address', 'device_name', 'location', 'timestamp', 'platform_name'],
  email_subject = '⚠️ Alerta de Login - Plataforma KnowYOU Health',
  email_body = 'Alerta de Acesso.

Detectamos um login em {device_name} vindo do IP {ip_address} ({location}).

Se não foi você, tome ação imediata para proteger sua conta.',
  whatsapp_message = '⚠️ {timestamp} - Plataforma KnowYOU Health: Acesso novo detectado: {device_name} ({location}). Verifique se foi você.'
WHERE event_type = 'login_alert';

-- ML Accuracy Drop
UPDATE notification_templates 
SET 
  platform_name = 'Plataforma KnowYOU Health',
  variables_available = ARRAY['model_name', 'current_accuracy', 'drop_percentage', 'timestamp', 'platform_name'],
  email_subject = '📉 Queda de Precisão ML - Plataforma KnowYOU Health',
  email_body = 'O modelo {model_name} apresentou uma queda de performance.

Precisão atual: {current_accuracy}%
Queda: {drop_percentage}%

Sugerimos retreino imediato.',
  whatsapp_message = '📉 {timestamp} - Plataforma KnowYOU Health: Modelo {model_name} com precisão {current_accuracy}% (queda de {drop_percentage}%).'
WHERE event_type = 'ml_accuracy_drop';

-- Sentiment Alert
UPDATE notification_templates 
SET 
  platform_name = 'Plataforma KnowYOU Health',
  variables_available = ARRAY['user_id', 'sentiment_score', 'trigger_phrase', 'timestamp', 'platform_name'],
  email_subject = '😔 Alerta de Sentimento Negativo - Plataforma KnowYOU Health',
  email_body = 'Atenção: Interação com score negativo detectada.

Usuário: {user_id}
Score: {sentiment_score}
Frase gatilho: ''{trigger_phrase}''

Considere acompanhamento do caso.',
  whatsapp_message = '😔 {timestamp} - Plataforma KnowYOU Health: Sentimento negativo detectado. Score: {sentiment_score}.'
WHERE event_type = 'sentiment_alert';

-- Taxonomy Anomaly
UPDATE notification_templates 
SET 
  platform_name = 'Plataforma KnowYOU Health',
  variables_available = ARRAY['category', 'conflict_reason', 'timestamp', 'platform_name'],
  email_subject = '⚠️ Anomalia de Taxonomia - Plataforma KnowYOU Health',
  email_body = 'Anomalia de taxonomia detectada.

Categoria: {category}
Razão do conflito: {conflict_reason}

Revise a estrutura de tags.',
  whatsapp_message = '⚠️ {timestamp} - Plataforma KnowYOU Health: Anomalia em {category}. Conflito: {conflict_reason}.'
WHERE event_type = 'taxonomy_anomaly';

-- Document Failed
UPDATE notification_templates 
SET 
  platform_name = 'Plataforma KnowYOU Health',
  variables_available = ARRAY['file_name', 'process_id', 'error_code', 'timestamp', 'platform_name'],
  email_subject = '❌ Falha no Processamento - Plataforma KnowYOU Health',
  email_body = 'Falha no processamento de documento.

Arquivo: {file_name}
ID do Processo: {process_id}
Código de erro: {error_code}

Verifique o documento e tente novamente.',
  whatsapp_message = '❌ {timestamp} - Plataforma KnowYOU Health: Falha ao processar {file_name}. Erro: {error_code}.'
WHERE event_type = 'document_failed';

-- New Document
UPDATE notification_templates 
SET 
  platform_name = 'Plataforma KnowYOU Health',
  variables_available = ARRAY['file_name', 'upload_date', 'timestamp', 'platform_name'],
  email_subject = '📄 Novo Documento RAG - Plataforma KnowYOU Health',
  email_body = 'Novo documento adicionado ao sistema RAG.

Arquivo: {file_name}
Data de upload: {upload_date}

O documento está disponível para consultas.',
  whatsapp_message = '📄 {timestamp} - Plataforma KnowYOU Health: Novo documento: {file_name}.'
WHERE event_type = 'new_document';

-- New Contact Message
UPDATE notification_templates 
SET 
  platform_name = 'Plataforma KnowYOU Health',
  variables_available = ARRAY['sender_name', 'snippet', 'timestamp', 'platform_name'],
  email_subject = '📬 Nova Mensagem de Contato - Plataforma KnowYOU Health',
  email_body = 'Nova mensagem de contato recebida.

De: {sender_name}
Prévia: {snippet}

Acesse o painel para responder.',
  whatsapp_message = '📬 {timestamp} - Plataforma KnowYOU Health: Mensagem de {sender_name}: {snippet}'
WHERE event_type = 'new_contact_message';

-- New Conversation
UPDATE notification_templates 
SET 
  platform_name = 'Plataforma KnowYOU Health',
  variables_available = ARRAY['sender_name', 'snippet', 'timestamp', 'platform_name'],
  email_subject = '💬 Nova Conversa - Plataforma KnowYOU Health',
  email_body = 'Nova conversa iniciada.

Usuário: {sender_name}
Primeira mensagem: {snippet}',
  whatsapp_message = '💬 {timestamp} - Plataforma KnowYOU Health: Nova conversa de {sender_name}.'
WHERE event_type = 'new_conversation';