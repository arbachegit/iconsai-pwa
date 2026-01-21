-- Desativar o agente "Analista de Dados" (legado) - Não Utilizado
UPDATE public.chat_agents 
SET is_active = false,
    updated_at = NOW()
WHERE slug = 'analyst';