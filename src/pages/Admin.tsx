import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Languages } from "lucide-react";
import { UserBadge } from "@/components/UserBadge";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ErrorBoundary } from "@/components/admin/ErrorBoundary";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { t } from "i18next";
import knowyouAdminLogo from "@/assets/knowyou-admin-logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Eager load only DashboardTab (first view)
import { DashboardTab } from "@/components/admin/DashboardTab";

// Lazy load all other tabs for better initial bundle size
// ChatConfigTab removed - config now in AgentManagementTab
const TooltipsTab = lazy(() => import("@/components/admin/TooltipsTab").then(m => ({ default: m.TooltipsTab })));
const GmailTab = lazy(() => import("@/components/admin/GmailTab").then(m => ({ default: m.GmailTab })));
const AnalyticsTab = lazy(() => import("@/components/admin/AnalyticsTab").then(m => ({ default: m.AnalyticsTab })));
const ConversationsTab = lazy(() => import("@/components/admin/ConversationsTab").then(m => ({ default: m.ConversationsTab })));
const ImageCacheTab = lazy(() => import("@/components/admin/ImageCacheTab").then(m => ({ default: m.ImageCacheTab })));
const VideosTab = lazy(() => import("@/components/admin/VideosTab").then(m => ({ default: m.VideosTab })));
const DocumentsTab = lazy(() => import("@/components/admin/DocumentsTab").then(m => ({ default: m.DocumentsTab })));
const RagMetricsTab = lazy(() => import("@/components/admin/RagMetricsTab").then(m => ({ default: m.RagMetricsTab })));
const VersionControlTab = lazy(() => import("@/components/admin/VersionControlTab").then(m => ({ default: m.VersionControlTab })));
const DocumentAnalysisTab = lazy(() => import("@/components/admin/DocumentAnalysisTab").then(m => ({ default: m.DocumentAnalysisTab })));
const DocumentRoutingLogsTab = lazy(() => import("@/components/admin/DocumentRoutingLogsTab").then(m => ({ default: m.DocumentRoutingLogsTab })));
const RagDiagnosticsTab = lazy(() => import("@/components/admin/RagDiagnosticsTab").then(m => ({ default: m.RagDiagnosticsTab })));
const PodcastManagementTab = lazy(() => import("@/components/admin/PodcastManagementTab").then(m => ({ default: m.PodcastManagementTab })));
const ContentManagementTab = lazy(() => import("@/components/admin/ContentManagementTab").then(m => ({ default: m.ContentManagementTab })));
const ActivityLogsTab = lazy(() => import("@/components/admin/ActivityLogsTab").then(m => ({ default: m.ActivityLogsTab })));
const UserUsageLogsTab = lazy(() => import("@/components/admin/UserUsageLogsTab").then(m => ({ default: m.UserUsageLogsTab })));
const TagModificationLogsTab = lazy(() => import("@/components/admin/TagModificationLogsTab").then(m => ({ default: m.TagModificationLogsTab })));
const DeterministicAnalysisTab = lazy(() => import("@/components/admin/DeterministicAnalysisTab").then(m => ({ default: m.DeterministicAnalysisTab })));
const InfrastructureArchitectureTab = lazy(() => import("@/components/admin/InfrastructureArchitectureTab").then(m => ({ default: m.InfrastructureArchitectureTab })));
const RegionalConfigTab = lazy(() => import("@/components/admin/RegionalConfigTab").then(m => ({ default: m.RegionalConfigTab })));
const SuggestionAuditTab = lazy(() => import("@/components/admin/SuggestionAuditTab").then(m => ({ default: m.SuggestionAuditTab })));
const ContactMessagesTab = lazy(() => import("@/components/admin/ContactMessagesTab").then(m => ({ default: m.ContactMessagesTab })));
const DocumentationSyncTab = lazy(() => import("@/components/admin/DocumentationSyncTab").then(m => ({ default: m.DocumentationSyncTab })));
const TagsManagementTab = lazy(() => import("@/components/admin/TagsManagementTab").then(m => ({ default: m.TagsManagementTab })));
const MLDashboardTab = lazy(() => import("@/components/admin/MLDashboardTab").then(m => ({ default: m.MLDashboardTab })));
const MaieuticTrainingTab = lazy(() => import("@/components/admin/MaieuticTrainingTab").then(m => ({ default: m.MaieuticTrainingTab })));
const TaxonomyMLAuditTab = lazy(() => import("@/components/admin/TaxonomyMLAuditTab").then(m => ({ default: m.TaxonomyMLAuditTab })));
const TaxonomyManagerTab = lazy(() => import("@/components/admin/TaxonomyManagerTab"));
const TagSuggestionReviewTab = lazy(() => import("@/components/admin/TagSuggestionReviewTab"));
const SecurityIntegrityTab = lazy(() => import("@/components/admin/SecurityIntegrityTab").then(m => ({ default: m.SecurityIntegrityTab })));
const SecurityDashboard = lazy(() => import("@/components/admin/SecurityDashboard").then(m => ({ default: m.SecurityDashboard })));
const SecurityWhitelist = lazy(() => import("@/components/admin/SecurityWhitelist").then(m => ({ default: m.SecurityWhitelist })));
const SecurityShieldConfigTab = lazy(() => import("@/components/admin/SecurityShieldConfigTab").then(m => ({ default: m.SecurityShieldConfigTab })));
const SecurityAuditLogsTab = lazy(() => import("@/components/admin/SecurityAuditLogsTab").then(m => ({ default: m.SecurityAuditLogsTab })));
const NotificationSettingsTab = lazy(() => import("@/components/admin/NotificationSettingsTab"));
const NotificationLogsTab = lazy(() => import("@/components/admin/NotificationLogsTab"));
const UserRegistryTab = lazy(() => import("@/components/admin/UserRegistryTab"));
const EconomicIndicatorsTab = lazy(() => import("@/components/admin/EconomicIndicatorsTab"));
const MarketNewsTab = lazy(() => import("@/components/admin/MarketNewsTab"));
const ApiManagementTab = lazy(() => import("@/components/admin/ApiManagementTab"));
const JsonDataObservabilityTab = lazy(() => import("@/components/admin/JsonDataObservabilityTab").then(m => ({ default: m.JsonDataObservabilityTab })));
const DataAnalysisTab = lazy(() => import("@/components/admin/DataAnalysisTab"));
const ChartDatabaseTab = lazy(() => import("@/components/admin/ChartDatabaseTab"));
const JsonTestTab = lazy(() => import("@/components/admin/JsonTestTab"));
const RegionalIndicatorsTab = lazy(() => import("@/components/admin/RegionalIndicatorsTab"));
const TableDatabaseTab = lazy(() => import("@/components/admin/TableDatabaseTab"));
const ApiAuditLogsTab = lazy(() => import("@/components/admin/ApiAuditLogsTab"));
const AgentManagementTab = lazy(() => import("@/components/admin/AgentManagementTab"));
const PMCConversionTab = lazy(() => import("@/components/admin/PMCConversionTab"));
const PWATab = lazy(() => import("@/components/admin/PWATab"));
const AppConfigTab = lazy(() => import("@/components/admin/AppConfigTab"));
const DocumentReclassificationTab = lazy(() => import("@/components/admin/DocumentReclassificationTab").then(m => ({ default: m.DocumentReclassificationTab })));
const TaxonomySuggestionsTab = lazy(() => import("@/components/admin/TaxonomySuggestionsTab"));
const DocumentOnboardingTab = lazy(() => import("@/components/admin/DocumentOnboardingTab"));
const TaxonomyAnalyticsTab = lazy(() => import("@/components/admin/TaxonomyAnalyticsTab"));
const MaieuticEffectivenessTab = lazy(() => import("@/components/admin/MaieuticEffectivenessTab"));
const ContentProfilesTab = lazy(() => import("@/components/admin/ContentProfilesTab"));
const LexiconPhoneticsTab = lazy(() => import("@/components/admin/LexiconPhoneticsTab"));
const OntologyConceptsTab = lazy(() => import("@/components/admin/OntologyConceptsTab"));
const SchemaMonitorTab = lazy(() => import("@/components/admin/SchemaMonitorTab"));
const CRMTab = lazy(() => import("@/components/admin/CRMTab").then(m => ({ default: m.CRMTab })));
const WhatsAppTierDashboard = lazy(() => import("@/components/admin/WhatsAppTierDashboard"));
const FallbackConfigTab = lazy(() => import("@/components/admin/FallbackConfigTab"));
const PWAConversationsTab = lazy(() => import("@/components/admin/PWAConversationsTab"));
const TabLoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

