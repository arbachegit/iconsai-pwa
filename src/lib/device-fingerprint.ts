/**
 * ============================================================
 * lib/device-fingerprint.ts
 * ============================================================
 * Versão: 2.0.0 - 2026-01-10
 * SAFARI COMPATIBLE - Usa safari-storage para modo privado
 * Gerador de fingerprint único para dispositivos PWA
 * ============================================================
 */

import { safeGetItem, safeSetItem, safeRemoveItem } from '@/utils/safari-storage';

const STORAGE_KEY = 'pwa-device-fingerprint';

interface FingerprintComponents {
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  timezoneOffset: number;
  colorDepth: number;
  deviceMemory: number | null;
  hardwareConcurrency: number;
  touchSupport: boolean;
  webglVendor: string | null;
  webglRenderer: string | null;
}

/**
 * Gera um hash simples a partir de uma string
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Obtém informações do WebGL para fingerprinting
 */
function getWebGLInfo(): { vendor: string | null; renderer: string | null } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return { vendor: null, renderer: null };
    
    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return { vendor: null, renderer: null };
    
    return {
      vendor: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
      renderer: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    };
  } catch {
    return { vendor: null, renderer: null };
  }
}

/**
 * Coleta os componentes do fingerprint do dispositivo
 */
function collectFingerprintComponents(): FingerprintComponents {
  const webgl = getWebGLInfo();
  
  return {
    userAgent: navigator.userAgent || '',
    language: navigator.language || '',
    platform: navigator.platform || '',
    screenResolution: `${screen.width}x${screen.height}x${screen.availWidth}x${screen.availHeight}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    timezoneOffset: new Date().getTimezoneOffset(),
    colorDepth: screen.colorDepth || 24,
    deviceMemory: (navigator as any).deviceMemory || null,
    hardwareConcurrency: navigator.hardwareConcurrency || 1,
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    webglVendor: webgl.vendor,
    webglRenderer: webgl.renderer,
  };
}

/**
 * Gera o fingerprint a partir dos componentes coletados
 */
function generateFingerprint(components: FingerprintComponents): string {
  const componentString = [
    components.userAgent,
    components.language,
    components.platform,
    components.screenResolution,
    components.timezone,
    components.timezoneOffset.toString(),
    components.colorDepth.toString(),
    components.deviceMemory?.toString() || 'null',
    components.hardwareConcurrency.toString(),
    components.touchSupport.toString(),
    components.webglVendor || '',
    components.webglRenderer || '',
  ].join('|');
  
  const hash = simpleHash(componentString);
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  
  return `fp-${hash}-${timestamp}-${random}`;
}

/**
 * Obtém ou gera o fingerprint do dispositivo
 * Usa safeGetItem/safeSetItem para compatibilidade com Safari modo privado
 */
export function getDeviceFingerprint(): string {
  // Verificar se já existe um fingerprint armazenado
  const stored = safeGetItem(STORAGE_KEY);
  if (stored) {
    return stored;
  }
  
  // Gerar novo fingerprint
  const components = collectFingerprintComponents();
  const fingerprint = generateFingerprint(components);
  
  // Armazenar para uso futuro (com fallback para memória em modo privado)
  safeSetItem(STORAGE_KEY, fingerprint);
  
  return fingerprint;
}

/**
 * Obtém informações detalhadas do dispositivo para registro
 */
export function getDeviceInfo(): {
  fingerprint: string;
  osName: string;
  osVersion: string;
  browserName: string;
  browserVersion: string;
  deviceVendor: string;
  deviceModel: string;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  hasTouch: boolean;
  hasMicrophone: boolean;
  hasCamera: boolean;
  userAgent: string;
} {
  const fingerprint = getDeviceFingerprint();
  const ua = navigator.userAgent;
  
  // Detectar OS
  let osName = 'Unknown';
  let osVersion = '';
  
  if (/iPhone|iPad|iPod/.test(ua)) {
    osName = 'iOS';
    const match = ua.match(/OS (\d+[._]\d+)/);
    osVersion = match ? match[1].replace('_', '.') : '';
  } else if (/Android/.test(ua)) {
    osName = 'Android';
    const match = ua.match(/Android (\d+\.?\d*)/);
    osVersion = match ? match[1] : '';
  } else if (/Windows/.test(ua)) {
    osName = 'Windows';
    const match = ua.match(/Windows NT (\d+\.\d+)/);
    osVersion = match ? match[1] : '';
  } else if (/Mac OS X/.test(ua)) {
    osName = 'macOS';
    const match = ua.match(/Mac OS X (\d+[._]\d+)/);
    osVersion = match ? match[1].replace('_', '.') : '';
  } else if (/Linux/.test(ua)) {
    osName = 'Linux';
  }
  
  // Detectar Browser
  let browserName = 'Unknown';
  let browserVersion = '';
  
  if (/CriOS/.test(ua)) {
    browserName = 'Chrome iOS';
    const match = ua.match(/CriOS\/(\d+)/);
    browserVersion = match ? match[1] : '';
  } else if (/Chrome/.test(ua) && !/Edg/.test(ua)) {
    browserName = 'Chrome';
    const match = ua.match(/Chrome\/(\d+)/);
    browserVersion = match ? match[1] : '';
  } else if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
    browserName = 'Safari';
    const match = ua.match(/Version\/(\d+)/);
    browserVersion = match ? match[1] : '';
  } else if (/Firefox/.test(ua)) {
    browserName = 'Firefox';
    const match = ua.match(/Firefox\/(\d+)/);
    browserVersion = match ? match[1] : '';
  } else if (/Edg/.test(ua)) {
    browserName = 'Edge';
    const match = ua.match(/Edg\/(\d+)/);
    browserVersion = match ? match[1] : '';
  }
  
  // Detectar Device
  let deviceVendor = 'Unknown';
  let deviceModel = 'Unknown';
  
  if (/iPhone/.test(ua)) {
    deviceVendor = 'Apple';
    deviceModel = 'iPhone';
  } else if (/iPad/.test(ua)) {
    deviceVendor = 'Apple';
    deviceModel = 'iPad';
  } else if (/Samsung/.test(ua)) {
    deviceVendor = 'Samsung';
    const match = ua.match(/SM-([A-Z0-9]+)/);
    deviceModel = match ? `Galaxy ${match[1]}` : 'Galaxy';
  } else if (/Xiaomi|Redmi|POCO/.test(ua)) {
    deviceVendor = 'Xiaomi';
    const match = ua.match(/(Redmi|POCO|Mi)\s*([A-Z0-9]+)/i);
    deviceModel = match ? `${match[1]} ${match[2]}` : 'Xiaomi';
  } else if (/Motorola|moto/.test(ua)) {
    deviceVendor = 'Motorola';
    const match = ua.match(/moto\s*([a-z0-9]+)/i);
    deviceModel = match ? `Moto ${match[1]}` : 'Moto';
  }
  
  return {
    fingerprint,
    osName,
    osVersion,
    browserName,
    browserVersion,
    deviceVendor,
    deviceModel,
    screenWidth: screen.width,
    screenHeight: screen.height,
    pixelRatio: window.devicePixelRatio || 1,
    hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    hasMicrophone: true, // Será verificado no fluxo de permissões
    hasCamera: true, // Será verificado no fluxo de permissões
    userAgent: ua,
  };
}

/**
 * Regenera o fingerprint (útil em caso de problemas)
 */
export function regenerateFingerprint(): string {
  safeRemoveItem(STORAGE_KEY);
  return getDeviceFingerprint();
}
