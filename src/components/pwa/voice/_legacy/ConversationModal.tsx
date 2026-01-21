import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Search, Play, FileText, Calendar, 
  Globe, Heart, Lightbulb, HelpCircle,
  Pause, MessageSquare
} from "lucide-react";
import { Conversation, ModuleId } from "@/stores/pwaVoiceStore";

interface ConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  onPlayAudio: (id: string) => void;
  onTranscribe: (id: string) => void;
  playingId?: string | null;
  embedded?: boolean;
}

const moduleConfig: Record<Exclude<ModuleId, null>, { icon: typeof Globe; color: string; label: string }> = {
  help: { icon: HelpCircle, color: "#3B82F6", label: "Ajuda" },
  world: { icon: Globe, color: "#10B981", label: "Mundo" },
  health: { icon: Heart, color: "#F43F5E", label: "Saúde" },
  ideas: { icon: Lightbulb, color: "#F59E0B", label: "Ideias" },
};

export const ConversationModal: React.FC<ConversationModalProps> = ({
  isOpen,
  onClose,
  conversations,
  onPlayAudio,
  onTranscribe,
  playingId,
  embedded = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllTranscripts, setShowAllTranscripts] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filtrar conversas
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase();
    return conversations.filter((conv) => {
      // Buscar no summary
      if (conv.summary?.toLowerCase().includes(query)) return true;
      // Buscar nas mensagens
      return conv.messages.some((msg) => 
        msg.content.toLowerCase().includes(query)
      );
    });
  }, [conversations, searchQuery]);

  // Agrupar por data
  const groupedConversations = useMemo(() => {
    const groups: Record<string, Conversation[]> = {};
    
    filteredConversations.forEach((conv) => {
      const date = new Date(conv.createdAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(conv);
    });
    
    return groups;
  }, [filteredConversations]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={`${embedded ? 'absolute' : 'fixed'} inset-0 z-50`}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 top-12 bg-background rounded-t-3xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Conversas</h2>
              <motion.button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            </div>

            {/* Busca */}
            <div className="px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar conversas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-muted/30 text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>

            {/* Lista de conversas */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {Object.keys(groupedConversations).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Nenhuma conversa encontrada</p>
                </div>
              ) : (
                Object.entries(groupedConversations).map(([date, convs]) => (
                  <div key={date} className="mb-6">
                    {/* Data */}
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium">{date}</span>
                    </div>

                    {/* Conversas do dia */}
                    <div className="space-y-2">
                      {convs.map((conv) => {
                        if (!conv.module) return null;
                        
                        const config = moduleConfig[conv.module];
                        const Icon = config.icon;
                        const isExpanded = expandedId === conv.id;
                        const isPlaying = playingId === conv.id;

                        return (
                          <motion.div
                            key={conv.id}
                            layout
                            className="rounded-xl overflow-hidden"
                            style={{
                              background: `linear-gradient(135deg, ${config.color}10, ${config.color}05)`,
                              border: `1px solid ${config.color}30`,
                            }}
                          >
                            {/* Header da conversa */}
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : conv.id)}
                              className="w-full p-3 text-left"
                            >
                              <div className="flex items-start gap-3">
                                {/* Ícone do módulo */}
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ background: `${config.color}20` }}
                                >
                                  <Icon className="w-5 h-5" style={{ color: config.color }} />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span
                                      className="text-sm font-medium"
                                      style={{ color: config.color }}
                                    >
                                      {config.label}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatTime(conv.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {conv.summary || conv.messages[0]?.content || "Sem resumo"}
                                  </p>
                                </div>
                              </div>
                            </button>

                            {/* Conteúdo expandido */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  {/* Transcrição */}
                                  {(showAllTranscripts || isExpanded) && conv.messages.length > 0 && (
                                    <div className="px-3 pb-2 space-y-2 max-h-40 overflow-y-auto">
                                      {conv.messages.map((msg, i) => (
                                        <p
                                          key={i}
                                          className="text-xs text-muted-foreground leading-relaxed"
                                        >
                                          <span className="font-medium text-foreground">
                                            {msg.role === "user" ? "Você: " : "IA: "}
                                          </span>
                                          {msg.content}
                                        </p>
                                      ))}
                                    </div>
                                  )}

                                  {/* Ações */}
                                  <div className="flex items-center gap-2 px-3 pb-3">
                                    <motion.button
                                      onClick={() => onPlayAudio(conv.id)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                                      style={{
                                        background: isPlaying ? `${config.color}40` : `${config.color}20`,
                                        color: config.color,
                                      }}
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                    >
                                      {isPlaying ? (
                                        <>
                                          <Pause className="w-3.5 h-3.5" />
                                          Pausar
                                        </>
                                      ) : (
                                        <>
                                          <Play className="w-3.5 h-3.5" />
                                          Ouvir
                                        </>
                                      )}
                                    </motion.button>

                                    <motion.button
                                      onClick={() => onTranscribe(conv.id)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:bg-muted/50"
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      Transcrever
                                    </motion.button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer com toggle */}
            <div className="px-4 py-3 border-t border-border">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-muted-foreground">Mostrar todas as transcrições</span>
                <button
                  onClick={() => setShowAllTranscripts(!showAllTranscripts)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    showAllTranscripts ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <motion.div
                    className="absolute top-1 left-1 w-4 h-4 bg-background rounded-full shadow-sm"
                    animate={{ x: showAllTranscripts ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </label>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConversationModal;
