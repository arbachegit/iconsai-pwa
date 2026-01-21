/**
 * ============================================================
 * HelpModule.tsx - Módulo de Ajuda
 * ============================================================
 * Versão: 3.0.0 - Layout Unificado
 * Data: 2026-01-04
 * 
 * Descrição: Módulo de ajuda usando o layout padronizado.
 * Apenas áudio, sem texto visível.
 * ============================================================
 */

import React from "react";
import { UnifiedModuleLayout } from "./UnifiedModuleLayout";

interface HelpModuleProps {
  onBack: () => void;
  onHistoryClick: () => void;
}

export const HelpModule: React.FC<HelpModuleProps> = ({ onBack, onHistoryClick }) => {
  return (
    <UnifiedModuleLayout
      moduleType="help"
      onBack={onBack}
      onHistoryClick={onHistoryClick}
    />
  );
};

export default HelpModule;
