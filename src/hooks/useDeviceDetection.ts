import { useState, useEffect, useMemo } from 'react';

export type Platform = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';

export interface DeviceInfo {
  isMobile: boolean;
  isDesktop: boolean;
  isTablet: boolean;
  isTouchDevice: boolean;
  platform: Platform;
  browser: string;
  screenWidth: number;
  screenHeight: number;
  userAgent: string;
  isStandalone: boolean;
  pixelRatio: number;
  isLandscape: boolean;
}

const MOBILE_BREAKPOINT = 768;
const DESKTOP_BREAKPOINT = 1024;

function detectPlatform(userAgent: string): Platform {
  const ua = userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/windows/.test(ua)) return 'windows';
  if (/macintosh|mac os x/.test(ua)) return 'macos';
  if (/linux/.test(ua)) return 'linux';
  
  return 'unknown';
}

function detectBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  // Order matters - check more specific patterns first
  if (/edg\//.test(ua)) return 'Edge';
  if (/opr\/|opera/.test(ua)) return 'Opera';
  if (/firefox/.test(ua)) return 'Firefox';
  if (/chrome/.test(ua) && !/edg\//.test(ua)) return 'Chrome';
  if (/safari/.test(ua) && !/chrome/.test(ua)) return 'Safari';
  if (/msie|trident/.test(ua)) return 'Internet Explorer';
  if (/samsung/.test(ua)) return 'Samsung Internet';
  
  return 'Unknown';
}

function detectTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - msMaxTouchPoints is a legacy property
    navigator.msMaxTouchPoints > 0
  );
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for iOS standalone mode
  // @ts-ignore - standalone is iOS-specific
  if (window.navigator.standalone === true) return true;
  
  // Check for Android/other PWA mode
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
  
  // Check for TWA (Trusted Web Activity)
  if (document.referrer.includes('android-app://')) return true;
  
  return false;
}

function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isDesktop: true,
      isTablet: false,
      isTouchDevice: false,
      platform: 'unknown',
      browser: 'Unknown',
      screenWidth: 1920,
      screenHeight: 1080,
      userAgent: '',
      isStandalone: false,
      pixelRatio: 1,
      isLandscape: true,
    };
  }

  const userAgent = navigator.userAgent;
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const isTouchDevice = detectTouchDevice();
  const platform = detectPlatform(userAgent);
  
  // CRITICAL FIX: Mobile platform detection ALWAYS takes priority over screen size
  // This ensures iOS/Android devices are NEVER classified as desktop
  const isMobilePlatform = platform === 'ios' || platform === 'android';
  
  // Mobile: mobile platform OR (small screen AND touch device)
  const isMobileBySize = screenWidth < MOBILE_BREAKPOINT;
  const isMobile = isMobilePlatform || (isMobileBySize && isTouchDevice);
  
  // Desktop: ONLY if NOT mobile platform AND large screen AND (desktop platform OR not touch)
  const isDesktopBySize = screenWidth >= DESKTOP_BREAKPOINT;
  const isDesktopPlatform = platform === 'windows' || platform === 'macos' || platform === 'linux';
  const isDesktop = !isMobilePlatform && isDesktopBySize && (isDesktopPlatform || !isTouchDevice);
  
  // Tablet: mobile platform with large screen (iPad in landscape, etc.)
  const isTablet = isMobilePlatform && !isMobileBySize && !isDesktop;

  return {
    isMobile,
    isDesktop,
    isTablet,
    isTouchDevice,
    platform,
    browser: detectBrowser(userAgent),
    screenWidth,
    screenHeight,
    userAgent,
    isStandalone: detectStandalone(),
    pixelRatio: window.devicePixelRatio || 1,
    isLandscape: screenWidth > screenHeight,
  };
}

export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(getDeviceInfo);

  useEffect(() => {
    // Set initial state
    setDeviceInfo(getDeviceInfo());

    // Handle resize events
    const handleResize = () => {
      setDeviceInfo(getDeviceInfo());
    };

    // Handle orientation change (mobile)
    const handleOrientationChange = () => {
      // Small delay to let the browser update dimensions
      setTimeout(() => {
        setDeviceInfo(getDeviceInfo());
      }, 100);
    };

    // Handle display mode change (PWA install/uninstall)
    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => {
      setDeviceInfo(getDeviceInfo());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    displayModeQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      displayModeQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  // Memoize to prevent unnecessary re-renders
  return useMemo(() => deviceInfo, [
    deviceInfo.isMobile,
    deviceInfo.isDesktop,
    deviceInfo.isTablet,
    deviceInfo.isTouchDevice,
    deviceInfo.platform,
    deviceInfo.browser,
    deviceInfo.screenWidth,
    deviceInfo.screenHeight,
    deviceInfo.isStandalone,
    deviceInfo.isLandscape,
  ]);
}

// Export individual detection functions for use outside React
export { detectPlatform, detectBrowser, detectTouchDevice, detectStandalone, getDeviceInfo };
