import { useEffect, useState, useCallback } from 'react';

interface LandscapeModeState {
  isLandscape: boolean;
  isMobile: boolean;
  lockSupported: boolean;
  showRotateMessage: boolean;
}

interface UseLandscapeModeReturn extends LandscapeModeState {
  requestLandscape: () => void;
}

export function useLandscapeMode(enabled?: boolean): UseLandscapeModeReturn {
  const [state, setState] = useState<LandscapeModeState>({
    isLandscape: typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false,
    isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 || 'ontouchstart' in window : false,
    lockSupported: true,
    showRotateMessage: false,
  });

  const checkOrientation = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const landscape = width > height;
    const mobile = width < 768 || 'ontouchstart' in window;

    setState(prev => ({
      ...prev,
      isLandscape: landscape,
      isMobile: mobile,
      showRotateMessage: mobile && !landscape && !prev.lockSupported,
    }));
  }, []);

  const requestLandscape = useCallback(() => {
    if (screen.orientation && 'lock' in screen.orientation) {
      (screen.orientation as any).lock('landscape').then(() => {
        setState(prev => ({
          ...prev,
          isLandscape: true,
          lockSupported: true,
          showRotateMessage: false,
        }));
      }).catch(() => {
        setState(prev => ({
          ...prev,
          lockSupported: false,
          showRotateMessage: prev.isMobile && !prev.isLandscape,
        }));
      });
    } else {
      setState(prev => ({
        ...prev,
        lockSupported: false,
        showRotateMessage: prev.isMobile && !prev.isLandscape,
      }));
    }
  }, []);

  useEffect(() => {
    checkOrientation();
    if (enabled) requestLandscape();

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    const mediaQuery = window.matchMedia('(orientation: landscape)');
    const handleChange = (e: MediaQueryListEvent) => {
      setState(prev => ({
        ...prev,
        isLandscape: e.matches,
        showRotateMessage: prev.isMobile && !e.matches && !prev.lockSupported,
      }));
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      mediaQuery.removeEventListener('change', handleChange);
      
      if (enabled && screen.orientation && 'unlock' in screen.orientation) {
        try {
          (screen.orientation as any).unlock();
        } catch {
          // Ignore
        }
      }
    };
  }, [enabled, checkOrientation, requestLandscape]);

  return {
    ...state,
    requestLandscape,
  };
}

export default useLandscapeMode;
