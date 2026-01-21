import React from "react";
import { motion } from "framer-motion";
import { PenLine, MessageSquare, Loader2 } from "lucide-react";
import { StatusIndicator } from "./StatusIndicator";

interface HeaderActionsProps {
  onSummarize: () => void;
  onOpenChat: () => void;
  hasConversations: boolean;
  isSummarizing: boolean;
}

export const HeaderActions: React.FC<HeaderActionsProps> = ({
  onSummarize,
  onOpenChat,
  hasConversations,
  isSummarizing,
}) => {
  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="flex items-center gap-2">
        {/* Botão Resumir (caneta com bolinha circulando) */}
        <motion.button
          onClick={onSummarize}
          disabled={isSummarizing || !hasConversations}
          className="relative p-2 rounded-lg bg-background/20 backdrop-blur-sm border border-border/20 disabled:opacity-50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Bolinha circulando a caneta */}
          {hasConversations && !isSummarizing && (
            <motion.div
              className="absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <div 
                className="absolute w-2 h-2 rounded-full bg-primary"
                style={{ top: "-4px", left: "50%", transform: "translateX(-50%)" }}
              />
            </motion.div>
          )}

          {isSummarizing ? (
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          ) : (
            <PenLine className="w-5 h-5 text-muted-foreground" />
          )}
        </motion.button>

        {/* Botão Chat/Conversas (dois balões sobrepostos) */}
        <motion.button
          onClick={onOpenChat}
          className="relative p-2 rounded-lg bg-background/20 backdrop-blur-sm border border-border/20"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Indicador vermelho pulsante */}
          {hasConversations && (
            <motion.div 
              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
            </motion.div>
          )}

          {/* Dois balões sobrepostos */}
          <div className="relative w-5 h-5">
            <MessageSquare className="w-4 h-4 text-muted-foreground absolute top-0 left-0" />
            <MessageSquare className="w-4 h-4 text-muted-foreground/60 absolute bottom-0 right-0" />
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default HeaderActions;
