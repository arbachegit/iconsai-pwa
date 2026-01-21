// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

/**
 * Módulo centralizado de logging para Edge Functions
 * Logger estruturado com sanitização automática de dados sensíveis
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  functionName: string;
  requestId?: string;
  data?: Record<string, unknown>;
  duration?: number;
}

// Chaves que devem ser redacted automaticamente
const SENSITIVE_KEYS = [
  "password",
  "senha",
  "token",
  "secret",
  "key",
  "apikey",
  "api_key",
  "authorization",
  "auth",
  "phone",
  "telefone",
  "email",
  "cpf",
  "cnpj",
  "credit_card",
  "card_number",
  "cvv",
  "pin",
  "ssn",
];

// Padrões que devem ser redacted
const SENSITIVE_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone US format
  /\b\d{2}[-.\s]?\d{4,5}[-.\s]?\d{4}\b/g, // Phone BR format
  /\b\d{11}\b/g, // CPF
  /\b\d{14}\b/g, // CNPJ
];

/**
 * Sanitiza dados removendo informações sensíveis
 * @param data - Dados a sanitizar
 * @param depth - Profundidade atual de recursão
 * @returns Dados sanitizados
 */
function sanitizeData(data: unknown, depth = 0): unknown {
  // Previne recursão infinita
  if (depth > 10) return "[MAX_DEPTH]";
  
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === "string") {
    let sanitized = data;
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, "[REDACTED]");
    }
    return sanitized;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, depth + 1));
  }
  
  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();
      
      // Verifica se a chave é sensível
      const isSensitive = SENSITIVE_KEYS.some(sk => 
        keyLower.includes(sk) || sk.includes(keyLower)
      );
      
      if (isSensitive) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = sanitizeData(value, depth + 1);
      } else if (typeof value === "string") {
        sanitized[key] = sanitizeData(value, depth + 1);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  return data;
}

/**
 * Formata a mensagem de log
 * @param entry - Entrada de log
 * @returns String formatada
 */
function formatLogEntry(entry: LogEntry): string {
  const parts = [
    `[${entry.functionName}]`,
    `[${entry.level.toUpperCase()}]`,
    entry.message,
  ];
  
  if (entry.duration !== undefined) {
    parts.push(`(${entry.duration}ms)`);
  }
  
  return parts.join(" ");
}

/**
 * Cria um logger para uma função específica
 * @param functionName - Nome da função para identificação nos logs
 * @returns Objeto logger com métodos debug, info, warn, error
 */
export function createLogger(functionName: string) {
  let requestId: string | undefined;
  let startTime: number | undefined;
  
  const log = (level: LogLevel, message: string, data?: unknown) => {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      functionName,
      requestId,
      data: data ? (sanitizeData(data) as Record<string, unknown>) : undefined,
      duration: startTime ? Date.now() - startTime : undefined,
    };
    
    const formattedMessage = formatLogEntry(entry);
    
    switch (level) {
      case "error":
        console.error(formattedMessage, entry.data || "");
        break;
      case "warn":
        console.warn(formattedMessage, entry.data || "");
        break;
      case "debug":
        // Debug só loga em ambiente de desenvolvimento
        if (Deno.env.get("ENVIRONMENT") !== "production") {
          console.log(formattedMessage, entry.data || "");
        }
        break;
      default:
        console.log(formattedMessage, entry.data || "");
    }
  };

  return {
    /**
     * Log de debug (não aparece em produção)
     */
    debug: (message: string, data?: unknown) => log("debug", message, data),
    
    /**
     * Log informativo
     */
    info: (message: string, data?: unknown) => log("info", message, data),
    
    /**
     * Log de aviso
     */
    warn: (message: string, data?: unknown) => log("warn", message, data),
    
    /**
     * Log de erro
     */
    error: (message: string, data?: unknown) => log("error", message, data),
    
    /**
     * Define o ID da requisição para rastreamento
     */
    setRequestId: (id: string) => {
      requestId = id;
    },
    
    /**
     * Inicia contagem de tempo para medir duração
     */
    startTimer: () => {
      startTime = Date.now();
    },
    
    /**
     * Retorna duração desde startTimer
     */
    getDuration: (): number | undefined => {
      return startTime ? Date.now() - startTime : undefined;
    },
    
    /**
     * Log de início de requisição
     */
    requestStart: (method: string, path?: string) => {
      startTime = Date.now();
      requestId = crypto.randomUUID().slice(0, 8);
      log("info", `→ ${method} ${path || ""}`, { requestId });
    },
    
    /**
     * Log de fim de requisição
     */
    requestEnd: (status: number) => {
      const duration = startTime ? Date.now() - startTime : undefined;
      log("info", `← ${status}`, { duration, requestId });
    },
  };
}

/**
 * Cria um logger simples sem contexto de função
 * Útil para scripts de inicialização ou utilitários
 */
export const globalLogger = createLogger("global");
