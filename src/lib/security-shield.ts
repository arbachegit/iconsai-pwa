/**
 * ============================================================
 * SECURITY SHIELD - KnowYOU v5.0.0
 * ============================================================
 * Sistema de Proteção com RESPEITO TOTAL às configurações do banco
 *
 * CORREÇÕES v5:
 * - ✅ Configurações do banco são SEMPRE respeitadas
 * - ✅ Whitelist funciona corretamente (IP e Device)
 * - ✅ Se shield_enabled = false no banco, NADA é bloqueado
 * - ✅ Defaults SEGUROS (tudo desabilitado) quando config não carrega
 * - ✅ Logs claros para debug
 * - ✅ Remoção de banimento funciona
 *
 * REGRA DE OURO: Se não conseguir carregar config do banco,
 * assume que TUDO está DESABILITADO (fail-safe)
 * ============================================================
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================
// TIPOS E INTERFACES
// ============================================
interface SecurityShieldConfig {
  id: string;
  shield_enabled: boolean;
  devtools_detection_enabled: boolean;
  keyboard_shortcuts_block_enabled: boolean;
  right_click_block_enabled: boolean;
  text_selection_block_enabled: boolean;
  console_clear_enabled: boolean;
  console_clear_interval_ms: number;
  console_warning_title: string;
  console_warning_subtitle: string;
  console_warning_body: string;
  monitoring_interval_ms: number;
  max_violation_attempts: number;
  show_violation_popup: boolean;
  auto_ban_on_violation: boolean;
  ban_duration_hours: number;
  react_devtools_detection_enabled: boolean;
  iframe_detection_enabled: boolean;
  whitelisted_domains: string[];
}

// ============================================
// DEFAULTS SEGUROS - TUDO DESABILITADO
// ============================================
const SAFE_DEFAULTS: SecurityShieldConfig = {
  id: "default",
  shield_enabled: false, // ✅ SEGURO: desabilitado por padrão
  devtools_detection_enabled: false,
  keyboard_shortcuts_block_enabled: false,
  right_click_block_enabled: false,
  text_selection_block_enabled: false,
  console_clear_enabled: false,
  console_clear_interval_ms: 1000,
  console_warning_title: "⛔ ACESSO RESTRITO",
  console_warning_subtitle: "Sistema de Segurança KnowYOU",
  console_warning_body: "Qualquer tentativa de inspeção resultará em banimento.",
  monitoring_interval_ms: 500,
  max_violation_attempts: 3,
  show_violation_popup: true,
  auto_ban_on_violation: false, // ✅ SEGURO: não banir automaticamente
  ban_duration_hours: 72,
  react_devtools_detection_enabled: false,
  iframe_detection_enabled: false,
  whitelisted_domains: [
    "localhost",
    "127.0.0.1",
    "lovable.app",
    "lovableproject.com",
    "gptengineer.run",
    "webcontainer.io",
  ],
};

type ViolationType =
  | "devtools_open"
  | "keyboard_shortcut"
  | "right_click"
  | "debugger"
  | "react_devtools"
  | "iframe_attempt"
  | "text_selection"
  | "console_access"
  | "screenshot_attempt";

interface BanStatus {
  isBanned: boolean;
  reason?: string;
  bannedAt?: string;
  violationType?: string;
  deviceId?: string;
  whitelisted?: boolean;
}

interface DeviceData {
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  screenResolution: string;
  canvasFingerprint: string;
  webglFingerprint: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  timezone: string;
  language: string;
  platform: string;
}

// ============================================
// ESTADO GLOBAL
// ============================================
let isBanned = false;
let isUserWhitelisted = false;
let deviceFingerprint: string | null = null;
let deviceData: DeviceData | null = null;
let monitoringInterval: ReturnType<typeof setInterval> | null = null;
let consoleInterval: ReturnType<typeof setInterval> | null = null;
let violationCount = 0;

// ✅ CORREÇÃO: Config SEMPRE tem valor (defaults seguros)
let shieldConfig: SecurityShieldConfig = { ...SAFE_DEFAULTS };
let configLoadedFromDB = false;
let whitelistCheckComplete = false;
let initializationComplete = false;

// ============================================
// LOGGING HELPER
// ============================================
function securityLog(level: "info" | "warn" | "error", message: string, data?: any): void {
  const prefix = "🛡️ Security Shield v5:";
  const timestamp = new Date().toISOString();

  if (data) {
    console[level](`${prefix} [${timestamp}] ${message}`, data);
  } else {
    console[level](`${prefix} [${timestamp}] ${message}`);
  }
}

// ============================================
// DETECÇÃO DE DISPOSITIVO MOBILE
// ============================================
function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;

  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    "android",
    "webos",
    "iphone",
    "ipad",
    "ipod",
    "blackberry",
    "windows phone",
    "opera mini",
    "mobile",
  ];
  const isMobileUA = mobileKeywords.some((keyword) => userAgent.includes(keyword));
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth < 768;
  const isPWA =
    window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;

  return isMobileUA || (hasTouch && isSmallScreen) || isPWA;
}

// ============================================
// VERIFICAR SE DOMÍNIO ESTÁ NA WHITELIST
// ============================================
function isWhitelistedDomain(): boolean {
  if (typeof window === "undefined") return true;

  const hostname = window.location.hostname;
  const domains = shieldConfig.whitelisted_domains || SAFE_DEFAULTS.whitelisted_domains;

  return domains.some((domain) => hostname.includes(domain));
}

// ============================================
// VERIFICAR SE É AMBIENTE DE PRODUÇÃO
// ============================================
function isProduction(): boolean {
  return !isWhitelistedDomain();
}

// ============================================
// VERIFICAR SE SHIELD ESTÁ REALMENTE ATIVO
// ============================================
function isShieldActive(): boolean {
  // ✅ REGRA 1: Se usuário está na whitelist, shield NUNCA está ativo
  if (isUserWhitelisted) {
    return false;
  }

  // ✅ REGRA 2: Se shield_enabled é false no banco, não está ativo
  if (!shieldConfig.shield_enabled) {
    return false;
  }

  // ✅ REGRA 3: Se está em domínio de desenvolvimento, não está ativo
  if (!isProduction()) {
    return false;
  }

  return true;
}

// ============================================
// CARREGAR CONFIGURAÇÕES DO BANCO
// ============================================
async function fetchSecurityConfig(): Promise<void> {
  try {
    securityLog("info", "Carregando configurações do banco...");

    const { data, error } = await supabase.from("security_shield_config").select("*").limit(1).single();

    if (error) {
      securityLog("warn", "Erro ao carregar config do banco, usando DEFAULTS SEGUROS", error.message);
      // ✅ MANTÉM DEFAULTS SEGUROS (tudo desabilitado)
      shieldConfig = { ...SAFE_DEFAULTS };
      configLoadedFromDB = false;
      return;
    }

    if (data) {
      // ✅ Merge com defaults para garantir que todas as propriedades existem
      shieldConfig = {
        ...SAFE_DEFAULTS,
        ...data,
      };
      configLoadedFromDB = true;

      securityLog("info", "Configurações carregadas do banco:", {
        shield_enabled: shieldConfig.shield_enabled,
        devtools_detection_enabled: shieldConfig.devtools_detection_enabled,
        keyboard_shortcuts_block_enabled: shieldConfig.keyboard_shortcuts_block_enabled,
        right_click_block_enabled: shieldConfig.right_click_block_enabled,
        auto_ban_on_violation: shieldConfig.auto_ban_on_violation,
      });
    } else {
      securityLog("warn", "Nenhuma config encontrada no banco, usando DEFAULTS SEGUROS");
      shieldConfig = { ...SAFE_DEFAULTS };
      configLoadedFromDB = false;
    }
  } catch (error) {
    securityLog("error", "Exceção ao carregar config, usando DEFAULTS SEGUROS", error);
    shieldConfig = { ...SAFE_DEFAULTS };
    configLoadedFromDB = false;
  }
}

// ============================================
// VERIFICAR WHITELIST (IP e Device)
// ============================================
async function checkWhitelistStatus(): Promise<void> {
  try {
    const fingerprint = getFingerprint();

    securityLog("info", "Verificando status de whitelist...");

    const { data, error } = await supabase.functions.invoke("check-ban-status", {
      body: { deviceFingerprint: fingerprint },
    });

    if (error) {
      securityLog("warn", "Erro ao verificar whitelist, assumindo NÃO whitelisted", error);
      isUserWhitelisted = false;
      whitelistCheckComplete = true;
      return;
    }

    // ✅ Verificar se retornou whitelisted = true
    if (data?.whitelisted === true) {
      isUserWhitelisted = true;
      securityLog("info", "✅ USUÁRIO NA WHITELIST - Todas as proteções DESATIVADAS", {
        whitelistEntry: data.whitelistEntry,
      });
    } else {
      isUserWhitelisted = false;
      securityLog("info", "Usuário NÃO está na whitelist");
    }

    // ✅ Verificar se está banido
    if (data?.isBanned === true) {
      isBanned = true;
      securityLog("warn", "🚫 USUÁRIO BANIDO", {
        reason: data.reason,
        bannedAt: data.bannedAt,
      });
    }
  } catch (error) {
    securityLog("error", "Exceção ao verificar whitelist", error);
    isUserWhitelisted = false;
  } finally {
    whitelistCheckComplete = true;
  }
}

// ============================================
// FINGERPRINTING
// ============================================
function generateCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no-canvas";

    canvas.width = 200;
    canvas.height = 50;
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(10, 0, 100, 30);
    ctx.fillStyle = "#069";
    ctx.fillText("KnowYOU Security v5", 10, 20);

    const dataUrl = canvas.toDataURL();
    let hash = 0;
    for (let i = 0; i < dataUrl.length; i++) {
      const char = dataUrl.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  } catch {
    return "error";
  }
}

function generateWebGLFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return "no-webgl";

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return "no-debug-info";

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "unknown";
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "unknown";

    const combined = `${vendor}|${renderer}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  } catch {
    return "error";
  }
}

function detectBrowser(): { name: string; version: string } {
  const ua = navigator.userAgent;
  let name = "Unknown";
  let version = "0";

  if (ua.includes("Firefox/")) {
    name = "Firefox";
    version = ua.split("Firefox/")[1]?.split(" ")[0] || "0";
  } else if (ua.includes("Edg/")) {
    name = "Edge";
    version = ua.split("Edg/")[1]?.split(" ")[0] || "0";
  } else if (ua.includes("Chrome/")) {
    name = "Chrome";
    version = ua.split("Chrome/")[1]?.split(" ")[0] || "0";
  } else if (ua.includes("Safari/") && !ua.includes("Chrome")) {
    name = "Safari";
    version = ua.split("Version/")[1]?.split(" ")[0] || "0";
  }

  return { name, version };
}

function detectOS(): { name: string; version: string } {
  const ua = navigator.userAgent;
  let name = "Unknown";
  let version = "0";

  if (ua.includes("Windows NT")) {
    name = "Windows";
    const match = ua.match(/Windows NT (\d+\.?\d*)/);
    if (match) version = match[1];
  } else if (ua.includes("Mac OS X")) {
    name = "macOS";
    const match = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
    version = match ? match[1].replace(/_/g, ".") : "0";
  } else if (ua.includes("Android")) {
    name = "Android";
    const match = ua.match(/Android (\d+\.?\d*)/);
    version = match ? match[1] : "0";
  } else if (ua.includes("iPhone") || ua.includes("iPad")) {
    name = "iOS";
    const match = ua.match(/OS (\d+[._]\d+[._]?\d*)/);
    version = match ? match[1].replace(/_/g, ".") : "0";
  } else if (ua.includes("Linux")) {
    name = "Linux";
  }

  return { name, version };
}

function collectDeviceData(): DeviceData {
  if (deviceData) return deviceData;

  const browser = detectBrowser();
  const os = detectOS();

  deviceData = {
    browserName: browser.name,
    browserVersion: browser.version,
    osName: os.name,
    osVersion: os.version,
    screenResolution: `${screen.width}x${screen.height}`,
    canvasFingerprint: generateCanvasFingerprint(),
    webglFingerprint: generateWebGLFingerprint(),
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    // @ts-ignore
    deviceMemory: navigator.deviceMemory || 0,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
  };

  return deviceData;
}

function generateFingerprint(): string {
  if (deviceFingerprint) return deviceFingerprint;

  const data = collectDeviceData();
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    data.timezone,
    data.screenResolution,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    data.hardwareConcurrency,
    data.deviceMemory,
    data.canvasFingerprint,
    data.webglFingerprint,
  ];

  const fingerprint = components.join("|");
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  deviceFingerprint = Math.abs(hash).toString(36) + Date.now().toString(36);

  try {
    localStorage.setItem("_dfp", deviceFingerprint);
  } catch {}

  return deviceFingerprint;
}

function getFingerprint(): string {
  if (deviceFingerprint) return deviceFingerprint;

  try {
    const cached = localStorage.getItem("_dfp");
    if (cached) {
      deviceFingerprint = cached;
      return cached;
    }
  } catch {}

  return generateFingerprint();
}

// ============================================
// POP-UP DE AVISO
// ============================================
function showWarningPopup(remainingAttempts: number, banHours: number): void {
  const existingPopup = document.getElementById("security-warning-popup");
  if (existingPopup) existingPopup.remove();

  const overlay = document.createElement("div");
  overlay.id = "security-warning-popup";
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.85); z-index: 999998;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: system-ui, -apple-system, sans-serif; color: white; text-align: center; padding: 20px;
  `;

  const pluralText = remainingAttempts === 1 ? "vez" : "vezes";

  overlay.innerHTML = `
    <div style="font-size: 80px; margin-bottom: 20px;">⚠️</div>
    <h1 style="font-size: 28px; margin-bottom: 16px; color: #ffcc00;">AVISO DE SEGURANÇA</h1>
    <p style="font-size: 18px; color: #fff; margin-bottom: 24px; max-width: 500px; line-height: 1.6;">
      Tentativa de violação de segurança detectada!
    </p>
    <div style="background: rgba(255, 204, 0, 0.15); border: 2px solid #ffcc00; padding: 20px 32px; border-radius: 12px; margin-bottom: 24px;">
      <p style="font-size: 20px; color: #ffcc00; font-weight: bold; margin: 0;">
        Se você tentar violar as regras de segurança mais ${remainingAttempts} ${pluralText}, será banido por ${banHours} horas.
      </p>
    </div>
    <button id="warning-understand-btn" style="
      background: linear-gradient(135deg, #ffcc00 0%, #ff9900 100%);
      color: black; border: none; padding: 14px 40px; font-size: 16px; font-weight: bold;
      border-radius: 8px; cursor: pointer;
    ">Entendi</button>
  `;

  document.body.appendChild(overlay);

  const dismissPopup = () => {
    overlay.remove();
  };

  document.getElementById("warning-understand-btn")?.addEventListener("click", dismissPopup);
  setTimeout(dismissPopup, 10000);
}

// ============================================
// TELA DE BANIMENTO
// ============================================
function showBanScreen(reason: string, deviceId: string, hours: number): void {
  window.dispatchEvent(
    new CustomEvent("security-banned", {
      detail: { reason, deviceId, hours },
    }),
  );

  const overlay = document.createElement("div");
  overlay.id = "security-ban-overlay";
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: linear-gradient(135deg, #1a0000 0%, #3d0000 50%, #1a0000 100%);
    z-index: 999999; display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: system-ui, -apple-system, sans-serif; color: white; text-align: center; padding: 20px;
  `;

  overlay.innerHTML = `
    <div style="font-size: 80px; margin-bottom: 20px;">🚫</div>
    <h1 style="font-size: 36px; margin-bottom: 16px; color: #ff4444;">VOCÊ ESTÁ BANIDO</h1>
    <p style="font-size: 24px; color: #ff8888; margin-bottom: 24px; font-weight: bold;">
      Você está banido por ${hours} horas.
    </p>
    <div style="background: rgba(255,255,255,0.1); padding: 16px 24px; border-radius: 8px; margin-bottom: 24px;">
      <p style="font-size: 14px; color: #888; margin-bottom: 8px;">Motivo: ${reason}</p>
      <p style="font-size: 12px; color: #666;">ID do Dispositivo: ${deviceId.substring(0, 16)}</p>
    </div>
    <p style="font-size: 12px; color: #444; margin-top: 24px;">Sistema de Segurança KnowYOU v5</p>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
}

// ============================================
// HANDLER DE VIOLAÇÃO
// ============================================
function handleViolation(type: ViolationType, details: Record<string, unknown> = {}): void {
  // ✅ VERIFICAÇÃO 1: Aguardar inicialização completa
  if (!initializationComplete) {
    securityLog("info", `Ignorando ${type} - inicialização não completa`);
    return;
  }

  // ✅ VERIFICAÇÃO 2: Se shield não está ativo, ignorar
  if (!isShieldActive()) {
    securityLog("info", `Ignorando ${type} - shield não está ativo`, {
      isUserWhitelisted,
      shield_enabled: shieldConfig.shield_enabled,
      isProduction: isProduction(),
    });
    return;
  }

  // ✅ VERIFICAÇÃO 3: Já banido
  if (isBanned) return;

  // ✅ VERIFICAÇÃO 4: Falso positivo de mobile
  if (type === "devtools_open" && details.method === "size_detection" && isMobileDevice()) {
    const heightDiff = details.heightDiff as number;
    if (heightDiff && heightDiff <= 300) {
      securityLog("info", `Ignorando falso positivo de mobile - heightDiff: ${heightDiff}`);
      return;
    }
  }

  violationCount++;

  const maxAttempts = shieldConfig.max_violation_attempts;
  const remainingAttempts = maxAttempts - violationCount;
  const banHours = shieldConfig.ban_duration_hours;

  securityLog("warn", `Violação detectada: ${type}`, {
    attempt: violationCount,
    maxAttempts,
    remainingAttempts,
  });

  if (violationCount >= maxAttempts) {
    if (shieldConfig.auto_ban_on_violation) {
      reportViolation(type, details);
    } else {
      securityLog("info", "Auto-ban desabilitado, não banindo usuário");
    }
  } else if (shieldConfig.show_violation_popup) {
    showWarningPopup(remainingAttempts, banHours);
  }
}

// ============================================
// REPORTAR VIOLAÇÃO
// ============================================
async function reportViolation(type: ViolationType, details: Record<string, unknown> = {}): Promise<void> {
  if (isBanned) return;

  isBanned = true;

  const fingerprint = getFingerprint();
  const data = collectDeviceData();
  const banHours = shieldConfig.ban_duration_hours;

  let userEmail: string | undefined;
  let userId: string | undefined;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      userEmail = user.email;
      userId = user.id;
    }
  } catch {}

  securityLog("warn", `Banimento aplicado: ${type}`);

  try {
    await supabase.functions.invoke("report-security-violation", {
      body: {
        violationType: type,
        deviceFingerprint: fingerprint,
        userAgent: navigator.userAgent,
        userEmail,
        userId,
        severity: "critical",
        violationDetails: details,
        pageUrl: window.location.href,
        banDurationHours: banHours,
        deviceData: data,
      },
    });
  } catch (error) {
    securityLog("error", "Falha ao reportar violação", error);
  }

  showBanScreen(type, fingerprint, banHours);
}

// ============================================
// DETECÇÃO DE DEVTOOLS
// ============================================
function detectDevTools(): { detected: boolean; method: string; details: Record<string, unknown> } {
  const result = { detected: false, method: "none", details: {} as Record<string, unknown> };

  // ✅ Se detecção de devtools está desabilitada, retornar false
  if (!shieldConfig.devtools_detection_enabled) {
    return result;
  }

  const widthDiff = window.outerWidth - window.innerWidth;
  const heightDiff = window.outerHeight - window.innerHeight;
  const isMobile = isMobileDevice();

  let shouldDetect = false;

  if (isMobile) {
    shouldDetect = widthDiff > 160;
  } else {
    shouldDetect = widthDiff > 160 || heightDiff > 160;
  }

  if (shouldDetect) {
    result.detected = true;
    result.method = "size_detection";
    result.details = { widthDiff, heightDiff, isMobile };
    return result;
  }

  // React DevTools
  if (shieldConfig.react_devtools_detection_enabled) {
    // @ts-ignore
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      // @ts-ignore
      const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (hook.isDisabled !== true && hook.supportsFiber) {
        result.detected = true;
        result.method = "react_devtools";
        return result;
      }
    }
  }

  return result;
}

// ============================================
// EVENT HANDLERS
// ============================================
function handleKeyDown(event: KeyboardEvent): void {
  if (!isShieldActive()) return;
  if (!shieldConfig.keyboard_shortcuts_block_enabled) return;

  const key = event.key.toLowerCase();
  const ctrl = event.ctrlKey || event.metaKey;
  const shift = event.shiftKey;

  // F12
  if (event.key === "F12") {
    event.preventDefault();
    event.stopPropagation();
    handleViolation("keyboard_shortcut", { key: "F12" });
    return;
  }

  // Ctrl+Shift+I
  if (ctrl && shift && key === "i") {
    event.preventDefault();
    event.stopPropagation();
    handleViolation("keyboard_shortcut", { key: "Ctrl+Shift+I" });
    return;
  }

  // Ctrl+Shift+J
  if (ctrl && shift && key === "j") {
    event.preventDefault();
    event.stopPropagation();
    handleViolation("keyboard_shortcut", { key: "Ctrl+Shift+J" });
    return;
  }

  // Ctrl+Shift+C
  if (ctrl && shift && key === "c") {
    event.preventDefault();
    event.stopPropagation();
    handleViolation("keyboard_shortcut", { key: "Ctrl+Shift+C" });
    return;
  }

  // Ctrl+U
  if (ctrl && key === "u") {
    event.preventDefault();
    event.stopPropagation();
    handleViolation("keyboard_shortcut", { key: "Ctrl+U" });
    return;
  }
}

function handleContextMenu(event: MouseEvent): void {
  if (!isShieldActive()) return;
  if (!shieldConfig.right_click_block_enabled) return;

  event.preventDefault();
  event.stopPropagation();
  handleViolation("right_click", { x: event.clientX, y: event.clientY });
}

function handleSelectStart(event: Event): void {
  if (!isShieldActive()) return;
  if (!shieldConfig.text_selection_block_enabled) return;

  event.preventDefault();
}

// ============================================
// MONITORAMENTO CONTÍNUO
// ============================================
function startMonitoring(): void {
  // ✅ Verificar se deve monitorar
  if (!isShieldActive()) {
    securityLog("info", "Monitoramento NÃO iniciado - shield não está ativo", {
      isUserWhitelisted,
      shield_enabled: shieldConfig.shield_enabled,
      configLoadedFromDB,
    });
    return;
  }

  securityLog("info", "Monitoramento INICIADO", {
    devtools_detection: shieldConfig.devtools_detection_enabled,
    console_clear: shieldConfig.console_clear_enabled,
  });

  // Monitor DevTools
  if (shieldConfig.devtools_detection_enabled) {
    monitoringInterval = setInterval(() => {
      if (isBanned || !isShieldActive()) {
        if (monitoringInterval) clearInterval(monitoringInterval);
        return;
      }

      const devToolsResult = detectDevTools();
      if (devToolsResult.detected) {
        handleViolation("devtools_open", {
          method: devToolsResult.method,
          ...devToolsResult.details,
        });
      }
    }, shieldConfig.monitoring_interval_ms);
  }

  // Console Clear
  if (shieldConfig.console_clear_enabled) {
    consoleInterval = setInterval(() => {
      if (!isShieldActive() || isBanned) {
        if (consoleInterval) clearInterval(consoleInterval);
        return;
      }

      console.clear();
      console.log(`%c${shieldConfig.console_warning_title}`, "color: red; font-size: 24px; font-weight: bold;");
      console.log(`%c${shieldConfig.console_warning_subtitle}`, "color: orange;");
      console.log(`%c${shieldConfig.console_warning_body}`, "color: orange;");
    }, shieldConfig.console_clear_interval_ms);
  }
}

// ============================================
// CHECK BAN STATUS
// ============================================
export async function checkBanStatus(): Promise<BanStatus> {
  const fingerprint = getFingerprint();

  try {
    const { data, error } = await supabase.functions.invoke("check-ban-status", {
      body: { deviceFingerprint: fingerprint },
    });

    if (error) {
      securityLog("error", "Erro ao verificar ban status", error);
      return { isBanned: false };
    }

    if (data?.isBanned) {
      isBanned = true;
      return data as BanStatus;
    }

    if (data?.whitelisted) {
      isUserWhitelisted = true;
    }

    return { isBanned: false, whitelisted: data?.whitelisted };
  } catch (error) {
    securityLog("error", "Exceção ao verificar ban status", error);
    return { isBanned: false };
  }
}

// ============================================
// INICIALIZAÇÃO PRINCIPAL
// ============================================
export async function initSecurityShield(): Promise<() => void> {
  securityLog("info", "=== INICIANDO SECURITY SHIELD v5 ===");

  // ✅ PASSO 1: Carregar configurações do banco
  await fetchSecurityConfig();

  // ✅ PASSO 2: Verificar whitelist
  await checkWhitelistStatus();

  // Marcar inicialização como completa
  initializationComplete = true;

  // ✅ PASSO 3: Se whitelist ou shield desabilitado, retornar sem fazer nada
  if (isUserWhitelisted) {
    securityLog("info", "✅ WHITELIST ATIVA - Nenhuma proteção será aplicada");
    return () => {};
  }

  if (!shieldConfig.shield_enabled) {
    securityLog("info", "⚙️ SHIELD DESABILITADO no banco - Nenhuma proteção será aplicada");
    return () => {};
  }

  if (!isProduction()) {
    securityLog("info", "🔧 AMBIENTE DE DESENVOLVIMENTO - Nenhuma proteção será aplicada");
    return () => {};
  }

  // ✅ PASSO 4: Se banido, mostrar tela
  if (isBanned) {
    securityLog("warn", "🚫 Usuário já está banido");
    showBanScreen("Banimento anterior", getFingerprint(), shieldConfig.ban_duration_hours);
    return () => {};
  }

  // ✅ PASSO 5: Verificar iframe
  if (shieldConfig.iframe_detection_enabled) {
    try {
      if (window.self !== window.top) {
        handleViolation("iframe_attempt", { detected: "on_load" });
        return () => {};
      }
    } catch {
      handleViolation("iframe_attempt", { detected: "on_load_error" });
      return () => {};
    }
  }

  // ✅ PASSO 6: Adicionar event listeners
  document.addEventListener("keydown", handleKeyDown, true);
  document.addEventListener("contextmenu", handleContextMenu, true);

  if (shieldConfig.text_selection_block_enabled) {
    document.addEventListener("selectstart", handleSelectStart, true);
    document.addEventListener("dragstart", (e) => e.preventDefault(), true);
  }

  // ✅ PASSO 7: Iniciar monitoramento
  startMonitoring();

  securityLog("info", "🛡️ SHIELD ATIVO - Proteções aplicadas");

  // Cleanup function
  return () => {
    document.removeEventListener("keydown", handleKeyDown, true);
    document.removeEventListener("contextmenu", handleContextMenu, true);
    document.removeEventListener("selectstart", handleSelectStart, true);
    if (monitoringInterval) clearInterval(monitoringInterval);
    if (consoleInterval) clearInterval(consoleInterval);
  };
}

// ============================================
// EXPORTS
// ============================================
export function getDeviceFingerprint(): string {
  return getFingerprint();
}

export function isCurrentlyBanned(): boolean {
  return isBanned;
}

export function isWhitelisted(): boolean {
  return isUserWhitelisted;
}

export function getCollectedDeviceData(): DeviceData | null {
  return deviceData;
}

export function getCurrentConfig(): SecurityShieldConfig {
  return shieldConfig;
}

export function getViolationCount(): number {
  return violationCount;
}

export function isConfigLoaded(): boolean {
  return configLoadedFromDB;
}
