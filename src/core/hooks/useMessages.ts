/**
 * ============================================================
 * Core useMessages - CRUD de mensagens (sem lógica de API)
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * REGRAS:
 * - NUNCA chama APIs externas
 * - Apenas gerencia estado local de mensagens
 * - Zero lógica de negócio
 * ============================================================
 */

import { useState, useCallback, useMemo } from "react";
import type { Message, MessageRole, MessageMetadata } from "../types";

const generateUUID = () => crypto.randomUUID();

interface UseMessagesOptions {
  /** Máximo de mensagens a manter em memória */
  maxMessages?: number;
  /** Mensagens iniciais */
  initialMessages?: Message[];
}

interface UseMessagesReturn {
  /** Lista de mensagens */
  messages: Message[];
  /** Adicionar mensagem do usuário */
  addUserMessage: (content: string, metadata?: MessageMetadata) => Message;
  /** Adicionar mensagem do assistente */
  addAssistantMessage: (content: string, metadata?: MessageMetadata) => Message;
  /** Adicionar mensagem de erro */
  addErrorMessage: (content: string) => Message;
  /** Adicionar mensagem de sistema */
  addSystemMessage: (content: string) => Message;
  /** Adicionar mensagem genérica */
  addMessage: (role: MessageRole, content: string, metadata?: MessageMetadata) => Message;
  /** Atualizar mensagem existente */
  updateMessage: (id: string, updates: Partial<Message>) => void;
  /** Remover mensagem por ID */
  removeMessage: (id: string) => void;
  /** Limpar todas as mensagens */
  clearMessages: () => void;
  /** Última mensagem */
  lastMessage: Message | undefined;
  /** Última mensagem do assistente */
  lastAssistantMessage: Message | undefined;
  /** Última mensagem do usuário */
  lastUserMessage: Message | undefined;
  /** Total de mensagens */
  messageCount: number;
}

export const useMessages = (options: UseMessagesOptions = {}): UseMessagesReturn => {
  const { maxMessages = 100, initialMessages = [] } = options;
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const addMessage = useCallback(
    (role: MessageRole, content: string, metadata?: MessageMetadata): Message => {
      const newMessage: Message = {
        id: generateUUID(),
        content,
        role,
        timestamp: new Date(),
        metadata,
      };

      setMessages((prev) => {
        const updated = [...prev, newMessage];
        // Limitar número de mensagens
        if (updated.length > maxMessages) {
          return updated.slice(-maxMessages);
        }
        return updated;
      });

      return newMessage;
    },
    [maxMessages]
  );

  const addUserMessage = useCallback(
    (content: string, metadata?: MessageMetadata): Message => {
      return addMessage("user", content, metadata);
    },
    [addMessage]
  );

  const addAssistantMessage = useCallback(
    (content: string, metadata?: MessageMetadata): Message => {
      return addMessage("assistant", content, metadata);
    },
    [addMessage]
  );

  const addErrorMessage = useCallback(
    (content: string): Message => {
      return addMessage("error", content);
    },
    [addMessage]
  );

  const addSystemMessage = useCallback(
    (content: string): Message => {
      return addMessage("system", content);
    },
    [addMessage]
  );

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
    );
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const lastMessage = useMemo(() => {
    return messages[messages.length - 1];
  }, [messages]);

  const lastAssistantMessage = useMemo(() => {
    return [...messages].reverse().find((msg) => msg.role === "assistant");
  }, [messages]);

  const lastUserMessage = useMemo(() => {
    return [...messages].reverse().find((msg) => msg.role === "user");
  }, [messages]);

  const messageCount = messages.length;

  return {
    messages,
    addUserMessage,
    addAssistantMessage,
    addErrorMessage,
    addSystemMessage,
    addMessage,
    updateMessage,
    removeMessage,
    clearMessages,
    lastMessage,
    lastAssistantMessage,
    lastUserMessage,
    messageCount,
  };
};

export default useMessages;
