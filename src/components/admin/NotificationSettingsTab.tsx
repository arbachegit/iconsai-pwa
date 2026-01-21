import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Phone, 
  Save, 
  Send, 
  FileText, 
  AlertTriangle, 
  Shield, 
  TrendingDown, 
  MessageCircle,
  Loader2,
  Settings,
  Cog,
  History,
  User,
  KeyRound,
  LogIn,
  Brain,
  Tags,
  ScanSearch,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
  Smartphone,
  Globe,
  Wifi,
  Map,
  Database,
  Zap,
  ArrowRightLeft,
  DollarSign
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface EventConfig {
  icon: React.ComponentType<{ className?: string }>;
  category: 'security' | 'intelligence' | 'system';
  description?: string;
  hasLogicConfig?: boolean;
}

const EVENT_CONFIG: Record<string, EventConfig> = {
  // Category A: Security & Auth
  password_reset: { icon: KeyRound, category: 'security', description: 'Quando usuário solicita recuperação de senha', hasLogicConfig: true },
  login_alert: { icon: LogIn, category: 'security', description: 'Login detectado em novo dispositivo', hasLogicConfig: true },
  security_alert: { icon: Shield, category: 'security', description: 'Alertas de segurança do sistema', hasLogicConfig: true },
  
  // Category B: Data Intelligence
  sentiment_alert: { icon: Brain, category: 'intelligence', description: 'IA detecta sentimento negativo em análises', hasLogicConfig: true },
  taxonomy_anomaly: { icon: Tags, category: 'intelligence', description: 'Falha na auditoria de taxonomia ML', hasLogicConfig: true },
  ml_accuracy_drop: { icon: TrendingDown, category: 'intelligence', description: 'Queda na precisão do sistema ML', hasLogicConfig: true },
  
  // Category C: System Status
  new_document: { icon: FileText, category: 'system', description: 'Novo documento processado no RAG', hasLogicConfig: true },
  document_failed: { icon: AlertTriangle, category: 'system', description: 'Falha no processamento de documento', hasLogicConfig: true },
  new_contact_message: { icon: MessageCircle, category: 'system', description: 'Nova mensagem de contato recebida', hasLogicConfig: true },
  new_conversation: { icon: MessageSquare, category: 'system', description: 'Nova conversa iniciada no chat', hasLogicConfig: true },
  api_ready_for_implementation: { icon: Zap, category: 'system', description: 'API testada e pronta para implementação', hasLogicConfig: false },
};

const CATEGORY_LABELS: Record<string, { title: string; icon: React.ComponentType<{ className?: string }> }> = {
  security: { title: 'Segurança & Autenticação', icon: Shield },
  intelligence: { title: 'Inteligência de Dados', icon: Brain },
  system: { title: 'Status do Sistema', icon: Bell },
};

interface NotificationPreference {
  id: string;
  event_type: string;
  event_label: string;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
}

interface NotificationTemplate {
  id: string;
  event_type: string;
  platform_name: string;
  email_subject: string | null;
  email_body: string | null;
  whatsapp_message: string | null;
  variables_available: string[];
}

interface SecurityAlertConfig {
  id: string;
  current_level: 'critical' | 'warning' | 'secure';
  template_critical: string;
  template_warning: string;
  template_secure: string;
}

interface SeverityHistoryEntry {
  id: string;
  previous_level: string;
  new_level: string;
  changed_by_email: string | null;
  change_reason: string | null;
  created_at: string;
}

interface NotificationLogicConfig {
  id: string;
  event_type: string;
  config: Record<string, unknown>;
}

// Format phone number for display with auto-masking
const formatPhoneNumber = (value: string): string => {
  const cleaned = value.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+') && cleaned.length > 0) {
    return '+' + cleaned;
  }
  if (cleaned.length <= 1) return cleaned;
  
  const withoutPlus = cleaned.slice(1);
  
  if (withoutPlus.startsWith('55')) {
    const countryCode = withoutPlus.slice(0, 2);
    const areaCode = withoutPlus.slice(2, 4);
    const firstPart = withoutPlus.slice(4, 9);
    const secondPart = withoutPlus.slice(9, 13);
    
    let formatted = `+${countryCode}`;
    if (areaCode) formatted += ` ${areaCode}`;
    if (firstPart) formatted += ` ${firstPart}`;
    if (secondPart) formatted += `-${secondPart}`;
    return formatted;
  } else if (withoutPlus.startsWith('1')) {
    const countryCode = withoutPlus.slice(0, 1);
    const areaCode = withoutPlus.slice(1, 4);
    const firstPart = withoutPlus.slice(4, 7);
    const secondPart = withoutPlus.slice(7, 11);
    
    let formatted = `+${countryCode}`;
    if (areaCode) formatted += ` (${areaCode})`;
    if (firstPart) formatted += ` ${firstPart}`;
    if (secondPart) formatted += `-${secondPart}`;
    return formatted;
  } else {
    const parts = [];
    let remaining = withoutPlus;
    const countryCodeLen = remaining.length >= 2 && remaining[0] !== '1' ? 2 : 1;
    parts.push(remaining.slice(0, countryCodeLen));
    remaining = remaining.slice(countryCodeLen);
    
    while (remaining.length > 0) {
      const chunkSize = remaining.length > 4 ? 3 : remaining.length;
      parts.push(remaining.slice(0, chunkSize));
      remaining = remaining.slice(chunkSize);
    }
    
    return '+' + parts.join(' ');
  }
};

