/**
 * Adapter hook para expor interface compatível com o padrão do prompt
 * Reutiliza a implementação nativa de device-fingerprint.ts
 */
import { useState, useEffect, useCallback } from "react";
import { getDeviceFingerprint, getDeviceInfo } from "@/lib/device-fingerprint";

export interface DeviceInfo {
  visitorId: string;
  components: {
    userAgent: string;
    language: string;
    colorDepth: number;
    screenResolution: string;
    timezone: string;
    platform: string;
    hardwareConcurrency: number;
    deviceMemory: number | undefined;
    osName: string;
    osVersion: string;
    browserName: string;
    browserVersion: string;
  };
  confidence: number;
}

interface UseDeviceFingerprintReturn {
  fingerprint: DeviceInfo | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useDeviceFingerprintAdapter = (): UseDeviceFingerprintReturn => {
  const [fingerprint, setFingerprint] = useState<DeviceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getFingerprint = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Usa a implementação nativa
      const deviceInfo = getDeviceInfo();
      
      const adapted: DeviceInfo = {
        visitorId: deviceInfo.fingerprint,
        components: {
          userAgent: deviceInfo.userAgent,
          language: navigator.language,
          colorDepth: screen.colorDepth,
          screenResolution: `${deviceInfo.screenWidth}x${deviceInfo.screenHeight}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          platform: navigator.platform,
          hardwareConcurrency: navigator.hardwareConcurrency || 0,
          deviceMemory: (navigator as any).deviceMemory,
          osName: deviceInfo.osName,
          osVersion: deviceInfo.osVersion,
          browserName: deviceInfo.browserName,
          browserVersion: deviceInfo.browserVersion,
        },
        // Confidence baseada em quantos componentes foram detectados
        confidence: calculateConfidence(deviceInfo),
      };
      
      setFingerprint(adapted);
    } catch (err) {
      console.error("Fingerprint error:", err);
      setError("Não foi possível identificar o dispositivo");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    getFingerprint();
  }, [getFingerprint]);

  return { 
    fingerprint, 
    isLoading, 
    error,
    refresh: getFingerprint,
  };
};

/**
 * Calcula um score de confiança baseado nos componentes detectados
 */
function calculateConfidence(deviceInfo: ReturnType<typeof getDeviceInfo>): number {
  let score = 0;
  const maxScore = 10;
  
  if (deviceInfo.osName !== "Unknown") score += 1;
  if (deviceInfo.osVersion) score += 1;
  if (deviceInfo.browserName !== "Unknown") score += 1;
  if (deviceInfo.browserVersion) score += 1;
  if (deviceInfo.deviceVendor !== "Unknown") score += 1;
  if (deviceInfo.deviceModel !== "Unknown") score += 1;
  if (deviceInfo.hasTouch) score += 1;
  if (deviceInfo.screenWidth > 0) score += 1;
  if (deviceInfo.pixelRatio > 0) score += 1;
  if (deviceInfo.fingerprint) score += 1;
  
  return score / maxScore;
}

export default useDeviceFingerprintAdapter;