type TabType = "dashboard" | "tooltips" | "gmail" | "analytics" | "conversations" | "images" | "videos" | "documents" | "rag-metrics" | "version-control" | "tags" | "document-analysis" | "document-routing-logs" | "rag-diagnostics" | "content-management" | "podcasts" | "activity-logs" | "user-usage-logs" | "tag-modification-logs" | "deterministic-analysis" | "architecture" | "regional-config" | "suggestion-audit" | "contact-messages" | "documentation-sync" | "ml-dashboard" | "maieutic-training" | "taxonomy-ml-audit" | "taxonomy-manager" | "ml-review" | "security-integrity" | "security-dashboard" | "security-whitelist" | "security-shield-config" | "security-audit-logs" | "notification-settings" | "notification-logs" | "user-registry" | "economic-indicators" | "market-news" | "api-management" | "json-data" | "data-analysis" | "chart-database" | "json-test" | "regional-indicators" | "table-database" | "api-audit-logs" | "agent-management" | "pmc-conversion" | "dashboard-external" | "data-registry" | "pwa" | "app-config" | "doc-reclassification" | "taxonomy-suggestions" | "document-onboarding" | "taxonomy-analytics" | "maieutic-effectiveness" | "lexicon-phonetics" | "ontology-concepts" | "content-profiles" | "schema-monitor" | "crm" | "whatsapp-tier" | "fallback-config" | "pwa-conversations";

