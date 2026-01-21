/**
 * ============================================================
 * IdeasModule.tsx - Módulo Ideias
 * ============================================================
 * Versão: 3.0.0 - Layout Unificado
 * Data: 2026-01-04
 * 
 * Descrição: Módulo ideias usando o layout padronizado.
 * Apenas áudio, sem texto visível.
 * ============================================================
 */

import React from "react";
import { UnifiedModuleLayout } from "./UnifiedModuleLayout";

interface IdeasModuleProps {
  onBack: () => void;
  onHistoryClick: () => void;
}

export const IdeasModule: React.FC<IdeasModuleProps> = ({ onBack, onHistoryClick }) => {
  return (
    <UnifiedModuleLayout
      moduleType="ideas"
      onBack={onBack}
      onHistoryClick={onHistoryClick}
    />
  );
};

export default IdeasModule;
