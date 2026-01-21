/**
 * ============================================================
 * ConversationDrawer.tsx - Drawer de Conversas PWA
 * ============================================================
 * Versão: 2.0.0 - 2026-01-09
 * PADRONIZAÇÃO: Footer com 3 botões (Play TTS, Copiar, Compartilhar)
 * ============================================================
 * CHANGELOG v2.0.0:
 * - Removido botão Download (não há áudio salvo)
 * - Adicionado botão Play TTS com useTextToSpeech
 * - Adicionado botão Copiar texto
 * - Footer padronizado igual ao AudioMessageCard
 * - Estados visuais consistentes (loading/playing/idle)
 * ============================================================
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageSquare, Volume2, VolumeX, Copy, Check, Share2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

interface Conversation {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  transcript?: string;
  audioUrl?: string;
  summary?: string;
  moduleType?: string;
}

interface ConversationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  embedded?: boolean;
}

export const ConversationDrawer: React.FC<ConversationDrawerProps> = ({
  isOpen,
  onClose,
  conversations,
  embedded = false,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Hook TTS para ler texto em voz alta
  const { speak, stop, isPlaying: isTTSPlaying, isLoading: isTTSLoading } = useTextToSpeech();

  // Obter texto da conversa
  const getConversationText = (conv: Conversation): string => {
    return conv.transcript || conv.summary || "";
  };

  // Ação: Play TTS
  const handlePlayTTS = async (conv: Conversation) => {
    const text = getConversationText(conv);
    if (!text) return;

    if (isTTSPlaying && playingId === conv.id) {
      stop();
      setPlayingId(null);
    } else {
      // Parar qualquer TTS anterior
      if (isTTSPlaying) {
        stop();
      }
      setPlayingId(conv.id);
      const moduleType = conv.moduleType || "world";
      await speak(text, moduleType);
      setPlayingId(null);
    }
  };

  // Ação: Copiar texto
  const handleCopy = async (conv: Conversation) => {
    const text = getConversationText(conv);
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(conv.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Erro ao copiar:", error);
    }
  };

  // Ação: Compartilhar
  const handleShare = async (conv: Conversation) => {
    const text = getConversationText(conv);
    if (!text) return;

    const dateStr = conv.createdAt.toLocaleDateString("pt-BR");
    const fullText = `KnowYOU - ${dateStr}:\n\n${text}`;

    if (navigator.share) {
      try {
        await navigator.share({ text: fullText });
      } catch (e) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copiar para clipboard
      try {
        await navigator.clipboard.writeText(fullText);
        setCopiedId(conv.id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (error) {
        console.error("Erro ao compartilhar:", error);
      }
    }
  };

  // Toggle expandir/colapsar
  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Formatar duração
  const formatDuration = (start: Date, end: Date) => {
    const seconds = Math.round((end.getTime() - start.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  // Verificar se esta tocando esta conversa
  const isPlayingThis = (convId: string) => isTTSPlaying && playingId === convId;
  const isLoadingThis = (convId: string) => isTTSLoading && playingId === convId;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={`${embedded ? "absolute" : "fixed"} inset-0 bg-black/60 backdrop-blur-sm z-50`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer - slides from top */}
          <motion.div
            className={`${embedded ? "absolute" : "fixed"} inset-x-0 top-0 z-50 bg-background rounded-b-2xl shadow-2xl max-h-[80vh] flex flex-col`}
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Histórico</h2>
                  <p className="text-xs text-muted-foreground">
                    {conversations.length} conversa{conversations.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Conversations list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Nenhuma conversa ainda</p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const text = getConversationText(conv);
                  const hasText = text.length > 0;
                  const isExpanded = expandedId === conv.id;

                  return (
                    <motion.div
                      key={conv.id}
                      layout
                      className="bg-card/50 rounded-xl border border-border/30 overflow-hidden"
                    >
                      {/* Conversation content */}
                      <div className="p-3 cursor-pointer" onClick={() => handleToggleExpand(conv.id)}>
                        {/* Preview text */}
                        <p className={`text-sm text-foreground ${isExpanded ? "" : "line-clamp-2"}`}>
                          {text || "Conversa sem conteúdo"}
                        </p>

                        {/* Meta info */}
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">
                            {conv.createdAt.toLocaleDateString("pt-BR")} •{" "}
                            {conv.createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            {` • ${formatDuration(conv.createdAt, conv.updatedAt)}`}
                          </p>

                          {/* Expand indicator */}
                          {hasText && text.length > 100 && (
                            <button className="p-1 text-muted-foreground">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Footer padronizado: 3 botões */}
                      {hasText && (
                        <div className="flex items-center justify-end gap-1 px-3 pb-3 pt-1 border-t border-border/20">
                          {/* Botão Play TTS */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayTTS(conv);
                            }}
                            disabled={isLoadingThis(conv.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              isPlayingThis(conv.id)
                                ? "bg-primary/20 text-primary"
                                : "hover:bg-white/10 text-muted-foreground"
                            }`}
                            title={isPlayingThis(conv.id) ? "Parar" : "Ouvir"}
                          >
                            {isLoadingThis(conv.id) ? (
                              <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            ) : isPlayingThis(conv.id) ? (
                              <VolumeX className="w-4 h-4 text-primary" />
                            ) : (
                              <Volume2 className="w-4 h-4" />
                            )}
                          </button>

                          {/* Botão Copiar */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(conv);
                            }}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground"
                            title="Copiar"
                          >
                            {copiedId === conv.id ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          {/* Botão Compartilhar */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShare(conv);
                            }}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground"
                            title="Compartilhar"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Handle visual indicator */}
            <div className="flex justify-center pb-4 pt-2">
              <div className="w-12 h-1 rounded-full bg-muted-foreground/30" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConversationDrawer;
