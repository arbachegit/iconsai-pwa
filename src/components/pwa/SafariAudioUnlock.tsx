/**
 * ============================================================
 * components/pwa/SafariAudioUnlock.tsx
 * ============================================================
 * Versão: 2.0.0 - 2026-01-15
 * Componente invisível que desbloqueia áudio no Safari/iOS
 * FIX: Chama retryPendingPlay após desbloquear para autoplay
 * ============================================================
 */

import { useEffect, useCallback, useRef } from 'react';
import { getBrowserInfo } from '@/utils/safari-detect';
import { unlockAudio, isAudioUnlocked } from '@/utils/safari-audio';
import { useAudioManager } from '@/stores/audioManagerStore';

export const SafariAudioUnlock: React.FC = () => {
  const hasRetried = useRef(false);

  const handleUserInteraction = useCallback(async () => {
    const { isSafari, isIOS } = getBrowserInfo();

    // Desbloquear áudio
    if (!isAudioUnlocked() && (isSafari || isIOS)) {
      const success = await unlockAudio();
      console.log("[SafariAudioUnlock] Unlock result:", success);
    }

    // v2.0.0: Sempre tentar retry do pendingPlay na primeira interação
    const pendingPlay = useAudioManager.getState().pendingPlay;
    if (pendingPlay && !hasRetried.current) {
      hasRetried.current = true;
      console.log("[SafariAudioUnlock] 🔄 Retrying pending audio after user interaction...");
      await useAudioManager.getState().retryPendingPlay();
    }

    // Remover listeners após primeira interação com sucesso
    if (isAudioUnlocked()) {
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('touchend', handleUserInteraction);
      document.removeEventListener('click', handleUserInteraction);
    }
  }, []);

  useEffect(() => {
    // Adicionar listeners para user gesture em qualquer dispositivo
    // (não só Safari/iOS, pois Chrome mobile também bloqueia autoplay)
    document.addEventListener('touchstart', handleUserInteraction, { passive: true });
    document.addEventListener('touchend', handleUserInteraction, { passive: true });
    document.addEventListener('click', handleUserInteraction, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('touchend', handleUserInteraction);
      document.removeEventListener('click', handleUserInteraction);
    };
  }, [handleUserInteraction]);

  // Monitorar mudanças no pendingPlay para resetar o hasRetried
  useEffect(() => {
    const unsubscribe = useAudioManager.subscribe(
      (state) => state.pendingPlay,
      (pendingPlay) => {
        if (pendingPlay) {
          // Novo pending, resetar flag para permitir retry
          hasRetried.current = false;
        }
      }
    );

    return unsubscribe;
  }, []);

  // Não renderiza nada
  return null;
};

export default SafariAudioUnlock;
