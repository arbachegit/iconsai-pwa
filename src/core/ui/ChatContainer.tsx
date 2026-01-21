/**
 * ============================================================
 * Core ChatContainer - Container de chat com slots
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * REGRAS:
 * - NUNCA depende de módulos específicos
 * - Apenas recebe props (slots) e renderiza
 * - Zero lógica de negócio
 * ============================================================
 */

import React from "react";
import type { ChatContainerProps, ThemeConfig } from "../types";

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: "#3B82F6",
  bgColor: "bg-slate-950",
  borderColor: "border-slate-700/50",
  textColor: "text-white",
};

export const ChatContainer: React.FC<ChatContainerProps> = ({
  header,
  body,
  footer,
  className = "",
  theme = DEFAULT_THEME,
}) => {
  return (
    <div className={`flex flex-col h-full ${theme.bgColor} ${className}`}>
      {/* Header slot */}
      {header}

      {/* Body slot - flex-1 com scroll */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {body}
      </div>

      {/* Footer slot - fixo no fundo */}
      {footer}
    </div>
  );
};

export default ChatContainer;
