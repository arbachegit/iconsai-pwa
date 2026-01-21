/**
 * ============================================================
 * HealthModule.tsx - Módulo Saúde
 * ============================================================
 * Versão: 3.0.0 - Layout Unificado
 * Data: 2026-01-04
 * 
 * Descrição: Módulo saúde usando o layout padronizado.
 * Apenas áudio, sem texto visível.
 * ============================================================
 */

import React from "react";
import { UnifiedModuleLayout } from "./UnifiedModuleLayout";

interface HealthModuleProps {
  onBack: () => void;
  onHistoryClick: () => void;
}

export const HealthModule: React.FC<HealthModuleProps> = ({ onBack, onHistoryClick }) => {
  return (
    <UnifiedModuleLayout
      moduleType="health"
      onBack={onBack}
      onHistoryClick={onHistoryClick}
    />
  );
};

export default HealthModule;
