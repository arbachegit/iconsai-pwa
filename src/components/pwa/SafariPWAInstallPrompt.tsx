/**
 * ============================================================
 * components/pwa/SafariPWAInstallPrompt.tsx
 * ============================================================
 * Versão: 1.0.0 - 2026-01-10
 * Prompt de instalação PWA para Safari (não suporta beforeinstallprompt)
 * ============================================================
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, Plus, X } from 'lucide-react';
import { getBrowserInfo } from '@/utils/safari-detect';
import { safeGetItem, safeSetItem } from '@/utils/safari-storage';

const DISMISSED_KEY = 'pwa-install-dismissed';

export const SafariPWAInstallPrompt: React.FC = () => {
  const [show, setShow] = useState(false);
  const browserInfo = getBrowserInfo();

  useEffect(() => {
    // Não mostrar se já instalado ou se não for Safari/iOS
    if (browserInfo.isStandalone) return;
    if (!browserInfo.isSafari && !browserInfo.isIOS) return;
    
    // Verificar se já foi descartado
    const dismissed = safeGetItem(DISMISSED_KEY);
    if (dismissed) {
      // Verificar se já passou 7 dias
      const dismissedTime = parseInt(dismissed, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < sevenDays) return;
    }
    
    // Mostrar após 3 segundos
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, [browserInfo.isSafari, browserInfo.isIOS, browserInfo.isStandalone]);

  const handleDismiss = () => {
    setShow(false);
    safeSetItem(DISMISSED_KEY, Date.now().toString());
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 left-4 right-4 z-50 safe-area-bottom"
      >
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xl">
          {/* Botão fechar */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4">
            {/* Ícone */}
            <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <span className="text-2xl">📱</span>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0 pr-6">
              <h3 className="font-semibold text-foreground mb-1">
                Instalar KnowYOU
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Adicione à sua tela inicial para uma experiência melhor
              </p>
              
              {/* Instruções */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  Toque em{' '}
                  <Share className="w-4 h-4 text-primary" />
                </span>
                <span>→</span>
                <span className="flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  Adicionar à Tela de Início
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SafariPWAInstallPrompt;