const SEVERITY_LEVELS = [
  { value: 'critical' as const, label: 'Crítico', color: 'bg-red-500/20 text-red-500 border-red-500/50 hover:bg-red-500/30' },
  { value: 'warning' as const, label: 'Atenção', color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/30' },
  { value: 'secure' as const, label: 'Seguro', color: 'bg-green-500/20 text-green-500 border-green-500/50 hover:bg-green-500/30' },
];

const CRON_OPTIONS = [
  { value: '0 3 * * *', label: 'Diário às 03:00' },
  { value: '0 */6 * * *', label: 'A cada 6 horas' },
  { value: '0 */12 * * *', label: 'A cada 12 horas' },
  { value: '0 0 * * 0', label: 'Semanal (Domingo 00:00)' },
];

export default function NotificationSettingsTab() {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [targetPhone, setTargetPhone] = useState('');
  const [whatsappGlobalEnabled, setWhatsappGlobalEnabled] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [emailGlobalEnabled, setEmailGlobalEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingWhatsapp, setTestingWhatsapp] = useState(false);
  const [testingSms, setTestingSms] = useState(false);
  
  // SMS Configuration State
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [smsAsFallback, setSmsAsFallback] = useState(true);
  const [twilioSmsNumber] = useState('+17727323860');
  
  // Configuration saved states
  const [whatsappConfigured, setWhatsappConfigured] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(false);
  
  // Resend Domain Status State
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [domainStatus, setDomainStatus] = useState<{
    configured: boolean;
    verified: boolean;
    domain?: { name: string; status: string };
    error?: string;
    message?: string;
  } | null>(null);
  
  // Security Alert Config State
  const [securityConfig, setSecurityConfig] = useState<SecurityAlertConfig | null>(null);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [editingSecurityConfig, setEditingSecurityConfig] = useState<SecurityAlertConfig | null>(null);
  const [savingSecurityConfig, setSavingSecurityConfig] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  
  // Severity History State
  const [severityHistory, setSeverityHistory] = useState<SeverityHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Template Customization State
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Logic Modal State (Dual-Engine)
  const [logicModalOpen, setLogicModalOpen] = useState(false);
  const [editingLogicEvent, setEditingLogicEvent] = useState<string | null>(null);
  const [logicConfigs, setLogicConfigs] = useState<NotificationLogicConfig[]>([]);
  const [savingLogicConfig, setSavingLogicConfig] = useState(false);

  // Trigger Map Modal State
  const [showTriggerMap, setShowTriggerMap] = useState(false);

  // Diagnostic State
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<Array<{
    event: string;
    label: string;
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    emailTarget: string;
    whatsappTarget: string;
    templateFound: boolean;
    conflict: string | null;
  }>>([]);

  // Confirmation Dialog State
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmationType, setConfirmationType] = useState<'whatsapp' | 'email' | null>(null);
  const [originalWhatsappPhone, setOriginalWhatsappPhone] = useState('');
  const [originalWhatsappEnabled, setOriginalWhatsappEnabled] = useState(false);
  const [originalEmail, setOriginalEmail] = useState('');
  const [originalEmailEnabled, setOriginalEmailEnabled] = useState(true);

  // Login Alert Logic State
  const [loginAlertConfig, setLoginAlertConfig] = useState({
    checkIp: true,
    checkDevice: true,
    checkGeo: false,
    alertOnNewDevice: true
  });

  // Password Recovery Logic State (read-only)
  const [otpConfig] = useState({
    codeLength: 6,
    expirationMinutes: 15,
    maxAttempts: 3
  });

  // Security Scan Logic State
  const [scanCronConfig, setScanCronConfig] = useState({
    cronEnabled: true,
    cronExpression: '0 3 * * *',
    alertThreshold: 'warning',
    lastRun: null as string | null,
    nextRun: null as string | null
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setTargetPhone(formatted);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load notification preferences
      const { data: prefsData, error: prefsError } = await supabase
        .from('notification_preferences')
        .select('*')
        .order('event_type');

      if (prefsError) throw prefsError;
      setPreferences(prefsData || []);

      // Load admin settings for phone, email, SMS and global toggles
      const { data: settingsData, error: settingsError } = await supabase
        .from('admin_settings')
        .select('whatsapp_target_phone, whatsapp_global_enabled, gmail_notification_email, email_global_enabled, last_scheduled_scan, sms_enabled, sms_as_fallback, twilio_sms_number')
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      
      if (settingsData) {
        const phone = settingsData.whatsapp_target_phone || '';
        const whatsappEnabled = settingsData.whatsapp_global_enabled || false;
        const email = (settingsData as any).gmail_notification_email || '';
        const emailEnabled = (settingsData as any).email_global_enabled !== false;
        
        setTargetPhone(phone);
        setWhatsappGlobalEnabled(whatsappEnabled);
        setNotificationEmail(email);
        setEmailGlobalEnabled(emailEnabled);
        
        // Store original values for comparison
        setOriginalWhatsappPhone(phone);
        setOriginalWhatsappEnabled(whatsappEnabled);
        setOriginalEmail(email);
        setOriginalEmailEnabled(emailEnabled);
        
        // Mark as configured if values exist
        setWhatsappConfigured(!!phone);
        setEmailConfigured(!!email);
        
        if (settingsData.last_scheduled_scan) {
          setScanCronConfig(prev => ({ ...prev, lastRun: settingsData.last_scheduled_scan }));
        }
        
        // Load SMS settings
        const settingsAny = settingsData as any;
        setSmsEnabled(settingsAny.sms_enabled !== false);
        setSmsAsFallback(settingsAny.sms_as_fallback !== false);
      }

      // Load security alert config
      const { data: securityData, error: securityError } = await supabase
        .from('security_alert_config')
        .select('*')
        .single();

      if (securityError && securityError.code !== 'PGRST116') throw securityError;
      if (securityData) {
        setSecurityConfig(securityData as SecurityAlertConfig);
      }

      // Load notification templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('notification_templates')
        .select('*')
        .order('event_type');

      if (templatesError) {
        console.error('Error loading templates:', templatesError);
      } else {
        setTemplates((templatesData || []) as NotificationTemplate[]);
      }

      // Load logic configs
      const { data: logicData, error: logicError } = await supabase
        .from('notification_logic_config')
        .select('*');

      if (!logicError && logicData) {
        setLogicConfigs(logicData as NotificationLogicConfig[]);
        
        // Initialize state from database
        const loginConfig = logicData.find(c => c.event_type === 'login_alert');
        if (loginConfig?.config) {
          const cfg = loginConfig.config as Record<string, unknown>;
          setLoginAlertConfig({
            checkIp: cfg.checkIp as boolean ?? true,
            checkDevice: cfg.checkDevice as boolean ?? true,
            checkGeo: cfg.checkGeo as boolean ?? false,
            alertOnNewDevice: cfg.alertOnNewDevice as boolean ?? true
          });
        }

        const secScanConfig = logicData.find(c => c.event_type === 'security_alert');
        if (secScanConfig?.config) {
          const cfg = secScanConfig.config as Record<string, unknown>;
          setScanCronConfig(prev => ({
            ...prev,
            cronEnabled: cfg.cronEnabled as boolean ?? true,
            cronExpression: cfg.cronExpression as string ?? '0 3 * * *',
            alertThreshold: cfg.alertThreshold as string ?? 'warning'
          }));
        }
      }
    } catch (error: any) {
      console.error('Error loading notification settings:', error);
      toast.error('Erro ao carregar configurações de notificação');
    } finally {
      setLoading(false);
    }
  };

  const openConfirmDialog = (type: 'whatsapp' | 'email') => {
    setConfirmationType(type);
    setConfirmDialogOpen(true);
  };

  const getWhatsappChanges = () => {
    const changes: { field: string; from: string; to: string }[] = [];
    if (targetPhone !== originalWhatsappPhone) {
      changes.push({
        field: 'Número de Telefone',
        from: originalWhatsappPhone || '(não configurado)',
        to: targetPhone || '(vazio)'
      });
    }
    if (whatsappGlobalEnabled !== originalWhatsappEnabled) {
      changes.push({
        field: 'WhatsApp Global',
        from: originalWhatsappEnabled ? 'Habilitado' : 'Desabilitado',
        to: whatsappGlobalEnabled ? 'Habilitado' : 'Desabilitado'
      });
    }
    return changes;
  };

  const getEmailChanges = () => {
    const changes: { field: string; from: string; to: string }[] = [];
    if (notificationEmail !== originalEmail) {
      changes.push({
        field: 'Endereço de E-mail',
        from: originalEmail || '(não configurado)',
        to: notificationEmail || '(vazio)'
      });
    }
    if (emailGlobalEnabled !== originalEmailEnabled) {
      changes.push({
        field: 'E-mail Global',
        from: originalEmailEnabled ? 'Habilitado' : 'Desabilitado',
        to: emailGlobalEnabled ? 'Habilitado' : 'Desabilitado'
      });
    }
    return changes;
  };

  const confirmAndSave = async () => {
    setConfirmDialogOpen(false);
    if (confirmationType === 'whatsapp') {
      await savePhoneSettings();
    } else if (confirmationType === 'email') {
      await saveEmailSettings();
    }
    setConfirmationType(null);
  };

  const savePhoneSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_settings')
        .update({
          whatsapp_target_phone: targetPhone,
          whatsapp_global_enabled: whatsappGlobalEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', (await supabase.from('admin_settings').select('id').single()).data?.id);

      if (error) throw error;
      toast.success('Configurações de WhatsApp salvas');
      setWhatsappConfigured(true);
      // Update original values
      setOriginalWhatsappPhone(targetPhone);
      setOriginalWhatsappEnabled(whatsappGlobalEnabled);
    } catch (error: any) {
      console.error('Error saving phone settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const saveEmailSettings = async () => {
    setSavingEmail(true);
    try {
      const { error } = await supabase
        .from('admin_settings')
        .update({
          gmail_notification_email: notificationEmail,
          email_global_enabled: emailGlobalEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', (await supabase.from('admin_settings').select('id').single()).data?.id);

      if (error) throw error;
      toast.success('Configurações de E-mail salvas');
      setEmailConfigured(true);
      // Update original values
      setOriginalEmail(notificationEmail);
      setOriginalEmailEnabled(emailGlobalEnabled);
    } catch (error: any) {
      console.error('Error saving email settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSavingEmail(false);
    }
  };

  const togglePreference = async (id: string, field: 'email_enabled' | 'whatsapp_enabled', value: boolean) => {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;

      setPreferences(prev => 
        prev.map(p => p.id === id ? { ...p, [field]: value } : p)
      );
      
      toast.success('Preferência atualizada');
    } catch (error: any) {
      console.error('Error updating preference:', error);
      toast.error('Erro ao atualizar preferência');
    }
  };

  const openSecurityModal = () => {
    setEditingSecurityConfig(securityConfig ? { ...securityConfig } : null);
    setChangeReason('');
    setSecurityModalOpen(true);
    loadSeverityHistory();
  };

  const loadSeverityHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('security_severity_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSeverityHistory(data || []);
    } catch (error: any) {
      console.error('Error loading severity history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const saveSecurityConfig = async () => {
    if (!editingSecurityConfig || !securityConfig) return;
    
    const levelChanged = editingSecurityConfig.current_level !== securityConfig.current_level;
    
    setSavingSecurityConfig(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (levelChanged) {
        const { error: historyError } = await supabase
          .from('security_severity_history')
          .insert({
            previous_level: securityConfig.current_level,
            new_level: editingSecurityConfig.current_level,
            changed_by_user_id: user?.id || null,
            changed_by_email: user?.email || null,
            change_reason: changeReason || null
          });

        if (historyError) throw historyError;
      }

      const { error } = await supabase
        .from('security_alert_config')
        .update({
          current_level: editingSecurityConfig.current_level,
          template_critical: editingSecurityConfig.template_critical,
          template_warning: editingSecurityConfig.template_warning,
          template_secure: editingSecurityConfig.template_secure,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingSecurityConfig.id);

      if (error) throw error;
      
      setSecurityConfig(editingSecurityConfig);
      setSecurityModalOpen(false);
      setChangeReason('');
      toast.success('Configuração de alerta de segurança salva');
    } catch (error: any) {
      console.error('Error saving security config:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSavingSecurityConfig(false);
    }
  };

  const getLevelBadge = (level: string) => {
    const levelConfig = SEVERITY_LEVELS.find(l => l.value === level);
    const icons: Record<string, string> = { critical: '🔴', warning: '🟡', secure: '🟢' };
    if (!levelConfig) return <Badge variant="outline">{level}</Badge>;
    return (
      <Badge className={`${levelConfig.color} text-xs`}>
        {icons[level] || ''} {levelConfig.label}
      </Badge>
    );
  };

  // Diagnostic Function
  const runDiagnostic = async () => {
    setDiagnosticLoading(true);
    setDiagnosticResults([]);
    
    try {
      const events = [
        { type: 'new_document', label: 'Novo Documento RAG' },
        { type: 'document_failed', label: 'Falha no Processamento' },
        { type: 'new_contact_message', label: 'Nova Mensagem de Contato' },
        { type: 'security_alert', label: 'Alerta de Segurança' },
        { type: 'ml_accuracy_drop', label: 'Queda de Precisão ML' },
        { type: 'new_conversation', label: 'Nova Conversa' },
        { type: 'password_reset', label: 'Recuperação de Senha' },
        { type: 'login_alert', label: 'Alerta de Login' },
        { type: 'sentiment_alert', label: 'Alerta de Sentimento' },
        { type: 'taxonomy_anomaly', label: 'Anomalia de Taxonomia' }
      ];

      const results = [];

      // Get admin settings once
      const { data: settings } = await supabase
        .from('admin_settings')
        .select('gmail_notification_email, whatsapp_target_phone, email_global_enabled, whatsapp_global_enabled')
        .single();

      for (const event of events) {
        // Check preferences
        const { data: pref } = await supabase
          .from('notification_preferences')
          .select('email_enabled, whatsapp_enabled')
          .eq('event_type', event.type)
          .single();

        // Check template
        const { data: template } = await supabase
          .from('notification_templates')
          .select('id')
          .eq('event_type', event.type)
          .single();

        const emailGlobalEnabled = settings?.email_global_enabled !== false;
        const whatsappGlobalEnabled = settings?.whatsapp_global_enabled || false;

        // Determine conflicts
        let conflict: string | null = null;
        if (!pref) {
          conflict = 'Preferência não encontrada';
        } else if (pref.email_enabled && !settings?.gmail_notification_email) {
          conflict = 'Email habilitado mas endereço não configurado';
        } else if (pref.whatsapp_enabled && !settings?.whatsapp_target_phone) {
          conflict = 'WhatsApp habilitado mas telefone não configurado';
        } else if (pref.email_enabled && !emailGlobalEnabled) {
          conflict = 'Email do evento ativo mas global desabilitado';
        } else if (pref.whatsapp_enabled && !whatsappGlobalEnabled) {
          conflict = 'WhatsApp do evento ativo mas global desabilitado';
        }

        results.push({
          event: event.type,
          label: event.label,
          emailEnabled: (pref?.email_enabled ?? false) && emailGlobalEnabled,
          whatsappEnabled: (pref?.whatsapp_enabled ?? false) && whatsappGlobalEnabled,
          emailTarget: settings?.gmail_notification_email || '❌ Não configurado',
          whatsappTarget: settings?.whatsapp_target_phone || '❌ Não configurado',
          templateFound: !!template,
          conflict
        });
      }

      setDiagnosticResults(results);
      setShowDiagnostic(true);
      
      const conflicts = results.filter(r => r.conflict).length;
      if (conflicts === 0) {
        toast.success('Diagnóstico concluído - Nenhum conflito detectado');
      } else {
        toast.warning(`Diagnóstico concluído - ${conflicts} conflito(s) detectado(s)`);
      }
    } catch (error: any) {
      console.error('Error running diagnostic:', error);
      toast.error('Erro ao executar diagnóstico');
    } finally {
      setDiagnosticLoading(false);
    }
  };

  // Template Modal Functions
  const openTemplateModal = (eventType: string, eventLabel: string) => {
    const existingTemplate = templates.find(t => t.event_type === eventType);
    if (existingTemplate) {
      setEditingTemplate({ ...existingTemplate });
    } else {
      // Default templates with proper variables
      const defaultTemplates: Record<string, Partial<NotificationTemplate>> = {
        password_reset: {
          email_subject: '🔑 Código de Recuperação de Senha',
          email_body: 'Seu código de recuperação é: {numero_aleatorio}\n\nSolicitado por: {event_details}\nHorário: {timestamp}\n\nEste código expira em 15 minutos.',
          whatsapp_message: '🔑 Recuperação de Senha\n\nCódigo: {numero_aleatorio}\nUsuário: {event_details}\nHorário: {timestamp}\n\n⏱️ Expira em 15 minutos.',
          variables_available: ['timestamp', 'event_details', 'numero_aleatorio', 'platform_name']
        },
        login_alert: {
          email_subject: '🚨 Alerta de Login Suspeito',
          email_body: 'Alerta: Login suspeito detectado via {event_details}.\n\nSe não foi você, bloqueie sua conta imediatamente.\n\nHorário: {timestamp}',
          whatsapp_message: '🚨 Alerta de Login Suspeito\n\nDispositivo: {event_details}\nHorário: {timestamp}\n\nSe não foi você, bloqueie sua conta.',
          variables_available: ['timestamp', 'event_details', 'platform_name', 'device_info', 'ip_address']
        }
      };

      const defaultForEvent = defaultTemplates[eventType];
      
      setEditingTemplate({
        id: '',
        event_type: eventType,
        platform_name: 'KnowYOU Admin',
        email_subject: defaultForEvent?.email_subject || `Notificação: ${eventLabel}`,
        email_body: defaultForEvent?.email_body || 'Detalhes: {event_details}\n\nHorário: {timestamp}',
        whatsapp_message: defaultForEvent?.whatsapp_message || `📢 ${eventLabel}\n\n{event_details}\n\nHorário: {timestamp}`,
        variables_available: defaultForEvent?.variables_available || ['timestamp', 'event_details', 'platform_name']
      });
    }
    setTemplateModalOpen(true);
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;
    setSavingTemplate(true);

    try {
      if (editingTemplate.id) {
        const { error } = await supabase
          .from('notification_templates')
          .update({
            platform_name: editingTemplate.platform_name,
            email_subject: editingTemplate.email_subject,
            email_body: editingTemplate.email_body,
            whatsapp_message: editingTemplate.whatsapp_message
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_templates')
          .upsert({
            event_type: editingTemplate.event_type,
            platform_name: editingTemplate.platform_name,
            email_subject: editingTemplate.email_subject,
            email_body: editingTemplate.email_body,
            whatsapp_message: editingTemplate.whatsapp_message,
            variables_available: editingTemplate.variables_available
          }, { onConflict: 'event_type' });

        if (error) throw error;
      }

      const { data } = await supabase
        .from('notification_templates')
        .select('*')
        .order('event_type');
      
      setTemplates((data || []) as NotificationTemplate[]);
      setTemplateModalOpen(false);
      toast.success('Template salvo com sucesso');
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error('Erro ao salvar template');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Logic Modal Functions (Dual-Engine)
  const openLogicModal = (eventType: string) => {
    setEditingLogicEvent(eventType);
    setLogicModalOpen(true);
  };

  const saveLogicConfig = async () => {
    if (!editingLogicEvent) return;
    setSavingLogicConfig(true);

    try {
      let configData: Json = {};

      if (editingLogicEvent === 'login_alert') {
        configData = { ...loginAlertConfig } as Json;
      } else if (editingLogicEvent === 'security_alert') {
        configData = {
          cronEnabled: scanCronConfig.cronEnabled,
          cronExpression: scanCronConfig.cronExpression,
          alertThreshold: scanCronConfig.alertThreshold
        } as Json;
      } else if (editingLogicEvent === 'password_reset') {
        configData = { ...otpConfig } as Json;
      }

      // Check if config exists
      const existingConfig = logicConfigs.find(c => c.event_type === editingLogicEvent);
      
      if (existingConfig) {
        const { error } = await supabase
          .from('notification_logic_config')
          .update({ config: configData, updated_at: new Date().toISOString() })
          .eq('event_type', editingLogicEvent);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_logic_config')
          .insert([{ event_type: editingLogicEvent, config: configData }]);
        if (error) throw error;
      }

      // Refresh logic configs
      const { data } = await supabase
        .from('notification_logic_config')
        .select('*');
      if (data) setLogicConfigs(data as NotificationLogicConfig[]);

      setLogicModalOpen(false);
      toast.success('Configuração de lógica salva');
    } catch (error: any) {
      console.error('Error saving logic config:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSavingLogicConfig(false);
    }
  };

  const checkResendDomain = async () => {
    setCheckingDomain(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-resend-domain');
      
      if (error) throw error;
      
      setDomainStatus(data);
      
      if (data?.verified) {
        toast.success('Domínio Resend verificado e pronto!');
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.warning(`Domínio com status: ${data?.domain?.status || 'desconhecido'}`);
      }
      
      return data;
    } catch (error: any) {
      console.error('Error checking Resend domain:', error);
      toast.error(`Erro ao verificar domínio: ${error.message}`);
      return null;
    } finally {
      setCheckingDomain(false);
    }
  };

  const testEmail = async () => {
    setTestingEmail(true);
    try {
      const domainCheck = await checkResendDomain();
      
      if (!domainCheck?.verified) {
        toast.error(
          domainCheck?.error || 
          `Domínio não verificado (status: ${domainCheck?.domain?.status || 'desconhecido'}). Verifique em resend.com/domains`
        );
        setTestingEmail(false);
        return;
      }

      const { data: settings } = await supabase
        .from('admin_settings')
        .select('gmail_notification_email')
        .single();

      if (!settings?.gmail_notification_email) {
        toast.error('Email de notificação não configurado em Configurações');
        return;
      }

      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: settings.gmail_notification_email,
          subject: '[TESTE] Notificação do Sistema KnowYOU',
          body: 'Esta é uma mensagem de teste do sistema de notificações KnowYOU. Se você recebeu este email, as notificações estão funcionando corretamente.'
        }
      });

      if (error) throw error;
      toast.success('Email de teste enviado com sucesso!');
    } catch (error: any) {
      console.error('Error testing email:', error);
      toast.error(`Erro ao enviar email: ${error.message}`);
    } finally {
      setTestingEmail(false);
    }
  };

  const testWhatsapp = async () => {
    if (!targetPhone) {
      toast.error('Configure um número de telefone primeiro');
      return;
    }

    setTestingWhatsapp(true);
    try {
      // [v3.0] Use send-pwa-notification with OTP template for testing
      const { data, error } = await supabase.functions.invoke('send-pwa-notification', {
        body: {
          to: targetPhone,
          template: "otp",
          variables: { "1": "123456" }, // Test code
          channel: "whatsapp"
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro desconhecido');
      
      toast.success(`Teste enviado via ${data?.channel || 'WhatsApp'} com sucesso!`);
    } catch (error: any) {
      console.error('Error testing WhatsApp:', error);
      toast.error(`Erro ao enviar teste: ${error.message}`);
    } finally {
      setTestingWhatsapp(false);
    }
  };

  const testSms = async () => {
    if (!targetPhone) {
      toast.error('Configure um número de telefone primeiro');
      return;
    }

    setTestingSms(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          phoneNumber: targetPhone,
          message: '🔔 Teste de SMS KnowYOU - SMS configurado corretamente!',
          eventType: 'test_sms'
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro desconhecido');
      
      toast.success('SMS de teste enviado com sucesso!');
    } catch (error: any) {
      console.error('Error testing SMS:', error);
      toast.error(`Erro ao enviar SMS: ${error.message}`);
    } finally {
      setTestingSms(false);
    }
  };

  const saveSmsSettings = async () => {
    try {
      const { error } = await supabase
        .from('admin_settings')
        .update({
          sms_enabled: smsEnabled,
          sms_as_fallback: smsAsFallback,
          updated_at: new Date().toISOString()
        })
        .eq('id', (await supabase.from('admin_settings').select('id').single()).data?.id);

      if (error) throw error;
      toast.success('Configurações de SMS salvas');
    } catch (error: any) {
      console.error('Error saving SMS settings:', error);
      toast.error('Erro ao salvar configurações de SMS');
    }
  };

  const getCurrentSeverityBadge = () => {
    if (!securityConfig) return null;
    const level = SEVERITY_LEVELS.find(l => l.value === securityConfig.current_level);
    if (!level) return null;
    
    const icons = { critical: '🔴', warning: '🟡', secure: '🟢' };
    
    return (
      <Badge className={`${level.color} cursor-default`}>
        {icons[level.value]} {level.label}
      </Badge>
    );
  };

  const renderLogicModalContent = () => {
    if (!editingLogicEvent) return null;

    switch (editingLogicEvent) {
      case 'login_alert':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Gatilhos de Detecção</Label>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-3">
                    <Wifi className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-sm">Detectar IP desconhecido</p>
                      <p className="text-xs text-muted-foreground">Alerta quando login de IP diferente</p>
                    </div>
                  </div>
                  <Switch
                    checked={loginAlertConfig.checkIp}
                    onCheckedChange={(checked) => setLoginAlertConfig(prev => ({ ...prev, checkIp: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="font-medium text-sm">Detectar novo dispositivo</p>
                      <p className="text-xs text-muted-foreground">Alerta quando login de device novo</p>
                    </div>
                  </div>
                  <Switch
                    checked={loginAlertConfig.checkDevice}
                    onCheckedChange={(checked) => setLoginAlertConfig(prev => ({ ...prev, checkDevice: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium text-sm">Detectar nova localização geográfica</p>
                      <p className="text-xs text-muted-foreground">Alerta quando login de região diferente</p>
                    </div>
                  </div>
                  <Switch
                    checked={loginAlertConfig.checkGeo}
                    onCheckedChange={(checked) => setLoginAlertConfig(prev => ({ ...prev, checkGeo: checked }))}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-400 mb-1">Status do Backend</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="text-green-400 border-green-400/50">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> IP: Suportado
                    </Badge>
                    <Badge variant="outline" className="text-green-400 border-green-400/50">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Device: Suportado
                    </Badge>
                    <Badge variant="outline" className="text-amber-400 border-amber-400/50">
                      <XCircle className="h-3 w-3 mr-1" /> Geo: Não configurado
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'password_reset':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Regras do Código OTP</Label>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 border text-center">
                  <p className="text-3xl font-bold text-primary">{otpConfig.codeLength}</p>
                  <p className="text-xs text-muted-foreground mt-1">Dígitos</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border text-center">
                  <p className="text-3xl font-bold text-primary">{otpConfig.expirationMinutes}</p>
                  <p className="text-xs text-muted-foreground mt-1">Minutos</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border text-center">
                  <p className="text-3xl font-bold text-primary">{otpConfig.maxAttempts}</p>
                  <p className="text-xs text-muted-foreground mt-1">Tentativas</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Variáveis Disponíveis</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
                  <Badge variant="outline" className="font-mono">{'{numero_aleatorio}'}</Badge>
                  <span className="text-sm text-muted-foreground">→ Código de 6 dígitos gerado pelo sistema</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Badge variant="outline" className="font-mono">{'{event_details}'}</Badge>
                  <span className="text-sm text-muted-foreground">→ Nome/Email do usuário solicitante</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Badge variant="outline" className="font-mono">{'{timestamp}'}</Badge>
                  <span className="text-sm text-muted-foreground">→ Data/hora da solicitação</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5" />
                <p className="text-sm text-amber-200">
                  Configurações de OTP são gerenciadas via código. Use o botão de Template (⚙️) para customizar a mensagem.
                </p>
              </div>
            </div>
          </div>
        );

      case 'sentiment_alert':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Gatilhos de Sentimento</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                  <p className="text-2xl font-bold text-red-400">-0.5</p>
                  <p className="text-xs text-muted-foreground mt-1">Threshold Negativo</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border text-center">
                  <p className="text-2xl font-bold text-primary">IA</p>
                  <p className="text-xs text-muted-foreground mt-1">Análise Automática</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border text-center">
                  <p className="text-2xl font-bold text-primary">Chat</p>
                  <p className="text-xs text-muted-foreground mt-1">Fonte de Dados</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-base font-semibold">Variáveis Disponíveis</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Badge variant="outline" className="font-mono">{'{user_id}'}</Badge>
                  <span className="text-sm text-muted-foreground">→ Identificador da sessão do usuário</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Badge variant="outline" className="font-mono">{'{sentiment_score}'}</Badge>
                  <span className="text-sm text-muted-foreground">→ Score de sentimento detectado</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Badge variant="outline" className="font-mono">{'{trigger_phrase}'}</Badge>
                  <span className="text-sm text-muted-foreground">→ Frase que ativou o alerta</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'taxonomy_anomaly':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Detecção de Anomalias</Label>
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm">Sistema detecta automaticamente conflitos de tags, duplicatas e hierarquias inconsistentes.</p>
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-base font-semibold">Variáveis Disponíveis</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Badge variant="outline" className="font-mono">{'{category}'}</Badge>
                  <span className="text-sm text-muted-foreground">→ Categoria da tag afetada</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Badge variant="outline" className="font-mono">{'{conflict_reason}'}</Badge>
                  <span className="text-sm text-muted-foreground">→ Descrição do conflito</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'ml_accuracy_drop':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Threshold de Precisão</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 border text-center">
                  <p className="text-2xl font-bold text-primary">70%</p>
                  <p className="text-xs text-muted-foreground mt-1">Limite Mínimo</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border text-center">
                  <p className="text-2xl font-bold text-primary">24h</p>
                  <p className="text-xs text-muted-foreground mt-1">Cooldown Alerta</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border text-center">
                  <p className="text-2xl font-bold text-primary">7d</p>
                  <p className="text-xs text-muted-foreground mt-1">Janela Análise</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-base font-semibold">Variáveis Disponíveis</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Badge variant="outline" className="font-mono">{'{model_name}'}</Badge>
                  <span className="text-sm text-muted-foreground">→ Nome do modelo ML afetado</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Badge variant="outline" className="font-mono">{'{current_accuracy}'}</Badge>
                  <span className="text-sm text-muted-foreground">→ Precisão atual em %</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Badge variant="outline" className="font-mono">{'{drop_percentage}'}</Badge>
                  <span className="text-sm text-muted-foreground">→ Queda percentual</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'new_document':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Notificação de Documentos RAG</Label>
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-sm">Notifica quando um novo documento é processado e inserido no sistema RAG.</p>
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-base font-semibold">Variáveis Disponíveis</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Badge variant="outline" className="font-mono">{'{file_name}'}</Badge>
                  <span className="text-sm text-muted-foreground">→ Nome do arquivo processado</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Badge variant="outline" className="font-mono">{'{upload_date}'}</Badge>
                  <span className="text-sm text-muted-foreground">→ Data do upload</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'document_failed':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Falha de Processamento</Label>
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm">Alerta quando um documento falha ao ser processado pelo sistema.</p>
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-base font-semibold">Variáveis Disponíveis</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Badge variant="outline" className="font-mono">{'{file_name}'}</Badge>
                  <span className="text-sm text-muted-foreground">→ Nome do arquivo com erro</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Badge variant="outline" className="font-mono">{'{process_id}'}</Badge>
                  <span className="text-sm text-muted-foreground">→ ID do processo</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Badge variant="outline" className="font-mono">{'{error_code}'}</Badge>
                  <span className="text-sm text-muted-foreground">→ Código de erro</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'new_contact_message':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Mensagens de Contato</Label>
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-sm">Notifica quando uma nova mensagem é recebida pelo formulário de contato.</p>
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-base font-semibold">Variáveis Disponíveis</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Badge variant="outline" className="font-mono">{'{sender_name}'}</Badge>
                  <span className="text-sm text-muted-foreground">→ Nome/Email do remetente</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Badge variant="outline" className="font-mono">{'{snippet}'}</Badge>
                  <span className="text-sm text-muted-foreground">→ Prévia da mensagem</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'new_conversation':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Novas Conversas</Label>
              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <p className="text-sm">Notifica quando um usuário inicia uma nova sessão de chat.</p>
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-base font-semibold">Variáveis Disponíveis</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Badge variant="outline" className="font-mono">{'{sender_name}'}</Badge>
                  <span className="text-sm text-muted-foreground">→ Identificador do usuário</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Badge variant="outline" className="font-mono">{'{snippet}'}</Badge>
                  <span className="text-sm text-muted-foreground">→ Primeira mensagem</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'security_alert':
        return (
          <div className="space-y-6">
            {/* Severity Level Section */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Nível de Severidade Atual</Label>
              <div className="flex flex-wrap gap-2">
                {SEVERITY_LEVELS.map((level) => {
                  const icons = { critical: '🔴', warning: '🟡', secure: '🟢' };
                  const isSelected = securityConfig?.current_level === level.value;
                  
                  return (
                    <Badge
                      key={level.value}
                      className={`cursor-pointer transition-all ${level.color} ${
                        isSelected ? 'ring-2 ring-offset-2 ring-offset-background ring-primary' : 'opacity-60 hover:opacity-100'
                      }`}
                      onClick={openSecurityModal}
                    >
                      {icons[level.value]} {level.label}
                    </Badge>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Clique para configurar templates por nível</p>
            </div>

            {/* Cron Job Configuration */}
            <div className="space-y-4 border-t pt-4">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Agendamento do Scan Automático
              </Label>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-sm">Scan Habilitado</p>
                    <p className="text-xs text-muted-foreground">Execução automática de varredura</p>
                  </div>
                </div>
                <Switch
                  checked={scanCronConfig.cronEnabled}
                  onCheckedChange={(checked) => setScanCronConfig(prev => ({ ...prev, cronEnabled: checked }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select
                  value={scanCronConfig.cronExpression}
                  onValueChange={(value) => setScanCronConfig(prev => ({ ...prev, cronExpression: value }))}
                  disabled={!scanCronConfig.cronEnabled}
                >
                  <SelectTrigger className="border-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRON_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {scanCronConfig.lastRun && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Último scan: {format(new Date(scanCronConfig.lastRun), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              )}
            </div>

            {/* Alert Threshold */}
            <div className="space-y-3 border-t pt-4">
              <Label className="text-base font-semibold">Thresholds de Alerta</Label>
              
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Alertar se severidade for:</Label>
                <Select
                  value={scanCronConfig.alertThreshold}
                  onValueChange={(value) => setScanCronConfig(prev => ({ ...prev, alertThreshold: value }))}
                >
                  <SelectTrigger className="border-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Crítico apenas</SelectItem>
                    <SelectItem value="warning">Atenção ou pior</SelectItem>
                    <SelectItem value="secure">Sempre (incluindo Seguro)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {t('admin.notifications.title', 'Preferências de Notificação')}
            </h2>
            <p className="text-muted-foreground text-sm">
              Configure como você deseja receber alertas do sistema
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={runDiagnostic}
                  disabled={diagnosticLoading}
                  className="gap-2 border-amber-500/50 text-amber-500 hover:bg-amber-500/10 hover:text-white"
                >
                  {diagnosticLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Diagnóstico Geral
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Verificar configurações de todos os 10 eventos</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowTriggerMap(true)}
                  className="gap-2"
                >
                  <Map className="h-4 w-4" />
                  Mapa de Gatilhos
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver todos os gatilhos de notificação do sistema</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Diagnostic Results Dialog */}
      <Dialog open={showDiagnostic} onOpenChange={setShowDiagnostic}>
        <DialogContent className="max-w-5xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Diagnóstico Geral - Configurações de Notificação
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Verificação de configurações para todos os 10 eventos de notificação.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead className="text-center">Email</TableHead>
                    <TableHead className="text-center">WhatsApp</TableHead>
                    <TableHead>Destino Email</TableHead>
                    <TableHead>Destino WhatsApp</TableHead>
                    <TableHead className="text-center">Template</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diagnosticResults.map((result) => (
                    <TableRow key={result.event}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{result.label}</span>
                          <code className="text-xs text-muted-foreground">{result.event}</code>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {result.emailEnabled ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {result.whatsappEnabled ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {result.emailTarget.length > 25 
                            ? result.emailTarget.substring(0, 25) + '...' 
                            : result.emailTarget}
                        </code>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {result.whatsappTarget}
                        </code>
                      </TableCell>
                      <TableCell className="text-center">
                        {result.templateFound ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                            OK
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground">
                            Padrão
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.conflict ? (
                          <Badge variant="destructive" className="text-xs">
                            ⚠️ {result.conflict}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                            ✅ OK
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {diagnosticResults.length > 0 && (
                <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
                  <h4 className="font-semibold mb-2">Resumo:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Email Ativos: {diagnosticResults.filter(r => r.emailEnabled).length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-green-500" />
                      <span>WhatsApp Ativos: {diagnosticResults.filter(r => r.whatsappEnabled).length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span>Templates Custom: {diagnosticResults.filter(r => r.templateFound).length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span>Conflitos: {diagnosticResults.filter(r => r.conflict).length}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiagnostic(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trigger Map Dialog */}
      <Dialog open={showTriggerMap} onOpenChange={setShowTriggerMap}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Map className="h-5 w-5 text-primary" />
              Mapa de Gatilhos do Sistema
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Lista completa de ações e eventos que disparam notificações no sistema.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Gatilho</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Condição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <ScanSearch className="h-4 w-4 text-green-500" />
                        Scan Manual
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">security_alert</Badge></TableCell>
                    <TableCell>Admin clica "Executar Scan"</TableCell>
                    <TableCell>Sempre (info/warning/critical)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-red-500" />
                        Vulnerabilidade Crítica
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">security_alert</Badge></TableCell>
                    <TableCell>Database webhook</TableCell>
                    <TableCell>severity IN ('critical')</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-blue-500" />
                        Recuperação de Senha
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">password_reset</Badge></TableCell>
                    <TableCell>send-recovery-code Edge Function</TableCell>
                    <TableCell>Usuário solicita reset</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <LogIn className="h-4 w-4 text-amber-500" />
                        Login Suspeito
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">login_alert</Badge></TableCell>
                    <TableCell>Auth trigger</TableCell>
                    <TableCell>Novo IP/dispositivo detectado</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-purple-500" />
                        Queda ML
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">ml_accuracy_drop</Badge></TableCell>
                    <TableCell>check-ml-accuracy Edge Function</TableCell>
                    <TableCell>accuracy &lt; threshold</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-pink-500" />
                        Sentimento Negativo
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">sentiment_alert</Badge></TableCell>
                    <TableCell>Chat analysis (useChat)</TableCell>
                    <TableCell>sentiment_score &lt; -0.5</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Tags className="h-4 w-4 text-cyan-500" />
                        Anomalia de Taxonomia
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">taxonomy_anomaly</Badge></TableCell>
                    <TableCell>Classification engine</TableCell>
                    <TableCell>confidence &lt; 0.6</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        Falha de Processamento
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">document_failed</Badge></TableCell>
                    <TableCell>Edge Function catch block</TableCell>
                    <TableCell>Erro durante processamento</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-green-500" />
                        Nova Mensagem
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">new_contact_message</Badge></TableCell>
                    <TableCell>Contact form submit</TableCell>
                    <TableCell>Nova submissão</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        Nova Conversa
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">new_conversation</Badge></TableCell>
                    <TableCell>Chat session start</TableCell>
                    <TableCell>Novo session ID</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-emerald-500" />
                        Novo Documento RAG
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">new_document</Badge></TableCell>
                    <TableCell>Document processing</TableCell>
                    <TableCell>status = 'processed'</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTriggerMap(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Configuration Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Phone className="h-5 w-5 text-green-500" />
            Configuração WhatsApp
          </CardTitle>
          <CardDescription>
            Configure o número de telefone para receber notificações via WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Número de Telefone (com código do país)</Label>
            <Input
              id="phone"
              placeholder="+55 11 99999-9999"
              value={targetPhone}
              onChange={handlePhoneChange}
              disabled={whatsappConfigured}
              className={`border-blue-400/60 focus:border-blue-500 ${whatsappConfigured ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
            <p className="text-xs text-muted-foreground">
              Auto-formatado: BR (+55), US (+1), ou internacional
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Habilitar WhatsApp Globalmente</p>
                <p className="text-xs text-muted-foreground">
                  Desative para pausar todas as notificações WhatsApp
                </p>
              </div>
            </div>
            <Switch
              checked={whatsappGlobalEnabled}
              onCheckedChange={setWhatsappGlobalEnabled}
            />
          </div>

          {!whatsappGlobalEnabled && (
            <p className="text-xs text-amber-500">
              ⚠️ WhatsApp global está desabilitado. Habilite para testar.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              onClick={testWhatsapp}
              disabled={testingWhatsapp || !targetPhone || !whatsappGlobalEnabled}
              className="gap-2"
            >
              {testingWhatsapp ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar Teste WhatsApp
            </Button>
            <Button 
              onClick={() => {
                if (whatsappConfigured) {
                  setWhatsappConfigured(false);
                } else {
                  openConfirmDialog('whatsapp');
                }
              }} 
              disabled={saving}
              variant={whatsappConfigured ? "outline" : "default"}
              className={`gap-2 ${whatsappConfigured ? 'border-amber-500 text-amber-500 hover:bg-amber-500/10 hover:text-amber-600' : ''}`}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : whatsappConfigured ? (
                <Settings className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {whatsappConfigured ? 'Configurar' : 'Salvar Configuração'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Configuration Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-blue-500" />
            Configuração de E-mail
          </CardTitle>
          <CardDescription>
            Configure o endereço de e-mail para receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Endereço de E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              disabled={emailConfigured}
              className={`border-blue-400/60 focus:border-blue-500 ${emailConfigured ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Habilitar E-mail Globalmente</p>
                <p className="text-xs text-muted-foreground">
                  Desative para pausar todas as notificações por e-mail
                </p>
              </div>
            </div>
            <Switch
              checked={emailGlobalEnabled}
              onCheckedChange={setEmailGlobalEnabled}
            />
          </div>

          {domainStatus && (
            <div className={`flex items-center gap-2 p-3 rounded-lg border ${
              domainStatus.verified 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-amber-500/10 border-amber-500/30'
            }`}>
              <div className={`w-2 h-2 rounded-full ${domainStatus.verified ? 'bg-green-500' : 'bg-amber-500'}`} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${domainStatus.verified ? 'text-green-400' : 'text-amber-400'}`}>
                  {domainStatus.verified ? 'Domínio Verificado' : `Status: ${domainStatus.domain?.status || 'não verificado'}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {domainStatus.domain?.name || 'knowyou.app'} • {domainStatus.message || domainStatus.error}
                </p>
              </div>
            </div>
          )}

          {!emailGlobalEnabled && (
            <p className="text-xs text-amber-500">
              ⚠️ E-mail global está desabilitado. Habilite para testar.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              onClick={checkResendDomain}
              disabled={checkingDomain}
              className="gap-2"
            >
              {checkingDomain ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              Verificar Domínio
            </Button>
            <Button
              variant="outline"
              onClick={testEmail}
              disabled={testingEmail || !notificationEmail || !emailGlobalEnabled}
              className="gap-2"
            >
              {testingEmail ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar Teste E-mail
            </Button>
            <Button 
              onClick={() => {
                if (emailConfigured) {
                  setEmailConfigured(false);
                } else {
                  openConfirmDialog('email');
                }
              }} 
              disabled={savingEmail}
              variant={emailConfigured ? "outline" : "default"}
              className={`gap-2 ${emailConfigured ? 'border-amber-500 text-amber-500 hover:bg-amber-500/10 hover:text-amber-600' : ''}`}
            >
              {savingEmail ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : emailConfigured ? (
                <Settings className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {emailConfigured ? 'Configurar' : 'Salvar Configuração'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SMS Configuration Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-cyan-500" />
              <CardTitle className="text-lg">Configuração SMS (Fallback)</CardTitle>
            </div>
            <Badge variant={smsEnabled ? "default" : "secondary"} className={smsEnabled ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" : ""}>
              {smsEnabled ? "Ativo" : "Inativo"}
            </Badge>
          </div>
          <CardDescription>
            SMS será usado automaticamente se o WhatsApp falhar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle SMS Global */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-cyan-500" />
              <div>
                <p className="font-medium">Habilitar SMS</p>
                <p className="text-xs text-muted-foreground">
                  Ativar envio de notificações via SMS
                </p>
              </div>
            </div>
            <Switch
              checked={smsEnabled}
              onCheckedChange={(checked) => {
                setSmsEnabled(checked);
                saveSmsSettings();
              }}
            />
          </div>

          {/* Toggle Fallback Automático */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium">Fallback Automático</p>
                <p className="text-xs text-muted-foreground">
                  Se WhatsApp falhar, enviar SMS automaticamente
                </p>
              </div>
            </div>
            <Switch
              checked={smsAsFallback}
              onCheckedChange={(checked) => {
                setSmsAsFallback(checked);
                saveSmsSettings();
              }}
              disabled={!smsEnabled}
            />
          </div>

          {/* Número Twilio SMS */}
          <div className="space-y-2">
            <Label>Número Twilio SMS</Label>
            <div className="flex items-center gap-2">
              <Input
                value={twilioSmsNumber}
                disabled
                className="font-mono opacity-60"
              />
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 whitespace-nowrap">
                ✓ Configurado
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Número de origem para envio de SMS
            </p>
          </div>

          {/* Info de custos */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <DollarSign className="h-4 w-4 text-cyan-400" />
            <p className="text-xs text-cyan-400">
              Custo aproximado: $0.05 por SMS (Brasil)
            </p>
          </div>

          <div className="flex justify-end pt-2 border-t border-border">
            <Button
              variant="outline"
              onClick={testSms}
              disabled={testingSms || !targetPhone || !smsEnabled}
              className="gap-2"
            >
              {testingSms ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar SMS de Teste
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar Alterações
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você está prestes a salvar as seguintes alterações em{' '}
              <strong>{confirmationType === 'whatsapp' ? 'WhatsApp' : 'E-mail'}</strong>:
            </p>
            
            {confirmationType === 'whatsapp' && getWhatsappChanges().length > 0 && (
              <div className="space-y-2 bg-muted/50 p-3 rounded-lg border">
                {getWhatsappChanges().map((change, idx) => (
                  <div key={idx} className="text-sm">
                    <p className="font-medium text-foreground">{change.field}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-red-400 line-through">{change.from}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-green-400">{change.to}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {confirmationType === 'email' && getEmailChanges().length > 0 && (
              <div className="space-y-2 bg-muted/50 p-3 rounded-lg border">
                {getEmailChanges().map((change, idx) => (
                  <div key={idx} className="text-sm">
                    <p className="font-medium text-foreground">{change.field}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-red-400 line-through">{change.from}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-green-400">{change.to}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {((confirmationType === 'whatsapp' && getWhatsappChanges().length === 0) ||
              (confirmationType === 'email' && getEmailChanges().length === 0)) && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border text-center">
                Nenhuma alteração detectada.
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmAndSave}
              disabled={
                (confirmationType === 'whatsapp' && getWhatsappChanges().length === 0) ||
                (confirmationType === 'email' && getEmailChanges().length === 0)
              }
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirmar e Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Types by Category */}
      <TooltipProvider>
        {(['security', 'intelligence', 'system'] as const).map((category) => {
          const categoryConfig = CATEGORY_LABELS[category];
          const CategoryIcon = categoryConfig.icon;
          const categoryPrefs = preferences.filter(
            (p) => EVENT_CONFIG[p.event_type]?.category === category
          );

          if (categoryPrefs.length === 0) return null;

          return (
            <Card key={category} className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CategoryIcon className="h-5 w-5 text-primary" />
                  {categoryConfig.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {categoryPrefs.map((pref) => {
                    const eventConfig = EVENT_CONFIG[pref.event_type];
                    const IconComponent = eventConfig?.icon || Bell;
                    const hasLogicConfig = eventConfig?.hasLogicConfig;
                    const isSecurityAlert = pref.event_type === 'security_alert';
                    const isSentimentAlert = pref.event_type === 'sentiment_alert';
                    
                    return (
                      <div 
                        key={pref.id} 
                        className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
                      >
                        {/* Left: Dual-Engine Icons + Label */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Logic Icon (Shield) - Only for events with logic config */}
                          {hasLogicConfig && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openLogicModal(pref.event_type)}
                                  className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 shrink-0"
                                >
                                  <Activity className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>Regras e Gatilhos</p>
                              </TooltipContent>
                            </Tooltip>
                          )}

                          {/* Template Icon (Gear) */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openTemplateModal(pref.event_type, pref.event_label)}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-primary/10 shrink-0"
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>Personalizar Mensagem</p>
                            </TooltipContent>
                          </Tooltip>

                          {/* Event Icon and Label */}
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                            <IconComponent className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{pref.event_label}</span>
                              {isSecurityAlert && getCurrentSeverityBadge()}
                              {isSentimentAlert && (
                                <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30">
                                  IA
                                </Badge>
                              )}
                            </div>
                            {eventConfig?.description && (
                              <span className="text-xs text-muted-foreground truncate">
                                {eventConfig.description}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: Switches */}
                        <div className="flex items-center gap-4 shrink-0">
                          {/* Email Toggle */}
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-blue-500" />
                            <Switch
                              checked={pref.email_enabled}
                              onCheckedChange={(checked) => 
                                togglePreference(pref.id, 'email_enabled', checked)
                              }
                              disabled={!emailGlobalEnabled}
                            />
                          </div>

                          {/* WhatsApp Toggle */}
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-green-500" />
                            <Switch
                              checked={pref.whatsapp_enabled}
                              onCheckedChange={(checked) => 
                                togglePreference(pref.id, 'whatsapp_enabled', checked)
                              }
                              disabled={!whatsappGlobalEnabled}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </TooltipProvider>

      {/* Logic Configuration Modal (Dual-Engine) */}
      <Dialog open={logicModalOpen} onOpenChange={setLogicModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              Regras e Gatilhos: {
                editingLogicEvent === 'login_alert' ? 'Alerta de Login Suspeito' :
                editingLogicEvent === 'password_reset' ? 'Recuperação de Senha' :
                editingLogicEvent === 'security_alert' ? 'Alerta de Segurança' :
                editingLogicEvent === 'sentiment_alert' ? 'Alerta de Sentimento' :
                editingLogicEvent === 'taxonomy_anomaly' ? 'Anomalia de Taxonomia' :
                editingLogicEvent === 'ml_accuracy_drop' ? 'Queda de Precisão ML' :
                editingLogicEvent === 'new_document' ? 'Novo Documento RAG' :
                editingLogicEvent === 'document_failed' ? 'Falha no Processamento' :
                editingLogicEvent === 'new_contact_message' ? 'Nova Mensagem de Contato' :
                editingLogicEvent === 'new_conversation' ? 'Nova Conversa' :
                'Configuração'
              }
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            {renderLogicModalContent()}
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setLogicModalOpen(false)}>
              Cancelar
            </Button>
            {editingLogicEvent !== 'password_reset' && (
              <Button onClick={saveLogicConfig} disabled={savingLogicConfig}>
                {savingLogicConfig ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Security Severity Configuration Modal */}
      <Dialog open={securityModalOpen} onOpenChange={setSecurityModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Configuração de Alerta de Segurança
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            {editingSecurityConfig && (
              <div className="space-y-6">
                {/* Severity Level Selector */}
                <div className="space-y-3">
                  <Label>Nível de Alerta Atual</Label>
                  <div className="flex flex-wrap gap-2">
                    {SEVERITY_LEVELS.map((level) => {
                      const icons = { critical: '🔴', warning: '🟡', secure: '🟢' };
                      const isSelected = editingSecurityConfig.current_level === level.value;
                      
                      return (
                        <Badge
                          key={level.value}
                          className={`cursor-pointer transition-all ${level.color} ${
                            isSelected ? 'ring-2 ring-offset-2 ring-offset-background ring-primary' : 'opacity-60 hover:opacity-100'
                          }`}
                          onClick={() => setEditingSecurityConfig({
                            ...editingSecurityConfig,
                            current_level: level.value
                          })}
                        >
                          {icons[level.value]} {level.label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {/* Change Reason (only show if level changed) */}
                {securityConfig && editingSecurityConfig.current_level !== securityConfig.current_level && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Motivo da Alteração (opcional)
                    </Label>
                    <Input
                      value={changeReason}
                      onChange={(e) => setChangeReason(e.target.value)}
                      placeholder="Ex: Vulnerabilidade corrigida, Nova ameaça detectada..."
                      className="border-primary/30"
                    />
                  </div>
                )}

                {/* Message Templates */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-red-500">
                      🔴 Mensagem Crítica
                    </Label>
                    <Textarea
                      value={editingSecurityConfig.template_critical}
                      onChange={(e) => setEditingSecurityConfig({
                        ...editingSecurityConfig,
                        template_critical: e.target.value
                      })}
                      placeholder="Template para alertas críticos..."
                      className="min-h-[80px] border-red-500/30 focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-yellow-500">
                      🟡 Mensagem de Atenção
                    </Label>
                    <Textarea
                      value={editingSecurityConfig.template_warning}
                      onChange={(e) => setEditingSecurityConfig({
                        ...editingSecurityConfig,
                        template_warning: e.target.value
                      })}
                      placeholder="Template para alertas de atenção..."
                      className="min-h-[80px] border-yellow-500/30 focus:border-yellow-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-green-500">
                      🟢 Mensagem de Segurança
                    </Label>
                    <Textarea
                      value={editingSecurityConfig.template_secure}
                      onChange={(e) => setEditingSecurityConfig({
                        ...editingSecurityConfig,
                        template_secure: e.target.value
                      })}
                      placeholder="Template para status seguro..."
                      className="min-h-[80px] border-green-500/30 focus:border-green-500"
                    />
                  </div>
                </div>

                {/* History Section */}
                <div className="space-y-3 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <History className="h-4 w-4" />
                    Histórico de Alterações
                    <Badge variant="outline" className="ml-1">
                      {severityHistory.length}
                    </Badge>
                  </button>

                  {showHistory && (
                    <div className="space-y-2 mt-3">
                      {loadingHistory ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : severityHistory.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhuma alteração registrada
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {severityHistory.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-sm"
                            >
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {getLevelBadge(entry.previous_level)}
                                  <span className="text-muted-foreground">→</span>
                                  {getLevelBadge(entry.new_level)}
                                </div>
                                {entry.change_reason && (
                                  <p className="text-muted-foreground text-xs">
                                    "{entry.change_reason}"
                                  </p>
                                )}
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <User className="h-3 w-3" />
                                  <span>{entry.changed_by_email || 'Sistema'}</span>
                                  <span>•</span>
                                  <span>
                                    {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setSecurityModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveSecurityConfig} disabled={savingSecurityConfig}>
              {savingSecurityConfig ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Customization Modal */}
      <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Customizar Mensagem
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            {editingTemplate && (
              <div className="space-y-6">
                {/* Platform Name */}
                <div className="space-y-2">
                  <Label>Nome da Plataforma (remetente)</Label>
                  <Input
                    value={editingTemplate.platform_name}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      platform_name: e.target.value
                    })}
                    placeholder="KnowYOU Admin"
                    className="border-primary/30"
                  />
                </div>

                {/* Available Variables */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Variáveis Disponíveis (clique para copiar)</Label>
                  <div className="flex flex-wrap gap-2">
                    {(editingTemplate.variables_available || ['timestamp', 'event_details']).map((variable) => (
                      <Badge 
                        key={variable}
                        variant="outline" 
                        className="cursor-pointer hover:bg-primary/10 transition-colors"
                        onClick={() => {
                          navigator.clipboard.writeText(`{${variable}}`);
                          toast.success(`{${variable}} copiado!`);
                        }}
                      >
                        {`{${variable}}`}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Email Subject */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-500" />
                    Assunto do E-mail
                  </Label>
                  <Input
                    value={editingTemplate.email_subject || ''}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      email_subject: e.target.value
                    })}
                    placeholder="[KnowYOU] Notificação: {event_details}"
                    className="border-blue-400/30 focus:border-blue-500"
                  />
                </div>

                {/* Email Body */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-500" />
                    Corpo do E-mail
                  </Label>
                  <Textarea
                    value={editingTemplate.email_body || ''}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      email_body: e.target.value
                    })}
                    placeholder="Detalhes: {event_details}&#10;&#10;Horário: {timestamp}"
                    className="min-h-[120px] border-blue-400/30 focus:border-blue-500"
                  />
                </div>

                {/* WhatsApp Message */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-green-500" />
                    Mensagem WhatsApp
                  </Label>
                  <Textarea
                    value={editingTemplate.whatsapp_message || ''}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      whatsapp_message: e.target.value
                    })}
                    placeholder="📢 Notificação KnowYOU&#10;&#10;{event_details}&#10;&#10;Horário: {timestamp}"
                    className="min-h-[120px] border-green-400/30 focus:border-green-500"
                  />
                </div>

                {/* Preview Section */}
                <div className="space-y-3 border-t border-border pt-4">
                  <Label className="text-xs text-muted-foreground">Prévia (com variáveis de exemplo)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-xs text-blue-400 mb-1">E-mail</p>
                      <p className="text-sm font-medium text-foreground">
                        {(editingTemplate.email_subject || '')
                          .replace('{timestamp}', '09/12/2025 15:30')
                          .replace('{event_details}', 'Exemplo de evento')
                          .replace('{platform_name}', editingTemplate.platform_name)
                          .replace('{numero_aleatorio}', '847291')}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-xs text-green-400 mb-1">WhatsApp</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {(editingTemplate.whatsapp_message || '')
                          .replace('{timestamp}', '09/12/2025 15:30')
                          .replace('{event_details}', 'Exemplo de evento')
                          .replace('{platform_name}', editingTemplate.platform_name)
                          .replace('{numero_aleatorio}', '847291')
                          .substring(0, 100)}...
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setTemplateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveTemplate} disabled={savingTemplate}>
              {savingTemplate ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Modelo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}