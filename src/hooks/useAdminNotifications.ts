import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export const useAdminNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications'
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          toast({
            title: newNotification.title,
            description: newNotification.message || undefined,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'admin_notifications'
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          setNotifications(prev =>
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          );
          updateUnreadCount();
        }
      )
      .subscribe();

    // Listen for new documents
    const docChannel = supabase
      .channel('document-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'documents'
        },
        async (payload) => {
          await createNotification({
            type: 'new_document',
            title: 'Novo Documento',
            message: `Documento "${payload.new.filename}" foi adicionado`,
            reference_id: payload.new.id
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents',
          filter: 'status=eq.failed'
        },
        async (payload) => {
          await createNotification({
            type: 'doc_failed',
            title: 'Falha no Processamento',
            message: `Documento "${payload.new.filename}" falhou ao processar`,
            reference_id: payload.new.id
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents',
          filter: 'status=eq.completed'
        },
        async (payload) => {
          await createNotification({
            type: 'doc_completed',
            title: 'Processamento Concluído',
            message: `Documento "${payload.new.filename}" foi processado com sucesso`,
            reference_id: payload.new.id
          });
        }
      )
      .subscribe();

    // Listen for new conversations
    const convChannel = supabase
      .channel('conversation-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_history'
        },
        async (payload) => {
          await createNotification({
            type: 'new_conversation',
            title: 'Nova Conversa',
            message: `Conversa "${payload.new.title}" foi iniciada`,
            reference_id: payload.new.id
          });
        }
      )
      .subscribe();

    // Listen for ML chat routing rules
    const mlRulesChannel = supabase
      .channel('ml-routing-rules')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_routing_rules'
        },
        async (payload) => {
          await createNotification({
            type: 'ml_rule_created',
            title: '🤖 Nova Regra ML',
            message: `Regra de roteamento criada: "${payload.new.document_filename_pattern}" → ${payload.new.corrected_chat}`,
            reference_id: payload.new.id
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_routing_rules'
        },
        async (payload) => {
          const rule = payload.new as any;
          // Notify when rule reaches high confidence (>= 0.8)
          if (rule.confidence >= 0.8 && (payload.old as any)?.confidence < 0.8) {
            await createNotification({
              type: 'ml_rule_high_confidence',
              title: '🎯 Regra ML Alta Confiança',
              message: `Regra "${rule.document_filename_pattern}" atingiu ${Math.round(rule.confidence * 100)}% de confiança (${rule.correction_count} correções)`,
              reference_id: rule.id
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      docChannel.unsubscribe();
      convChannel.unsubscribe();
      mlRulesChannel.unsubscribe();
    };
  }, []);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    setNotifications(data || []);
    updateUnreadCount(data || []);
  };

  const updateUnreadCount = (notifs = notifications) => {
    const count = notifs.filter(n => !n.is_read).length;
    setUnreadCount(count);
  };

  const createNotification = async (notification: {
    type: string;
    title: string;
    message: string;
    reference_id?: string;
  }) => {
    const { error } = await supabase
      .from('admin_notifications')
      .insert([notification]);

    if (error) {
      console.error('Error creating notification:', error);
    }
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      console.error('Error marking notification as read:', error);
      return;
    }

    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return;
    }

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const clearAll = async () => {
    const { error } = await supabase
      .from('admin_notifications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
      console.error('Error clearing notifications:', error);
      return;
    }

    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
};