// Mapping de tab para nome legível
const TAB_LABELS: Record<TabType, string> = {
  "dashboard": "Dashboard",
  "tooltips": "Tooltips",
  "gmail": "Gmail",
  "analytics": "Analytics",
  "conversations": "Conversas",
  "images": "Cache de Imagens",
  "videos": "Inserir Vídeos (Vimeo)",
  "documents": "RAG Documentos",
  "rag-metrics": "Métricas RAG",
  "version-control": "Versionamento",
  "tags": "Gerenciar Tags",
  "document-analysis": "Análise Documentos",
  "document-routing-logs": "Logs de Roteamento",
  "rag-diagnostics": "Diagnóstico RAG",
  "content-management": "Seções Landing Page",
  "podcasts": "Podcasts",
  "activity-logs": "Log de Atividades",
  "user-usage-logs": "Log de Uso (Usuários)",
  "tag-modification-logs": "Logs de Mescla Tags",
  "deterministic-analysis": "Fala Determinística",
  "architecture": "Arquitetura",
  "regional-config": "Configurações Regionais",
  "suggestion-audit": "Auditoria Sugestões",
  "contact-messages": "Mensagens Contato",
  "documentation-sync": "Sincronizar Docs",
  "ml-dashboard": "Machine Learning ML",
  "maieutic-training": "Treino IA Maiêutica",
  "taxonomy-ml-audit": "Taxonomy ML",
  "taxonomy-manager": "Taxonomia Global",
  "ml-review": "Revisão ML",
  "security-integrity": "Segurança & Integridade",
  "security-dashboard": "Dashboard Segurança",
  "security-whitelist": "Whitelist de IPs",
  "security-shield-config": "Config. Security Shield",
  "security-audit-logs": "Audit Logs Segurança",
  "notification-settings": "Notificação",
  "notification-logs": "Logs de Notificações",
  "user-registry": "Cadastro de Usuários",
  "economic-indicators": "Painel de Indicadores",
  "market-news": "Balcão de Notícias",
  "api-management": "Gestão de APIs",
  "json-data": "JSON Dados",
  "data-analysis": "Data Analysis",
  "chart-database": "Chart Data Base",
  "json-test": "Teste de JSON",
  "regional-indicators": "Indicadores Regionais",
  "table-database": "Table Data Base",
  "api-audit-logs": "Log de APIs",
  "agent-management": "Gestão de Agentes",
  "pmc-conversion": "PMC → R$",
  "dashboard-external": "Dashboard Externo",
  "data-registry": "Cadastro de Dados",
  "pwa": "PWA Voz",
  "app-config": "Configurações do Sistema",
  "doc-reclassification": "Re-classificar Docs",
  "taxonomy-suggestions": "Auto-Gestão Taxonomia",
  "document-onboarding": "Onboarding Docs",
  "taxonomy-analytics": "Analytics Taxonomia",
  "maieutic-effectiveness": "Eficácia Maiêutica",
  "lexicon-phonetics": "Fonética & TTS",
  "ontology-concepts": "Ontologia Conceitos",
  "content-profiles": "Perfis de Conteúdo",
  "schema-monitor": "Monitor de Schema",
  "crm": "CRM Leads",
  "whatsapp-tier": "WhatsApp Tier",
  "fallback-config": "Fallback SMS",
  "pwa-conversations": "Conversas PWA",
};
const Admin = () => {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('admin_sidebar_collapsed');
    return saved === 'true';
  });
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const languages = [
    { code: "pt", label: "Português", abbr: "PT" },
    { code: "en", label: "English", abbr: "EN" },
    { code: "fr", label: "Français", abbr: "FR" },
  ];

  const handleLanguageChange = async (code: string) => {
    setIsChangingLanguage(true);
    try {
      await i18n.changeLanguage(code);
      localStorage.setItem("i18nextLng", code);
      document.cookie = `i18next=${code};path=/;max-age=31536000`;
    } finally {
      setIsChangingLanguage(false);
    }
  };

  const currentLanguage = languages.find((l) => l.code === i18n.language) || languages[0];

  // Handler de mudança de tab
  const handleTabChange = (newTab: TabType) => {
    setActiveTab(newTab);
  };


  // Persistir estado do sidebar no localStorage
  useEffect(() => {
    localStorage.setItem('admin_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/admin/login");
          return;
        }

        setUserEmail(user.email || null);

        // Check if user has SUPERADMIN role (exclusive access to /admin)
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "superadmin")
          .maybeSingle();

        if (!roleData) {
          // Silently redirect non-superadmin users to /dashboard
          navigate("/dashboard");
          return;
        }
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/admin/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  const renderTab = () => {
    // Dashboard is eagerly loaded, all others use Suspense
    if (activeTab === "dashboard") {
      return <DashboardTab />;
    }

    const LazyComponent = (() => {
      switch (activeTab) {
        case "tooltips": return <TooltipsTab />;
        case "conversations": return <ConversationsTab />;
        case "gmail": return <GmailTab />;
        case "analytics": return <AnalyticsTab />;
        case "documents": return <DocumentsTab />;
        case "rag-metrics": return <RagMetricsTab />;
        case "version-control": return <VersionControlTab />;
        case "tags": return <TagsManagementTab />;
        case "document-analysis": return <DocumentAnalysisTab />;
        case "document-routing-logs": return <DocumentRoutingLogsTab />;
        case "rag-diagnostics": return <RagDiagnosticsTab />;
        case "content-management": return <ContentManagementTab />;
        case "podcasts": return <PodcastManagementTab />;
        case "activity-logs": return <ActivityLogsTab />;
        case "user-usage-logs": return <UserUsageLogsTab />;
        case "tag-modification-logs": return <TagModificationLogsTab />;
        case "deterministic-analysis": return <DeterministicAnalysisTab />;
        case "architecture": return <InfrastructureArchitectureTab />;
        case "regional-config": return <RegionalConfigTab />;
        case "suggestion-audit": return <SuggestionAuditTab />;
        case "contact-messages": return <ContactMessagesTab />;
        case "documentation-sync": return <DocumentationSyncTab />;
        case "images": return <ImageCacheTab />;
        case "videos": return <VideosTab />;
        case "ml-dashboard": return <MLDashboardTab />;
        case "maieutic-training": return <MaieuticTrainingTab />;
        case "taxonomy-ml-audit": return <TaxonomyMLAuditTab />;
        case "taxonomy-manager": return <TaxonomyManagerTab />;
        case "ml-review": return <TagSuggestionReviewTab />;
        case "security-integrity": return <SecurityIntegrityTab />;
        case "security-dashboard": return <SecurityDashboard />;
        case "security-whitelist": return <SecurityWhitelist />;
        case "security-shield-config": return <SecurityShieldConfigTab />;
        case "security-audit-logs": return <SecurityAuditLogsTab />;
        case "notification-settings": return <NotificationSettingsTab />;
        case "notification-logs": return <NotificationLogsTab />;
        case "user-registry": return <UserRegistryTab />;
        case "economic-indicators": return <EconomicIndicatorsTab />;
        case "market-news": return <MarketNewsTab />;
        case "api-management": return <ApiManagementTab />;
        case "json-data": return <JsonDataObservabilityTab />;
        case "data-analysis": return <DataAnalysisTab />;
        case "chart-database": return <ChartDatabaseTab />;
        case "json-test": return <JsonTestTab />;
        case "regional-indicators": return <RegionalIndicatorsTab />;
        case "table-database": return <TableDatabaseTab />;
        case "api-audit-logs": return <ApiAuditLogsTab />;
        case "agent-management": return <AgentManagementTab />;
        case "pmc-conversion": return <PMCConversionTab />;
        case "pwa": return <PWATab />;
        case "app-config": return <AppConfigTab />;
        case "doc-reclassification": return <DocumentReclassificationTab />;
        case "taxonomy-suggestions": return <TaxonomySuggestionsTab />;
        case "document-onboarding": return <DocumentOnboardingTab />;
        case "taxonomy-analytics": return <TaxonomyAnalyticsTab />;
        case "maieutic-effectiveness": return <MaieuticEffectivenessTab />;
        case "content-profiles": return <ContentProfilesTab />;
        case "lexicon-phonetics": return <LexiconPhoneticsTab />;
        case "ontology-concepts": return <OntologyConceptsTab />;
        case "schema-monitor": return <SchemaMonitorTab />;
        case "crm": return <CRMTab />;
        case "whatsapp-tier": return <WhatsAppTierDashboard />;
        case "fallback-config": return <FallbackConfigTab />;
        case "pwa-conversations": return <PWAConversationsTab />;
        default: return <DashboardTab />;
      }
    })();

    return (
      <Suspense fallback={<TabLoadingFallback />}>
        {LazyComponent}
      </Suspense>
    );
  };

  // Dynamic margin based on sidebar state
  const sidebarWidth = isSidebarCollapsed ? 'ml-[72px]' : 'ml-[280px]';

  return (
    <div className="min-h-screen w-full bg-background overflow-hidden">
      {/* Sidebar - Fixed full height */}
      <AdminSidebar 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main content wrapper with dynamic left margin - explicit z-index for visibility */}
      <div className={`${sidebarWidth} relative z-10 transition-all duration-500 ease-in-out min-h-screen flex flex-col`}>
        {/* Header - inside main content area, not overlapping sidebar */}
        <header className={`h-14 bg-background/80 backdrop-blur-md border-b border-border/50 fixed top-0 right-0 z-30 flex items-center justify-between px-6 transition-all duration-500 ease-in-out ${isSidebarCollapsed ? 'left-[72px]' : 'left-[280px]'}`}>
          {/* Left: Logo + Admin Panel title */}
          <div className="flex items-center gap-3">
            <img 
              src={knowyouAdminLogo} 
              alt="KnowYOU" 
              className="h-8 w-8 rounded-full object-cover"
            />
            <span className="text-sm font-medium text-foreground whitespace-nowrap">
              {t('admin.panel')}
            </span>
          </div>
          
          {/* Right: Language + Notifications + User */}
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-5">
              {/* Language Selector with Tooltip */}
              <Tooltip>
              <TooltipTrigger asChild>
                  <div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full"
                          disabled={isChangingLanguage}
                        >
                          {isChangingLanguage ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Languages className="h-4 w-4" />
                              <span className="text-xs font-semibold">{currentLanguage.abbr}</span>
                            </>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[140px]">
                        {languages.map((lang) => (
                          <DropdownMenuItem
                            key={lang.code}
                            onClick={() => handleLanguageChange(lang.code)}
                            className={`flex items-center gap-3 cursor-pointer ${
                              i18n.language === lang.code ? "bg-accent" : ""
                            }`}
                          >
                            <span className="text-xs font-bold text-muted-foreground w-5">{lang.abbr}</span>
                            <span>{lang.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Mudar Idioma</p>
                </TooltipContent>
              </Tooltip>

              {/* Notifications with Tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <NotificationBell onNavigate={(tab) => setActiveTab(tab as TabType)} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Notificações</p>
                </TooltipContent>
              </Tooltip>
              
              {/* User Badge */}
              <UserBadge />
            </div>
          </TooltipProvider>
        </header>

        {/* Main content - explicit visibility and min-height for safe mode */}
        <main className="flex-1 overflow-y-auto pt-14 min-h-[calc(100vh-3.5rem)] opacity-100 visible bg-background">
          <div className="p-8">
            <div className="w-full">
              <ErrorBoundary key={activeTab} fallbackMessage="Erro ao carregar este módulo do painel admin">
                {renderTab()}
              </ErrorBoundary>
            </div>
          </div>
        </main>

      </div>
    </div>
  );
};

export default Admin;
