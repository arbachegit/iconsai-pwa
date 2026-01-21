// usePWAConversations Hook - v1.1.0
// 
// ===== TABELAS DO BANCO DE DADOS =====
// - pwa_conversation_sessions   : Sessões de conversa
// - pwa_conversation_messages   : Mensagens das conversas
// - pwa_conv_summaries          : Resumos das conversas (NÃO usar "pwa_conversation_summaries")
// =====================================
//
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  PWAUser, 
  PWAConversationSession, 
  PWAUsersFilters, 
  PWAUsersSortConfig, 
  AutocompleteItem, 
  PWAModuleType,
  CompanySource,
  KeyTopics
} from '@/types/pwa-conversations';
import { toast } from 'sonner';

export function usePWAConversations() {
  const [users, setUsers] = useState<PWAUser[]>([]);
  const [sessions, setSessions] = useState<PWAConversationSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<PWAUsersFilters>({});
  const [sortConfig, setSortConfig] = useState<PWAUsersSortConfig>({ 
    column: 'last_activity', 
    direction: 'desc' 
  });
  const [taxonomySuggestions, setTaxonomySuggestions] = useState<AutocompleteItem[]>([]);
  const [keyTopicsSuggestions, setKeyTopicsSuggestions] = useState<AutocompleteItem[]>([]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[usePWAConversations] Buscando usuários com filtros:', filters);
      console.log('[usePWAConversations] Ordenação:', sortConfig);
      console.log('[usePWAConversations] Página:', currentPage, 'Tamanho:', pageSize);
      
      const { data, error: rpcError } = await supabase.rpc('get_pwa_users_aggregated', {
        p_search: filters.search || null,
        p_company: filters.company || null,
        p_date_from: filters.dateFrom || null,
        p_date_to: filters.dateTo || null,
        p_sort_column: sortConfig.column,
        p_sort_direction: sortConfig.direction,
        p_page_size: pageSize,
        p_page: currentPage,
      });

      if (rpcError) throw rpcError;

      const mappedUsers: PWAUser[] = (data || []).map((row: {
        device_id: string;
        user_name: string | null;
        user_email: string | null;
        company: string | null;
        company_source: string | null;
        last_activity: string;
        total_sessions: number;
        modules_used: string[];
        total_count: number;
      }) => ({
        device_id: row.device_id,
        user_name: row.user_name,
        user_email: row.user_email,
        company: row.company,
        company_source: (row.company_source as CompanySource) || 'undefined',
        last_activity: row.last_activity,
        total_sessions: Number(row.total_sessions),
        modules_used: row.modules_used as PWAModuleType[],
      }));

      setUsers(mappedUsers);
      setTotalUsers(data?.[0]?.total_count ?? 0);
      
      console.log('[usePWAConversations] Usuários carregados:', mappedUsers.length);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[usePWAConversations] Erro ao buscar usuários:', err);
      setError(message);
      toast.error('Erro ao carregar conversas');
    } finally {
      setIsLoading(false);
    }
  }, [filters, sortConfig, currentPage, pageSize]);

  const fetchSessionsForUser = useCallback(async (deviceId: string, moduleType?: PWAModuleType) => {
    setIsLoadingSessions(true);
    try {
      console.log('[usePWAConversations] Buscando sessões para:', deviceId, 'módulo:', moduleType);
      
      // 1. Buscar sessões
      let sessionsQuery = supabase
        .from('pwa_conversation_sessions')
        .select('*')
        .eq('device_id', deviceId)
        .order('started_at', { ascending: false });
      
      if (moduleType) {
        sessionsQuery = sessionsQuery.eq('module_type', moduleType);
      }
      
      const { data: sessionsData, error: sessionsError } = await sessionsQuery;
      if (sessionsError) throw sessionsError;
      
      // 2. Para cada sessão, buscar mensagens e resumo
      const sessionsWithDetails: PWAConversationSession[] = await Promise.all(
        (sessionsData || []).map(async (session) => {
          // Buscar mensagens
          const { data: messagesData } = await supabase
            .from('pwa_conversation_messages')
            .select('*')
            .eq('session_id', session.id)
            .order('timestamp', { ascending: true });
          
          // Buscar resumo (tabela: pwa_conv_summaries)
          const { data: summaryData } = await supabase
            .from('pwa_conv_summaries')
            .select('*')
            .eq('session_id', session.id)
            .maybeSingle();
          
          // Mapear mensagens com tipos corretos
          const mappedMessages = (messagesData || []).map((msg) => ({
            ...msg,
            role: msg.role as 'user' | 'assistant',
            key_topics: msg.key_topics as unknown as KeyTopics,
          }));
          
          // Mapear resumo com tipos corretos
          const mappedSummary = summaryData ? {
            ...summaryData,
            key_topics: summaryData.key_topics as unknown as KeyTopics,
          } : undefined;
          
          return {
            ...session,
            company_source: (session.company_source as CompanySource) || 'undefined',
            module_type: session.module_type as PWAModuleType,
            messages: mappedMessages,
            summary: mappedSummary,
          } as PWAConversationSession;
        })
      );
      
      setSessions(sessionsWithDetails);
      console.log('[usePWAConversations] Sessões carregadas:', sessionsWithDetails.length);
    } catch (err: unknown) {
      console.error('[usePWAConversations] Erro ao buscar sessões:', err);
      toast.error('Erro ao carregar sessões');
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // CORRIGIDO: Permite query vazia para pre-carregar + status = 'approved'
  const fetchTaxonomySuggestions = useCallback(async (query: string) => {
    try {
      console.log('[usePWAConversations] Buscando taxonomias:', query || '(todas)');
      
      let dbQuery = supabase
        .from('global_taxonomy')
        .select('id, name, code')
        .eq('status', 'approved') // CORRIGIDO: era 'active', mas os dados tem 'approved'
        .limit(20);
      
      // Filtrar por query se fornecida
      if (query.length > 0) {
        dbQuery = dbQuery.ilike('name', `%${query}%`);
      }
      
      const { data, error } = await dbQuery;
      
      if (error) throw error;
      
      const suggestions: AutocompleteItem[] = (data || []).map((item) => ({
        value: item.code || item.name,
        label: item.name,
        category: 'taxonomy' as const,
      }));
      
      setTaxonomySuggestions(suggestions);
      console.log('[usePWAConversations] Taxonomias encontradas:', suggestions.length);
    } catch (err) {
      console.error('[usePWAConversations] Erro ao buscar taxonomias:', err);
      setTaxonomySuggestions([]);
    }
  }, []);

  // CORRIGIDO: Permite query vazia para pre-carregar
  const fetchKeyTopicsSuggestions = useCallback(async (query: string) => {
    try {
      console.log('[usePWAConversations] Buscando temas-chave:', query || '(todos)');
      
      // Buscar mensagens com key_topics
      const { data, error } = await supabase
        .from('pwa_conversation_messages')
        .select('key_topics')
        .not('key_topics', 'is', null)
        .limit(100);
      
      if (error) throw error;
      
      // Extrair e filtrar tópicos únicos
      const topicsSet = new Map<string, AutocompleteItem>();
      const lowerQuery = query.toLowerCase();
      
      (data || []).forEach((row) => {
        const kt = row.key_topics as unknown as KeyTopics | null;
        if (!kt) return;
        
        // People
        kt.people?.forEach((p) => {
          if ((lowerQuery === '' || p.toLowerCase().includes(lowerQuery)) && !topicsSet.has(p)) {
            topicsSet.set(p, { value: p, label: p, category: 'person' });
          }
        });
        
        // Countries
        kt.countries?.forEach((c) => {
          if ((lowerQuery === '' || c.toLowerCase().includes(lowerQuery)) && !topicsSet.has(c)) {
            topicsSet.set(c, { value: c, label: c, category: 'country' });
          }
        });
        
        // Organizations
        kt.organizations?.forEach((o) => {
          if ((lowerQuery === '' || o.toLowerCase().includes(lowerQuery)) && !topicsSet.has(o)) {
            topicsSet.set(o, { value: o, label: o, category: 'organization' });
          }
        });
      });
      
      const suggestions = Array.from(topicsSet.values()).slice(0, 20);
      setKeyTopicsSuggestions(suggestions);
      console.log('[usePWAConversations] Temas-chave encontrados:', suggestions.length);
    } catch (err) {
      console.error('[usePWAConversations] Erro ao buscar temas-chave:', err);
      setKeyTopicsSuggestions([]);
    }
  }, []);

  const refreshData = useCallback(async () => {
    await fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    // Estado
    users,
    sessions,
    taxonomySuggestions,
    keyTopicsSuggestions,
    isLoading,
    isLoadingSessions,
    error,
    totalUsers,
    currentPage,
    pageSize,
    filters,
    sortConfig,
    
    // Setters
    setFilters,
    setSortConfig,
    setCurrentPage,
    setPageSize,
    
    // Actions
    fetchUsers,
    fetchSessionsForUser,
    fetchTaxonomySuggestions,
    fetchKeyTopicsSuggestions,
    refreshData,
  };
}

export default usePWAConversations;
