/**
 * ============================================================
 * Core InputArea - Área de input genérica reutilizável
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * REGRAS:
 * - NUNCA depende de módulos específicos
 * - Apenas recebe props e emite callbacks
 * - Zero lógica de negócio
 * ============================================================
 */

import React, { useState, useRef, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Send, Loader2 } from "lucide-react";
import type { InputAreaProps, ThemeConfig } from "../types";

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: "#3B82F6",
  bgColor: "bg-slate-900/80",
  borderColor: "border-slate-700/50",
  textColor: "text-white",
};

export const InputArea: React.FC<InputAreaProps> = ({
  onSubmit,
  isLoading = false,
  disabled = false,
  placeholder = "Digite sua mensagem...",
  theme = DEFAULT_THEME,
  maxLength,
  className = "",
}) => {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = maxLength
      ? e.target.value.slice(0, maxLength)
      : e.target.value;
    setValue(newValue);
    adjustTextareaHeight();
  };

  const handleSubmit = () => {
    const trimmedValue = value.trim();
    if (!trimmedValue || isLoading || disabled) return;

    onSubmit(trimmedValue);
    setValue("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSubmit = value.trim().length > 0 && !isLoading && !disabled;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex-shrink-0 border-t ${theme.bgColor} backdrop-blur-md px-2 pt-1 pb-[7px] ${className}`}
      style={{ borderColor: `${theme.primaryColor}20` }}
    >
      <div className="flex items-center gap-3">
        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            rows={1}
            className={`w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl ${theme.textColor} placeholder-slate-500 resize-none focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            style={{
              maxHeight: "120px",
              minHeight: "48px",
            }}
          />
        </div>

        {/* Botão Enviar */}
        <motion.button
          onClick={handleSubmit}
          disabled={!canSubmit}
          whileHover={canSubmit ? { scale: 1.05 } : {}}
          whileTap={canSubmit ? { scale: 0.95 } : {}}
          className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
            canSubmit
              ? "shadow-lg"
              : "bg-slate-800/50 cursor-not-allowed"
          }`}
          style={
            canSubmit
              ? {
                  background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.primaryColor}CC)`,
                  boxShadow: `0 4px 14px ${theme.primaryColor}40`,
                }
              : {}
          }
          aria-label="Enviar mensagem"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Send
              className={`w-5 h-5 ${canSubmit ? "text-white" : "text-slate-600"}`}
            />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default InputArea;
