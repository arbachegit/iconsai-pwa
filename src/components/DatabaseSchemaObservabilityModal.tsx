import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Database,
  Search,
  RefreshCw,
  ArrowLeft,
  Eye,
  Key,
  Link2,
  Loader2,
  X,
  TableIcon,
  TrendingUp,
  Brain,
  ScrollText,
  Image,
  MessageCircle,
  Bell,
  Users,
  Settings,
  Mail,
  FileText,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== DOMAIN CATEGORIES ====================
const DOMAIN_CATEGORIES: Record<string, {
  name: string;
  icon: React.ElementType;
  color: string;
  badgeColor: string;
  tables: string[];
}> = {
  all: {
    name: 'Todas',
    icon: Layers,
    color: 'bg-muted/30 border-border',
    badgeColor: 'bg-muted text-muted-foreground',
    tables: [],
  },
  economic: {
    name: 'Indicadores Econômicos',
    icon: TrendingUp,
    color: 'bg-green-500/10 border-green-500/30',
    badgeColor: 'bg-green-500/20 text-green-600 dark:text-green-400',
    tables: ['economic_indicators', 'indicator_values', 'system_api_registry', 'market_news'],
  },
  rag: {
    name: 'RAG',
    icon: Search,
    color: 'bg-blue-500/10 border-blue-500/30',
    badgeColor: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    tables: ['documents', 'document_chunks', 'document_tags', 'document_versions', 
             'document_routing_log', 'chat_config', 'chat_routing_rules', 'rag_analytics'],
  },
  ml_ai: {
    name: 'Machine Learning / AI',
    icon: Brain,
    color: 'bg-purple-500/10 border-purple-500/30',
    badgeColor: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
    tables: ['maieutic_training_categories', 'deterministic_analysis',
             'tag_merge_rules', 'regional_tone_rules', 'suggestion_audit', 'suggestion_clicks'],
  },
  audit: {
    name: 'Auditoria e Logs',
    icon: ScrollText,
    color: 'bg-amber-500/10 border-amber-500/30',
    badgeColor: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    tables: ['user_activity_logs', 'debug_logs', 'notification_logs', 'tag_modification_logs',
             'tag_management_events', 'credits_usage', 'integrity_check_log', 'security_scan_results',
             'security_severity_history', 'documentation_sync_log', 'typing_latency_logs'],
  },
  media: {
    name: 'Mídia e Conteúdo',
    icon: Image,
    color: 'bg-pink-500/10 border-pink-500/30',
    badgeColor: 'bg-pink-500/20 text-pink-600 dark:text-pink-400',
    tables: ['generated_images', 'image_analytics', 'audio_contents', 'podcast_contents',
             'section_audio', 'section_contents', 'section_content_versions', 'tooltip_contents'],
  },
  chat: {
    name: 'Chat e Conversa',
    icon: MessageCircle,
    color: 'bg-cyan-500/10 border-cyan-500/30',
    badgeColor: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
    tables: ['conversation_history', 'chat_analytics', 'user_chat_preferences'],
  },
  notifications: {
    name: 'Notificações',
    icon: Bell,
    color: 'bg-orange-500/10 border-orange-500/30',
    badgeColor: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
    tables: ['admin_notifications', 'notification_preferences', 'notification_templates', 
             'notification_logic_config'],
  },
  users: {
    name: 'Usuários e Autenticação',
    icon: Users,
    color: 'bg-indigo-500/10 border-indigo-500/30',
    badgeColor: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
    tables: ['profiles', 'user_roles', 'user_registrations', 'password_recovery_codes', 'user_contacts'],
  },
  system: {
    name: 'Configuração e Sistema',
    icon: Settings,
    color: 'bg-slate-500/10 border-slate-500/30',
    badgeColor: 'bg-slate-500/20 text-slate-600 dark:text-slate-400',
    tables: ['admin_settings', 'feature_flags', 'auto_preload_config', 'security_alert_config',
             'system_versions', 'system_increments', 'documentation_versions'],
  },
  communication: {
    name: 'Comunicação',
    icon: Mail,
    color: 'bg-teal-500/10 border-teal-500/30',
    badgeColor: 'bg-teal-500/20 text-teal-600 dark:text-teal-400',
    tables: ['contact_messages', 'reply_templates'],
  },
};

