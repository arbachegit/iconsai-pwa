/**
 * ============================================================
 * PWAHealthPromptArea.tsx - Área de input do PWA Health
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-19
 *
 * Descrição: Área de input para o usuário digitar prompts.
 * Igual ao PWA City mas com cores verdes (saúde).
 * ============================================================
 */

import React, { useState, useRef, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Send, Loader2 } from "lucide-react";

interface PromptAreaProps {
  /** Callback quando enviar mensagem */
  onSendMessage: (message: string) => void;
  /** Se está enviando mensagem */
  isLoading?: boolean;
  /** Placeholder customizado */
  placeholder?: string;
  /** Desabilitar input */
  disabled?: boolean;
}

export const PromptArea: React.FC<PromptAreaProps> = ({
  onSendMessage,
  isLoading = false,
  placeholder = "Pergunte sobre saúde...",
  disabled = false,
}) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Ajustar altura do textarea automaticamente
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  // Handler de mudança no input
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
  };

  // Handler de envio
  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading || disabled) return;

    onSendMessage(trimmedMessage);
    setMessage("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  // Handler de Enter
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = message.trim().length > 0 && !isLoading && !disabled;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-shrink-0 border-t border-emerald-500/20 bg-slate-900/80 backdrop-blur-md px-2 pt-1 pb-[7px]"
    >
      <div className="flex items-center gap-3">
        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            rows={1}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 resize-none focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              maxHeight: "120px",
              minHeight: "48px",
            }}
          />
        </div>

        {/* Botão Enviar */}
        <motion.button
          onClick={handleSend}
          disabled={!canSend}
          whileHover={canSend ? { scale: 1.05 } : {}}
          whileTap={canSend ? { scale: 0.95 } : {}}
          className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
            canSend
              ? "bg-gradient-to-br from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 shadow-lg shadow-emerald-500/25"
              : "bg-slate-800/50 cursor-not-allowed"
          }`}
          aria-label="Enviar mensagem"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Send
              className={`w-5 h-5 ${canSend ? "text-white" : "text-slate-600"}`}
            />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default PromptArea;
