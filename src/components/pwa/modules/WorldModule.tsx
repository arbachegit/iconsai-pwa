/**
 * ============================================================
 * WorldModule.tsx - Módulo Mundo
 * ============================================================
 * Versão: 3.0.0 - Layout Unificado
 * Data: 2026-01-04
 * 
 * Descrição: Módulo mundo usando o layout padronizado.
 * Apenas áudio, sem texto visível.
 * ============================================================
 */

import React from "react";
import { UnifiedModuleLayout } from "./UnifiedModuleLayout";

interface WorldModuleProps {
  onBack: () => void;
  onHistoryClick: () => void;
}

export const WorldModule: React.FC<WorldModuleProps> = ({ onBack, onHistoryClick }) => {
  return (
    <UnifiedModuleLayout
      moduleType="world"
      onBack={onBack}
      onHistoryClick={onHistoryClick}
    />
  );
};

export default WorldModule;
