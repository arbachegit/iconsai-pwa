/**
 * Helper para extrair e mapear erros de Edge Functions
 * Garante que mensagens de erro sejam claras e acionáveis
 */

interface ParsedError {
  message: string;
  code?: string;
  isAuthError: boolean;
  isValidationError: boolean;
  isProviderError: boolean;
}

// Mapeamento de códigos de erro para mensagens amigáveis
const ERROR_CODE_MESSAGES: Record<string, string> = {
  // Erros de autenticação
  'SESSION_EXPIRED': 'Sessão expirada — faça login novamente',
  'UNAUTHORIZED': 'Não autorizado. Faça login novamente.',
  
  // Erros de validação de convite
  'DUPLICATE_INVITE': 'Já existe um convite pendente para este email',
  'ALREADY_REGISTERED': 'Este email já está cadastrado no sistema',
  'PHONE_REQUIRED': 'Telefone é obrigatório para envio via WhatsApp',
  'EMAIL_REQUIRED': 'Email é obrigatório para este tipo de convite',
  'INVALID_TOKEN': 'Convite não encontrado ou expirado',
  'INVITE_EXPIRED': 'Este convite expirou',
  'INVITE_USED': 'Este convite já foi utilizado',
  
  // Erros de provedores de mensagem
  'WHATSAPP_WINDOW_EXPIRED': 'WhatsApp: janela de 24h expirada. Tente outro método.',
  'WHATSAPP_TEMPLATE_ERROR': 'Erro no template do WhatsApp. Contate o suporte.',
  'TWILIO_ERROR': 'Erro no provedor de mensagens. Tente novamente.',
  'SMS_FAILED': 'Falha ao enviar SMS. Verifique o número.',
  'EMAIL_FAILED': 'Falha ao enviar email. Verifique o endereço.',
  'RESEND_ERROR': 'Erro ao enviar email. Tente novamente.',
  
  // Erros de configuração
  'MISSING_CREDENTIALS': 'Configuração do servidor incompleta',
  'RATE_LIMIT': 'Muitas tentativas. Aguarde alguns minutos.',
  
  // Erros genéricos
  'VALIDATION_ERROR': 'Dados inválidos. Verifique os campos.',
  'NOT_FOUND': 'Recurso não encontrado',
  'INTERNAL_ERROR': 'Erro interno do servidor',
};

/**
 * Extrai mensagem de erro detalhada do objeto de erro da Edge Function
 */
export function extractEdgeFunctionError(error: unknown): ParsedError {
  const result: ParsedError = {
    message: 'Erro desconhecido',
    isAuthError: false,
    isValidationError: false,
    isProviderError: false,
  };

  if (!error) {
    return result;
  }

  // Type guard para objetos
  const err = error as Record<string, unknown>;

  // Tenta extrair error_code primeiro
  const errorCode = 
    (err.context as Record<string, unknown>)?.error_code as string ||
    (err.context as Record<string, unknown>)?.code as string ||
    err.error_code as string ||
    err.code as string;

  if (errorCode && ERROR_CODE_MESSAGES[errorCode]) {
    result.code = errorCode;
    result.message = ERROR_CODE_MESSAGES[errorCode];
    result.isAuthError = ['SESSION_EXPIRED', 'UNAUTHORIZED'].includes(errorCode);
    result.isValidationError = ['DUPLICATE_INVITE', 'ALREADY_REGISTERED', 'PHONE_REQUIRED', 'EMAIL_REQUIRED', 'VALIDATION_ERROR'].includes(errorCode);
    result.isProviderError = ['WHATSAPP_WINDOW_EXPIRED', 'TWILIO_ERROR', 'SMS_FAILED', 'EMAIL_FAILED', 'RESEND_ERROR'].includes(errorCode);
    return result;
  }

  // Tenta extrair mensagem do contexto (formato comum de erros de edge function)
  const contextMessage = 
    (err.context as Record<string, unknown>)?.error as string ||
    (err.context as Record<string, unknown>)?.message as string;
  
  if (contextMessage) {
    result.message = contextMessage;
    return result;
  }

  // Tenta extrair mensagem direta
  const directMessage = err.error as string || err.message as string;
  
  if (directMessage) {
    // Detecta erros genéricos de HTTP e melhora a mensagem
    if (directMessage.includes('non-2xx')) {
      // Tenta extrair detalhes do corpo da resposta
      const bodyData = (err.context as Record<string, unknown>)?.body as Record<string, unknown>;
      if (bodyData?.error) {
        result.message = String(bodyData.error);
        result.code = bodyData.error_code as string || undefined;
        console.error('[EdgeFunction] non-2xx with body:', bodyData);
        return result;
      }
      result.message = 'Erro no servidor. Verifique os logs ou tente novamente.';
      console.error('[EdgeFunction] non-2xx error without body details:', err);
      return result;
    }
    
    if (directMessage.includes('401') || directMessage.toLowerCase().includes('unauthorized')) {
      result.message = 'Sessão expirada — faça login novamente';
      result.isAuthError = true;
      result.code = 'SESSION_EXPIRED';
      return result;
    }
    
    if (directMessage.includes('404')) {
      result.message = 'Recurso não encontrado';
      result.code = 'NOT_FOUND';
      return result;
    }
    
    if (directMessage.includes('429')) {
      result.message = 'Muitas tentativas. Aguarde alguns minutos.';
      result.code = 'RATE_LIMIT';
      return result;
    }

    result.message = directMessage;
    return result;
  }

  // Se for string direta
  if (typeof error === 'string') {
    result.message = error;
    return result;
  }

  return result;
}

/**
 * Formata erro para exibição em toast
 */
export function formatEdgeFunctionErrorForToast(error: unknown): { 
  title: string; 
  description?: string; 
} {
  const parsed = extractEdgeFunctionError(error);
  
  if (parsed.isAuthError) {
    return {
      title: 'Sessão Expirada',
      description: parsed.message,
    };
  }
  
  if (parsed.isValidationError) {
    return {
      title: 'Erro de Validação',
      description: parsed.message,
    };
  }
  
  if (parsed.isProviderError) {
    return {
      title: 'Erro no Envio',
      description: parsed.message,
    };
  }
  
  return {
    title: 'Erro',
    description: parsed.message,
  };
}

/**
 * Verifica se deve fazer logout do usuário baseado no erro
 */
export function shouldLogoutOnError(error: unknown): boolean {
  const parsed = extractEdgeFunctionError(error);
  return parsed.isAuthError;
}