// Multi-domain tables mapping
const MULTI_DOMAIN_TABLES: Record<string, string[]> = {
  'documents': ['rag', 'media'],
  'chat_config': ['rag', 'chat'],
  'suggestion_audit': ['ml_ai', 'audit'],
  'suggestion_clicks': ['ml_ai', 'audit'],
  'deterministic_analysis': ['ml_ai', 'chat'],
  'credits_usage': ['audit', 'system'],
  'rag_analytics': ['rag', 'audit'],
};

// Get domains for a table
const getTableDomains = (tableName: string): string[] => {
  if (MULTI_DOMAIN_TABLES[tableName]) {
    return MULTI_DOMAIN_TABLES[tableName];
  }
  
  const domains: string[] = [];
  Object.entries(DOMAIN_CATEGORIES).forEach(([key, category]) => {
    if (key !== 'all' && category.tables.includes(tableName)) {
      domains.push(key);
    }
  });
  
  return domains.length > 0 ? domains : ['system']; // Default to system if not categorized
};

// ==================== TABLE DESCRIPTIONS ====================
const TABLE_DESCRIPTIONS: Record<string, string> = {
  admin_notifications: 'Notificações do painel administrativo',
  admin_settings: 'Configurações globais do admin (email, WhatsApp, segurança)',
  audio_contents: 'Conteúdos de áudio gerenciados pelo admin',
  auto_preload_config: 'Configuração de preload automático de YouTube',
  chat_analytics: 'Métricas de uso dos chats (mensagens, áudio, tópicos)',
  chat_config: 'Configurações RAG por tipo de chat (thresholds, prompts)',
  chat_routing_rules: 'Regras ML de roteamento de documentos para chats',
  contact_messages: 'Mensagens do formulário de contato',
  conversation_history: 'Histórico completo de conversas dos chats',
  credits_usage: 'Log de consumo de créditos de API (imagens, TTS)',
  debug_logs: 'Logs de debug do frontend para troubleshooting',
  deterministic_analysis: 'Análises determinísticas de mensagens classificadas',
  document_chunks: 'Chunks vetorizados para busca semântica RAG',
  document_routing_log: 'Log de roteamentos de documentos entre chats',
  document_tags: 'Tags hierárquicas (parent/child) dos documentos',
  document_versions: 'Versionamento de documentos com hash de conteúdo',
  documentation_sync_log: 'Log de sincronização da documentação',
  documentation_versions: 'Versões do changelog da documentação',
  documents: 'PDFs processados pelo sistema RAG com metadados LLM',
  economic_indicators: 'Indicadores econômicos cadastrados (SELIC, IPCA, etc.)',
  feature_flags: 'Feature flags para controle de funcionalidades',
  generated_images: 'Cache de imagens geradas por IA',
  image_analytics: 'Analytics de geração de imagens (tempo, sucesso)',
  indicator_values: 'Valores numéricos dos indicadores econômicos',
  integrity_check_log: 'Log de verificações de integridade do sistema',
  maieutic_training_categories: 'Categorias de treinamento maiêutico da IA',
  market_news: 'Notícias de mercado coletadas via scraping',
  notification_logic_config: 'Configuração lógica de disparo de notificações',
  notification_logs: 'Log de todas notificações enviadas (email/WhatsApp)',
  notification_preferences: 'Preferências de notificação por evento',
  notification_templates: 'Templates de notificação com variáveis',
  password_recovery_codes: 'Códigos de recuperação de senha temporários',
  podcast_contents: 'Podcasts Spotify gerenciados pelo admin',
  profiles: 'Perfis de usuários com dados adicionais',
  rag_analytics: 'Analytics de buscas RAG (latência, scores, resultados)',
  regional_tone_rules: 'Regras de tom regional para respostas IA',
  reply_templates: 'Templates de resposta para mensagens de contato',
  section_audio: 'Áudios associados às seções da landing page',
  section_content_versions: 'Versionamento do conteúdo das seções',
  section_contents: 'Conteúdo editável das seções da landing page',
  security_alert_config: 'Configuração de alertas de segurança',
  security_scan_results: 'Resultados dos scans de segurança',
  security_severity_history: 'Histórico de alterações de severidade',
  suggestion_audit: 'Auditoria de sugestões geradas pela IA',
  suggestion_clicks: 'Cliques em sugestões contextuais',
  system_api_registry: 'Registro de APIs externas (BCB, IBGE, etc.)',
  system_increments: 'Incrementos de versão do sistema',
  system_versions: 'Versões semânticas do sistema',
  tag_management_events: 'Eventos de gerenciamento de tags',
  tag_merge_rules: 'Regras de merge de tags duplicadas',
  tag_modification_logs: 'Log de modificações de tags',
  tooltip_contents: 'Conteúdo dos tooltips da landing page com áudio',
  typing_latency_logs: 'Logs de latência de digitação',
  user_activity_logs: 'Log de atividades administrativas',
  user_chat_preferences: 'Preferências de chat por sessão',
  user_contacts: 'Contatos de usuários (email, telefone)',
  user_registrations: 'Registros de usuários pendentes de aprovação',
  user_roles: 'Roles RBAC (user, admin, superadmin)',
};

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  foreign_table?: string;
}

