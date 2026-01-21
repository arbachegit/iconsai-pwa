import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface TranscriptAreaProps {
  messages: Message[];
  interimTranscript?: string;
  isListening?: boolean;
  maxHeight?: string;
}

export const TranscriptArea: React.FC<TranscriptAreaProps> = ({
  messages,
  interimTranscript = "",
  isListening = false,
  maxHeight = "40vh",
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages[messages.length - 1];

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, interimTranscript]);

  // Don't render if no messages and not listening
  if (messages.length === 0 && !interimTranscript) {
    return null;
  }

  return (
    <div className="w-full px-4">
      <div
        ref={scrollRef}
        className="rounded-xl bg-background/30 backdrop-blur-md border border-border/20 p-4 overflow-y-auto pwa-scrollable-area"
        style={{ maxHeight }}
      >
        <AnimatePresence mode="popLayout">
          {/* Show only the last assistant message */}
          {lastMessage && lastMessage.role === "assistant" && (
            <motion.p
              key="assistant-msg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-foreground leading-relaxed"
            >
              {lastMessage.content}
            </motion.p>
          )}

          {/* Show last user message if it's the most recent */}
          {lastMessage && lastMessage.role === "user" && (
            <motion.p
              key="user-msg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-primary/80 italic"
            >
              "{lastMessage.content}"
            </motion.p>
          )}
        </AnimatePresence>

        {/* Real-time transcription */}
        <AnimatePresence>
          {isListening && interimTranscript && (
            <motion.div
              className="flex items-center gap-2 mt-3 pt-3 border-t border-border/20"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-primary"
              >
                <Mic className="w-4 h-4" />
              </motion.div>
              <p className="text-sm text-muted-foreground italic flex-1">
                {interimTranscript}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TranscriptArea;
