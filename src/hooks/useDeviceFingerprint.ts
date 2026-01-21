/**
 * ============================================================
 * useDeviceFingerprint.ts - v1.0.0
 * ============================================================
 * Hook para coletar e gerenciar fingerprint do dispositivo
 * - Coleta informações básicas do navegador/dispositivo
 * - Gera hash único e estável
 * - Armazena no Supabase para análise comportamental
 * ============================================================
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DeviceInfo {
  userAgent: string;
  language: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  timezone: string;
  touchPoints: number;
  deviceMemory: number | null;
  hardwareConcurrency: number;
  cookiesEnabled: boolean;
  isOnline: boolean;
  webglVendor: string | null;
  webglRenderer: string | null;
}

interface FingerprintData {
  fingerprint: string;
  deviceInfo: DeviceInfo;
  createdAt: string;
}

// Gerar hash simples (não criptográfico, apenas para identificação)
function simpleHash(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString(16);

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(16).padStart(8, '0');
}

// Coletar informações WebGL
function getWebGLInfo(): { vendor: string | null; renderer: string | null } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) return { vendor: null, renderer: null };

    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');

    if (!debugInfo) return { vendor: null, renderer: null };

    return {
      vendor: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
      renderer: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
    };
  } catch {
    return { vendor: null, renderer: null };
  }
}

// Coletar todas as informações do dispositivo
function collectDeviceInfo(): DeviceInfo {
  const webglInfo = getWebGLInfo();

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    colorDepth: window.screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    touchPoints: navigator.maxTouchPoints || 0,
    deviceMemory: (navigator as any).deviceMemory || null,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    cookiesEnabled: navigator.cookieEnabled,
    isOnline: navigator.onLine,
    webglVendor: webglInfo.vendor,
    webglRenderer: webglInfo.renderer,
  };
}

// Gerar fingerprint único baseado nas informações do dispositivo
function generateFingerprint(deviceInfo: DeviceInfo): string {
  const components = [
    deviceInfo.userAgent,
    deviceInfo.language,
    deviceInfo.platform,
    `${deviceInfo.screenWidth}x${deviceInfo.screenHeight}`,
    deviceInfo.colorDepth.toString(),
    deviceInfo.timezone,
    deviceInfo.touchPoints.toString(),
    deviceInfo.hardwareConcurrency.toString(),
    deviceInfo.webglVendor || '',
    deviceInfo.webglRenderer || '',
  ];

  const combined = components.join('|');
  const hash1 = simpleHash(combined);
  const hash2 = simpleHash(combined.split('').reverse().join(''));

  return `fp_${hash1}${hash2}`;
}

export function useDeviceFingerprint(userPhone: string | null) {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Coletar e salvar fingerprint
  const collectAndSave = useCallback(async () => {
    if (!userPhone) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Coletar informações do dispositivo
      const info = collectDeviceInfo();
      const fp = generateFingerprint(info);

      console.log('[Fingerprint v1.0] Collected:', fp.substring(0, 20) + '...');
      console.log('[Fingerprint v1.0] Device Info:', {
        platform: info.platform,
        screen: `${info.screenWidth}x${info.screenHeight}`,
        touchPoints: info.touchPoints,
        timezone: info.timezone,
      });

      setDeviceInfo(info);
      setFingerprint(fp);

      // Salvar no Supabase
      try {
        const { error: insertError } = await supabase
          .from('pwa_device_fingerprints')
          .insert({
            phone: userPhone,
            fingerprint: fp,
            device_info: info,
            user_agent: info.userAgent,
            platform: info.platform,
            screen_size: `${info.screenWidth}x${info.screenHeight}`,
            timezone: info.timezone,
            touch_points: info.touchPoints,
          });

        if (insertError) {
          // Se a tabela não existir, apenas logar (não é erro crítico)
          if (insertError.code === '42P01') {
            console.log('[Fingerprint v1.0] Table does not exist yet, skipping save');
          } else {
            console.warn('[Fingerprint v1.0] Error saving:', insertError.message);
          }
        } else {
          console.log('[Fingerprint v1.0] ✅ Saved to database');
        }
      } catch (dbErr) {
        console.warn('[Fingerprint v1.0] Database error:', dbErr);
      }

    } catch (err) {
      console.error('[Fingerprint v1.0] Error:', err);
      setError('Erro ao coletar fingerprint');
    } finally {
      setIsLoading(false);
    }
  }, [userPhone]);

  // Coletar fingerprint quando o userPhone mudar
  useEffect(() => {
    collectAndSave();
  }, [collectAndSave]);

  return {
    fingerprint,
    deviceInfo,
    isLoading,
    error,
    refresh: collectAndSave,
  };
}

export default useDeviceFingerprint;