interface DatabaseSchemaObservabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DatabaseSchemaObservabilityModal({
  isOpen,
  onClose,
}: DatabaseSchemaObservabilityModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get all unique table names from all domains
  const allTableNames = useMemo(() => {
    const tables = new Set<string>();
    Object.values(DOMAIN_CATEGORIES).forEach(cat => {
      cat.tables.forEach(t => tables.add(t));
    });
    // Add any tables from TABLE_DESCRIPTIONS not in categories
    Object.keys(TABLE_DESCRIPTIONS).forEach(t => tables.add(t));
    return Array.from(tables).sort();
  }, []);

  // Fetch counts in background
  useEffect(() => {
    if (!isOpen || allTableNames.length === 0) return;

    const fetchCounts = async () => {
      for (const tableName of allTableNames) {
        if (tableCounts[tableName] !== undefined) continue;
        
        setLoadingCounts(prev => new Set(prev).add(tableName));
        
        try {
          const { count, error } = await supabase
            .from(tableName as any)
            .select('*', { count: 'exact', head: true });
          
          if (!error && count !== null) {
            setTableCounts(prev => ({ ...prev, [tableName]: count }));
          } else {
            setTableCounts(prev => ({ ...prev, [tableName]: -1 }));
          }
        } catch {
          setTableCounts(prev => ({ ...prev, [tableName]: -1 }));
        }
        
        setLoadingCounts(prev => {
          const next = new Set(prev);
          next.delete(tableName);
          return next;
        });
      }
    };

    fetchCounts();
  }, [isOpen, allTableNames, tableCounts]);

  // Filter tables by domain and search
  const filteredTables = useMemo(() => {
    let tables = allTableNames;
    
    // Filter by domain
    if (selectedDomain !== 'all') {
      const domainTables = new Set(DOMAIN_CATEGORIES[selectedDomain]?.tables || []);
      // Also include multi-domain tables
      Object.entries(MULTI_DOMAIN_TABLES).forEach(([table, domains]) => {
        if (domains.includes(selectedDomain)) {
          domainTables.add(table);
        }
      });
      tables = tables.filter(t => domainTables.has(t));
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      tables = tables.filter(
        name =>
          name.toLowerCase().includes(query) ||
          (TABLE_DESCRIPTIONS[name] || '').toLowerCase().includes(query)
      );
    }
    
    return tables;
  }, [allTableNames, selectedDomain, searchQuery]);

  // Fetch column schema for selected table
  const { data: columns = [], isLoading: isLoadingColumns } = useQuery({
    queryKey: ['db-table-schema', selectedTable],
    queryFn: async () => {
      if (!selectedTable) return [];
      
      // Hardcoded schema for key tables
      const columnMap: Record<string, ColumnInfo[]> = {
        documents: [
          { column_name: 'id', data_type: 'uuid', is_nullable: 'NO', column_default: 'gen_random_uuid()', is_primary_key: true, is_foreign_key: false },
          { column_name: 'filename', data_type: 'text', is_nullable: 'NO', column_default: null, is_primary_key: false, is_foreign_key: false },
          { column_name: 'target_chat', data_type: 'text', is_nullable: 'NO', column_default: null, is_primary_key: false, is_foreign_key: false },
          { column_name: 'original_text', data_type: 'text', is_nullable: 'NO', column_default: null, is_primary_key: false, is_foreign_key: false },
          { column_name: 'ai_summary', data_type: 'text', is_nullable: 'YES', column_default: null, is_primary_key: false, is_foreign_key: false },
          { column_name: 'status', data_type: 'text', is_nullable: 'YES', column_default: "'pending'", is_primary_key: false, is_foreign_key: false },
          { column_name: 'total_chunks', data_type: 'integer', is_nullable: 'YES', column_default: '0', is_primary_key: false, is_foreign_key: false },
          { column_name: 'is_readable', data_type: 'boolean', is_nullable: 'YES', column_default: 'true', is_primary_key: false, is_foreign_key: false },
          { column_name: 'created_at', data_type: 'timestamptz', is_nullable: 'YES', column_default: 'now()', is_primary_key: false, is_foreign_key: false },
        ],
        document_chunks: [
          { column_name: 'id', data_type: 'uuid', is_nullable: 'NO', column_default: 'gen_random_uuid()', is_primary_key: true, is_foreign_key: false },
          { column_name: 'document_id', data_type: 'uuid', is_nullable: 'NO', column_default: null, is_primary_key: false, is_foreign_key: true, foreign_table: 'documents' },
          { column_name: 'content', data_type: 'text', is_nullable: 'NO', column_default: null, is_primary_key: false, is_foreign_key: false },
          { column_name: 'embedding', data_type: 'vector(1536)', is_nullable: 'YES', column_default: null, is_primary_key: false, is_foreign_key: false },
          { column_name: 'chunk_index', data_type: 'integer', is_nullable: 'NO', column_default: null, is_primary_key: false, is_foreign_key: false },
          { column_name: 'word_count', data_type: 'integer', is_nullable: 'NO', column_default: null, is_primary_key: false, is_foreign_key: false },
          { column_name: 'metadata', data_type: 'jsonb', is_nullable: 'YES', column_default: "'{}'", is_primary_key: false, is_foreign_key: false },
        ],
        indicator_values: [
          { column_name: 'id', data_type: 'uuid', is_nullable: 'NO', column_default: 'gen_random_uuid()', is_primary_key: true, is_foreign_key: false },
          { column_name: 'indicator_id', data_type: 'uuid', is_nullable: 'NO', column_default: null, is_primary_key: false, is_foreign_key: true, foreign_table: 'economic_indicators' },
          { column_name: 'reference_date', data_type: 'date', is_nullable: 'NO', column_default: null, is_primary_key: false, is_foreign_key: false },
          { column_name: 'value', data_type: 'numeric', is_nullable: 'NO', column_default: null, is_primary_key: false, is_foreign_key: false },
          { column_name: 'created_at', data_type: 'timestamptz', is_nullable: 'YES', column_default: 'now()', is_primary_key: false, is_foreign_key: false },
        ],
        economic_indicators: [
          { column_name: 'id', data_type: 'uuid', is_nullable: 'NO', column_default: 'gen_random_uuid()', is_primary_key: true, is_foreign_key: false },
          { column_name: 'code', data_type: 'text', is_nullable: 'NO', column_default: null, is_primary_key: false, is_foreign_key: false },
          { column_name: 'name', data_type: 'text', is_nullable: 'NO', column_default: null, is_primary_key: false, is_foreign_key: false },
          { column_name: 'category', data_type: 'text', is_nullable: 'YES', column_default: "'macro'", is_primary_key: false, is_foreign_key: false },
          { column_name: 'frequency', data_type: 'text', is_nullable: 'YES', column_default: "'monthly'", is_primary_key: false, is_foreign_key: false },
          { column_name: 'api_id', data_type: 'uuid', is_nullable: 'YES', column_default: null, is_primary_key: false, is_foreign_key: true, foreign_table: 'system_api_registry' },
        ],
        conversation_history: [
          { column_name: 'id', data_type: 'uuid', is_nullable: 'NO', column_default: 'gen_random_uuid()', is_primary_key: true, is_foreign_key: false },
          { column_name: 'session_id', data_type: 'text', is_nullable: 'NO', column_default: null, is_primary_key: false, is_foreign_key: false },
          { column_name: 'title', data_type: 'text', is_nullable: 'NO', column_default: null, is_primary_key: false, is_foreign_key: false },
          { column_name: 'chat_type', data_type: 'text', is_nullable: 'YES', column_default: "'health'", is_primary_key: false, is_foreign_key: false },
          { column_name: 'messages', data_type: 'jsonb', is_nullable: 'NO', column_default: "'[]'", is_primary_key: false, is_foreign_key: false },
          { column_name: 'sentiment_score', data_type: 'numeric', is_nullable: 'YES', column_default: null, is_primary_key: false, is_foreign_key: false },
          { column_name: 'created_at', data_type: 'timestamptz', is_nullable: 'NO', column_default: 'now()', is_primary_key: false, is_foreign_key: false },
        ],
      };

      return columnMap[selectedTable] || [
        { column_name: 'id', data_type: 'uuid', is_nullable: 'NO', column_default: 'gen_random_uuid()', is_primary_key: true, is_foreign_key: false },
        { column_name: 'created_at', data_type: 'timestamptz', is_nullable: 'YES', column_default: 'now()', is_primary_key: false, is_foreign_key: false },
      ];
    },
    enabled: !!selectedTable,
    staleTime: 10 * 60 * 1000,
  });

  // Refresh all counts
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setTableCounts({});
    setIsRefreshing(false);
  };

  // Format count for display
  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Domain tabs
  const domainKeys = Object.keys(DOMAIN_CATEGORIES);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 pb-0 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedTable ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTable(null)}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              ) : (
                <Database className="h-6 w-6 text-primary" />
              )}
              <DialogTitle className="text-xl">
                {selectedTable ? (
                  <span className="font-mono">{selectedTable}</span>
                ) : (
                  'Schema do Banco de Dados'
                )}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-3">
              {!selectedTable && (
                <>
                  <Badge variant="outline" className="text-sm">
                    {filteredTables.length} tabelas
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="gap-2"
                  >
                    <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                    Atualizar
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Domain Tabs - only when not viewing a table */}
          {!selectedTable && (
            <div className="mt-4">
              <Tabs value={selectedDomain} onValueChange={setSelectedDomain}>
                <TabsList className="w-full h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
                  {domainKeys.map((key) => {
                    const domain = DOMAIN_CATEGORIES[key];
                    const Icon = domain.icon;
                    const count = key === 'all' 
                      ? allTableNames.length 
                      : domain.tables.length + Object.entries(MULTI_DOMAIN_TABLES)
                          .filter(([_, domains]) => domains.includes(key)).length;
                    
                    return (
                      <TabsTrigger
                        key={key}
                        value={key}
                        className={cn(
                          "gap-1.5 px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                          "border border-transparent data-[state=active]:border-primary"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{domain.name}</span>
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                          {count}
                        </Badge>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* Search bar - only when not viewing a table */}
          {!selectedTable && (
            <div className="relative mt-4 pb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tabela por nome ou descrição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="flex-1 p-4">
          {selectedTable ? (
            // Schema Detail View
            <div className="space-y-4">
              {/* Table description */}
              <Card className={cn(
                "p-4 border-2",
                DOMAIN_CATEGORIES[getTableDomains(selectedTable)[0]]?.color || "bg-muted/30"
              )}>
                <p className="text-sm text-muted-foreground">
                  {TABLE_DESCRIPTIONS[selectedTable] || 'Tabela do banco de dados'}
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <Badge variant="secondary" className="gap-1">
                    <TableIcon className="h-3 w-3" />
                    {tableCounts[selectedTable] !== undefined
                      ? tableCounts[selectedTable] === -1
                        ? 'Erro'
                        : `${formatCount(tableCounts[selectedTable])} registros`
                      : 'Carregando...'}
                  </Badge>
                  
                  {/* Domain badges */}
                  {getTableDomains(selectedTable).map(domain => (
                    <Badge 
                      key={domain} 
                      className={cn("gap-1", DOMAIN_CATEGORIES[domain]?.badgeColor)}
                    >
                      {DOMAIN_CATEGORIES[domain]?.name}
                    </Badge>
                  ))}
                </div>
              </Card>

              {/* Columns table */}
              {isLoadingColumns ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Card className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Campo</TableHead>
                        <TableHead className="w-[150px]">Tipo</TableHead>
                        <TableHead className="w-[100px]">Chave</TableHead>
                        <TableHead className="w-[100px]">Nullable</TableHead>
                        <TableHead>Default</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {columns.map((col) => (
                        <TableRow key={col.column_name}>
                          <TableCell className="font-mono text-sm">
                            {col.column_name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {col.data_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {col.is_primary_key && (
                                <Badge className="gap-1 bg-blue-500/90 hover:bg-blue-500">
                                  <Key className="h-3 w-3" />
                                  PK
                                </Badge>
                              )}
                              {col.is_foreign_key && (
                                <Badge className="gap-1 bg-purple-500/90 hover:bg-purple-500">
                                  <Link2 className="h-3 w-3" />
                                  FK
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {col.is_nullable === 'NO' ? (
                              <Badge variant="destructive" className="text-xs">
                                NOT NULL
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                NULL OK
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {col.column_default || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </div>
          ) : (
            // Tables Grid View
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTables.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma tabela encontrada para os filtros selecionados.</p>
                </div>
              ) : (
                filteredTables.map((tableName) => {
                  const count = tableCounts[tableName];
                  const isLoading = loadingCounts.has(tableName);
                  const description = TABLE_DESCRIPTIONS[tableName] || 'Tabela do banco de dados';
                  const domains = getTableDomains(tableName);
                  const isMultiDomain = domains.length > 1;
                  const primaryDomain = domains[0];
                  const domainConfig = DOMAIN_CATEGORIES[primaryDomain];

                  return (
                    <Card
                      key={tableName}
                      className={cn(
                        "p-4 transition-all cursor-pointer group border-2",
                        "hover:border-primary/50 hover:shadow-md",
                        isMultiDomain 
                          ? "bg-gradient-to-br from-transparent via-primary/5 to-transparent" 
                          : domainConfig?.color
                      )}
                      onClick={() => setSelectedTable(tableName)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Database className="h-5 w-5 text-primary/60 group-hover:text-primary transition-colors" />
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : count !== undefined ? (
                          <Badge
                            variant={count === -1 ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {count === -1 ? 'Erro' : formatCount(count)}
                          </Badge>
                        ) : null}
                      </div>
                      <h4 className="font-mono font-medium text-sm mb-1 group-hover:text-primary transition-colors">
                        {tableName}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {description}
                      </p>
                      
                      {/* Domain badges in footer */}
                      {isMultiDomain && (
                        <div className="flex flex-wrap gap-1 pt-2 border-t border-border/50">
                          {domains.map(domain => (
                            <Badge 
                              key={domain} 
                              variant="outline"
                              className={cn("text-[10px] px-1.5 py-0", DOMAIN_CATEGORIES[domain]?.badgeColor)}
                            >
                              {DOMAIN_CATEGORIES[domain]?.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Eye className="h-4 w-4" />
                        Ver Schema
                      </Button>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
