/**
 * ============================================================
 * components/pwa/history/DateSeparator.tsx
 * ============================================================
 * Versao: 1.0.0 - 2026-01-08
 * PRD: Histo_rico_objeto.zip
 * Separador visual entre grupos de mensagens por data
 * ============================================================
 */

import React from "react";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";

interface DateSeparatorProps {
  date: string;
}

export const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  return (
    <motion.div
      className="flex items-center justify-center my-6 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

      <div className="flex items-center gap-2 px-4 py-2 mx-4 bg-gray-100 rounded-full">
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="text-xs font-medium text-gray-600">{date}</span>
      </div>

      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
    </motion.div>
  );
};

export default DateSeparator;
