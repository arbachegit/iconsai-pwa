/**
 * Invitation Channel Rules Engine
 * 
 * REGRAS OBRIGATÓRIAS (v2 - Mandatory):
 * 
 * PLATAFORMA:
 * - Email: OBRIGATÓRIO (sempre)
 * - WhatsApp: INFORMATIVO se tiver telefone (avisa que enviou email)
 * 
 * APP (PWA):
 * - Email: PROIBIDO
 * - WhatsApp: OBRIGATÓRIO (telefone é obrigatório)
 * 
 * AMBOS (Plataforma + APP):
 * - Email: OBRIGATÓRIO (para Plataforma)
 * - WhatsApp: OBRIGATÓRIO (para APP) + INFORMATIVO (para Plataforma)
 */

export interface ChannelRuleParams {
  hasAppAccess: boolean;
  hasPlatformAccess: boolean;
  hasPhone: boolean;
}

export interface MandatorySendPlan {
  email: {
    required: boolean;
    product: "platform" | null;
    reason: string;
  };
  whatsapp: {
    required: boolean;
    products: ("app" | "platform_info")[];
    reason: string;
  };
  canProceed: boolean;
  blockingReason: string | null;
}

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Returns the mandatory send plan based on access configuration
 * This is the source of truth for what MUST be sent
 */
export function getMandatorySendPlan(params: ChannelRuleParams): MandatorySendPlan {
  const { hasAppAccess, hasPlatformAccess, hasPhone } = params;
  
  const plan: MandatorySendPlan = {
    email: { required: false, product: null, reason: "" },
    whatsapp: { required: false, products: [], reason: "" },
    canProceed: true,
    blockingReason: null
  };

  // PWA-only: WhatsApp OBRIGATÓRIO, Email PROIBIDO
  if (hasAppAccess && !hasPlatformAccess) {
    if (!hasPhone) {
      plan.canProceed = false;
      plan.blockingReason = "Telefone é obrigatório para convites de APP";
      return plan;
    }
    plan.whatsapp = {
      required: true,
      products: ["app"],
      reason: "APP requer WhatsApp obrigatório"
    };
    return plan;
  }

  // Platform-only: Email OBRIGATÓRIO, WhatsApp informativo se tiver phone
  if (hasPlatformAccess && !hasAppAccess) {
    plan.email = {
      required: true,
      product: "platform",
      reason: "Plataforma requer Email obrigatório"
    };
    if (hasPhone) {
      plan.whatsapp = {
        required: false, // informativo, não bloqueia
        products: ["platform_info"],
        reason: "WhatsApp informativo para Plataforma"
      };
    }
    return plan;
  }

  // Both: Email OBRIGATÓRIO (plataforma) + WhatsApp OBRIGATÓRIO (app)
  if (hasPlatformAccess && hasAppAccess) {
    if (!hasPhone) {
      plan.canProceed = false;
      plan.blockingReason = "Telefone é obrigatório para envio de APP via WhatsApp";
      return plan;
    }
    plan.email = {
      required: true,
      product: "platform",
      reason: "Plataforma requer Email obrigatório"
    };
    plan.whatsapp = {
      required: true,
      products: ["app", "platform_info"],
      reason: "APP requer WhatsApp obrigatório + Plataforma informativo"
    };
    return plan;
  }

  // Fallback: no access selected
  plan.canProceed = false;
  plan.blockingReason = "Selecione pelo menos um tipo de acesso";
  return plan;
}

/**
 * Validates that the send plan can be executed
 */
export function getValidationErrors(params: ChannelRuleParams): ValidationError[] {
  const errors: ValidationError[] = [];
  const plan = getMandatorySendPlan(params);
  
  if (!plan.canProceed && plan.blockingReason) {
    errors.push({
      field: plan.blockingReason.includes("Telefone") ? "phone" : "access",
      message: plan.blockingReason
    });
  }
  
  return errors;
}

/**
 * Determines if a product selection is PWA-only
 */
export function isPwaOnly(product: "platform" | "app" | "both"): boolean {
  return product === "app";
}

/**
 * Get human-readable channel description for UI
 */
export function getChannelDescription(params: ChannelRuleParams): string {
  const plan = getMandatorySendPlan(params);
  
  if (!plan.canProceed) {
    return `⚠️ ${plan.blockingReason}`;
  }
  
  const parts: string[] = [];
  
  if (plan.email.required) {
    parts.push("📧 Email (Plataforma)");
  }
  
  if (plan.whatsapp.required || plan.whatsapp.products.length > 0) {
    const whatsappParts = plan.whatsapp.products.map(p => {
      if (p === "app") return "💬 WhatsApp (APP)";
      if (p === "platform_info") return "💬 WhatsApp (informativo)";
      return p;
    });
    parts.push(...whatsappParts);
  }
  
  return parts.join(" + ") || "Nenhum canal configurado";
}

// ==========================================
// DEPRECATED - Mantido para compatibilidade
// ==========================================

export interface AllowedChannels {
  email: boolean;
  whatsapp: boolean;
  both: boolean;
}

export interface ForcedChannelResult {
  forcedChannel: "whatsapp" | null;
  reason: string | null;
}

/**
 * @deprecated Use getMandatorySendPlan instead
 */
export function getAllowedChannels(params: ChannelRuleParams): AllowedChannels {
  const { hasAppAccess, hasPlatformAccess, hasPhone } = params;
  
  // PWA-only: WhatsApp ONLY
  if (hasAppAccess && !hasPlatformAccess) {
    return {
      email: false,
      whatsapp: hasPhone,
      both: false
    };
  }
  
  // Platform-only or Both: all channels available
  return {
    email: true,
    whatsapp: hasPhone,
    both: hasPhone
  };
}

/**
 * @deprecated Use getMandatorySendPlan instead
 */
export function getForcedChannels(params: ChannelRuleParams): ForcedChannelResult {
  const { hasAppAccess, hasPlatformAccess } = params;
  
  // PWA-only: MUST use WhatsApp
  if (hasAppAccess && !hasPlatformAccess) {
    return {
      forcedChannel: "whatsapp",
      reason: "Convites de APP são enviados exclusivamente via WhatsApp"
    };
  }
  
  return {
    forcedChannel: null,
    reason: null
  };
}

/**
 * @deprecated Use getChannelDescription instead
 */
export function getChannelAvailabilityLabel(
  channel: "email" | "whatsapp" | "both",
  allowed: AllowedChannels
): string {
  if (channel === "email" && !allowed.email) return "N/A";
  if (channel === "whatsapp" && !allowed.whatsapp) return "Sem telefone";
  if (channel === "both" && !allowed.both) return "N/A";
  return "";
}
