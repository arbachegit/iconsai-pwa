import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MLLearningPatternsSection } from "./MLLearningPatternsSection";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { MLProcessSimulationDiagram } from "./MLProcessSimulationDiagram";
import { 
  Activity, 
  Bell, 
  Brain, 
  CheckCircle2, 
  ChevronDown, 
  Clock, 
  FileCheck, 
  HelpCircle, 
  Loader2, 
  Mail, 
  Merge, 
  PieChart, 
  Settings, 
  Sparkles, 
  Target, 
  TrendingUp, 
  X, 
  XCircle,
  Zap
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart as RechartsPie, 
  Pie, 
  Legend, 
  Area, 
  AreaChart,
  ReferenceLine
} from "recharts";

export const MLDashboardTab = () => {
  const queryClient = useQueryClient();
  const { settings: adminSettings, updateSettings } = useAdminSettings();
  
  // ML Alert configuration state
  const [mlAlertThreshold, setMlAlertThreshold] = useState<number>(70);
  const [mlAlertEmail, setMlAlertEmail] = useState<string>("");
  const [mlAlertEnabled, setMlAlertEnabled] = useState<boolean>(false);
  const [isTestingAlert, setIsTestingAlert] = useState<boolean>(false);
  const [isMlAlertConfigured, setIsMlAlertConfigured] = useState<boolean>(false);
  const [isSavingMlConfig, setIsSavingMlConfig] = useState<boolean>(false);
  const [isEnablingEdit, setIsEnablingEdit] = useState<boolean>(false);
  
  // ML Events Dashboard state
  const [mlEventsOpen, setMlEventsOpen] = useState(true);
  const [mlEventsTimeRange, setMlEventsTimeRange] = useState<number>(30);
  
  // Sync state with admin settings
  useEffect(() => {
    if (adminSettings) {
      setMlAlertThreshold((adminSettings.ml_accuracy_threshold || 0.70) * 100);
      setMlAlertEmail(adminSettings.ml_accuracy_alert_email || adminSettings.alert_email || "");
      setMlAlertEnabled(adminSettings.ml_accuracy_alert_enabled || false);
      if (adminSettings.ml_accuracy_alert_email || adminSettings.ml_accuracy_threshold) {
        setIsMlAlertConfigured(true);
      }
    }
  }, [adminSettings]);

  // Fetch tag data for metrics
  const { data: tagStats } = useQuery({
    queryKey: ["ml-tag-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_tags")
        .select("id, source, tag_name, parent_tag_id");
      
      if (error) throw error;
      
      const aiTags = (data || []).filter(t => t.source === 'ai');
      const parentTags = (data || []).filter(t => !t.parent_tag_id);
      const childTags = (data || []).filter(t => t.parent_tag_id);
      
      return {
        total: data?.length || 0,
        aiTags: aiTags.length,
        parentTags: parentTags.length,
        childTags: childTags.length,
      };
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch ML management events for dashboard
  const { data: mlEvents } = useQuery({
    queryKey: ["ml-management-events", mlEventsTimeRange],
    enabled: mlEventsOpen,
    queryFn: async () => {
      const startDate = new Date(Date.now() - mlEventsTimeRange * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("tag_management_events")
        .select("*")
        .gte("created_at", startDate)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Calculate True Positives (adoptions = validations) and False Positives (deletions = rejections)
      const adoptions = (data || []).filter(e => e.action_type === 'adopt_orphan').length;
      const deletions = (data || []).filter(e => e.action_type === 'delete_orphan').length;
      const total = adoptions + deletions;
      const accuracyRate = total > 0 ? (adoptions / total) * 100 : 0;
      
      // Aggregate by action_type
      const byType = (data || []).reduce((acc, e) => {
        acc[e.action_type] = (acc[e.action_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Calculate avg decision time per type
      const avgTimeByType = (data || []).reduce((acc, e) => {
        if (e.time_to_decision_ms) {
          if (!acc[e.action_type]) acc[e.action_type] = { total: 0, count: 0 };
          acc[e.action_type].total += e.time_to_decision_ms;
          acc[e.action_type].count += 1;
        }
        return acc;
      }, {} as Record<string, { total: number; count: number }>);
      
      // Group by day for time series
      const byDay = (data || []).reduce((acc, item) => {
        const date = new Date(item.created_at || '').toISOString().split('T')[0];
        if (!acc[date]) acc[date] = { adoptions: 0, merges: 0, deletes: 0, exports: 0, imports: 0, rejects: 0 };
        if (item.action_type === 'adopt_orphan') acc[date].adoptions++;
        if (item.action_type?.includes('merge')) acc[date].merges++;
        if (item.action_type === 'delete_orphan') acc[date].deletes++;
        if (item.action_type === 'export_taxonomy') acc[date].exports++;
        if (item.action_type === 'import_taxonomy') acc[date].imports++;
        if (item.action_type === 'reject_duplicate') acc[date].rejects++;
        return acc;
      }, {} as Record<string, { adoptions: number; merges: number; deletes: number; exports: number; imports: number; rejects: number }>);

      const timeSeriesData = Object.entries(byDay)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-14)
        .map(([date, counts]) => ({
          date: date.slice(5),
          ...counts,
          total: counts.adoptions + counts.merges + counts.deletes + counts.exports + counts.imports + counts.rejects,
          // Calculate daily accuracy percentage
          accuracyDaily: counts.adoptions + counts.deletes > 0 
            ? Math.round((counts.adoptions / (counts.adoptions + counts.deletes)) * 100) 
            : null
        }));

      // Pie chart data
      const pieData = Object.entries(byType).map(([name, value]) => {
        const labels: Record<string, { label: string; color: string }> = {
          'adopt_orphan': { label: 'Adoções', color: 'hsl(262, 83%, 58%)' },
          'merge_parent': { label: 'Merge Parent', color: 'hsl(187, 71%, 45%)' },
          'merge_child': { label: 'Merge Child', color: 'hsl(220, 70%, 50%)' },
          'delete_orphan': { label: 'Exclusões', color: 'hsl(0, 72%, 51%)' },
          'export_taxonomy': { label: 'Exports', color: 'hsl(142, 71%, 45%)' },
          'import_taxonomy': { label: 'Imports', color: 'hsl(38, 92%, 50%)' },
          'reject_duplicate': { label: 'Rejeições', color: 'hsl(330, 81%, 60%)' },
          'reassign_orphan': { label: 'Reassignments', color: 'hsl(280, 65%, 60%)' }
        };
        return {
          name: labels[name]?.label || name,
          value,
          fill: labels[name]?.color || 'hsl(220, 10%, 50%)'
        };
      }).filter(d => d.value > 0);

      // Bar chart data for decision time
      const decisionTimeData = Object.entries(avgTimeByType).map(([type, { total, count }]) => {
        const labels: Record<string, string> = {
          'adopt_orphan': 'Adoção',
          'merge_parent': 'Merge P.',
          'merge_child': 'Merge C.',
          'delete_orphan': 'Exclusão',
          'reject_duplicate': 'Rejeição'
        };
        return {
          name: labels[type] || type,
          avgTime: Math.round(total / count),
          count
        };
      });

      // Aggregate merge reasons from user_decision
      const mergeReasonsCounts = {
        synonymy: 0,
        grammaticalVariation: 0,
        spellingVariation: 0,
        acronym: 0,
        typo: 0,
        languageEquivalence: 0,
        generalization: 0
      };
      
      let totalMergesWithReasons = 0;
      let autoSuggestionAccepted = 0;
      let autoSuggestionModified = 0;
      let autoSuggestionIgnored = 0;
      
      (data || []).forEach(event => {
        if (event.action_type?.includes('merge') && event.user_decision) {
          const decision = typeof event.user_decision === 'string' 
            ? JSON.parse(event.user_decision) 
            : event.user_decision;
          
          if (decision.merge_reasons) {
            totalMergesWithReasons++;
            if (decision.merge_reasons.synonymy) mergeReasonsCounts.synonymy++;
            if (decision.merge_reasons.grammaticalVariation) mergeReasonsCounts.grammaticalVariation++;
            if (decision.merge_reasons.spellingVariation) mergeReasonsCounts.spellingVariation++;
            if (decision.merge_reasons.acronym) mergeReasonsCounts.acronym++;
            if (decision.merge_reasons.typo) mergeReasonsCounts.typo++;
            if (decision.merge_reasons.languageEquivalence) mergeReasonsCounts.languageEquivalence++;
            if (decision.merge_reasons.generalization) mergeReasonsCounts.generalization++;
          }
          
          if (decision.auto_suggestion_status) {
            if (decision.auto_suggestion_status === 'accepted') autoSuggestionAccepted++;
            if (decision.auto_suggestion_status === 'modified') autoSuggestionModified++;
            if (decision.auto_suggestion_status === 'ignored') autoSuggestionIgnored++;
          }
        }
      });

      const mergeReasonsData = [
        { name: 'Sinonímia', count: mergeReasonsCounts.synonymy, fill: 'hsl(262, 83%, 58%)' },
        { name: 'Var. Gramatical', count: mergeReasonsCounts.grammaticalVariation, fill: 'hsl(187, 71%, 45%)' },
        { name: 'Var. Grafia', count: mergeReasonsCounts.spellingVariation, fill: 'hsl(220, 70%, 50%)' },
        { name: 'Siglas', count: mergeReasonsCounts.acronym, fill: 'hsl(38, 92%, 50%)' },
        { name: 'Digitação', count: mergeReasonsCounts.typo, fill: 'hsl(0, 72%, 51%)' },
        { name: 'Idioma', count: mergeReasonsCounts.languageEquivalence, fill: 'hsl(280, 65%, 60%)' },
        { name: 'Generalização', count: mergeReasonsCounts.generalization, fill: 'hsl(142, 71%, 45%)' },
      ].filter(d => d.count > 0);

      const totalAutoSuggestions = autoSuggestionAccepted + autoSuggestionModified + autoSuggestionIgnored;
      
      return {
        total: data?.length || 0,
        adoptions,
        deletions,
        accuracyRate,
        byType,
        pieData,
        decisionTimeData,
        timeSeriesData,
        mergeReasonsData,
        totalMergesWithReasons,
        autoSuggestionStats: {
          accepted: autoSuggestionAccepted,
          modified: autoSuggestionModified,
          ignored: autoSuggestionIgnored,
          total: totalAutoSuggestions,
          acceptanceRate: totalAutoSuggestions > 0 
            ? Math.round((autoSuggestionAccepted / totalAutoSuggestions) * 100) 
            : 0
        },
        recentEvents: data?.slice(0, 10) || []
      };
    },
  });

  // Fetch routing analytics for accuracy comparison
  const { data: routingAnalytics } = useQuery({
    queryKey: ["ml-routing-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_routing_log")
        .select("*")
        .in("action_type", ["ml_accepted", "ml_rejected", "chat_change"])
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      
      const mlAccepted = data?.filter(d => d.action_type === "ml_accepted").length || 0;
      const mlRejected = data?.filter(d => d.action_type === "ml_rejected").length || 0;
      const totalML = mlAccepted + mlRejected;
      const accuracyRate = totalML > 0 ? (mlAccepted / totalML) * 100 : 0;

      const byDay = data?.reduce((acc, item) => {
        const date = new Date(item.created_at || '').toISOString().split('T')[0];
        if (!acc[date]) acc[date] = { accepted: 0, rejected: 0 };
        if (item.action_type === "ml_accepted") acc[date].accepted++;
        if (item.action_type === "ml_rejected") acc[date].rejected++;
        return acc;
      }, {} as Record<string, { accepted: number; rejected: number }>) || {};

      const timeSeriesData = Object.entries(byDay)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-14)
        .map(([date, counts]) => ({
          date: date.slice(5),
          aceitos: counts.accepted,
          rejeitados: counts.rejected,
          total: counts.accepted + counts.rejected,
          taxa: counts.accepted + counts.rejected > 0 
            ? Math.round((counts.accepted / (counts.accepted + counts.rejected)) * 100) 
            : 0
        }));

      return {
        mlAccepted,
        mlRejected,
        totalML,
        accuracyRate,
        timeSeriesData,
        recentLogs: data?.slice(0, 10) || []
      };
    },
  });

  // Handler functions for ML Alert
  const handleSaveMlAlertConfig = async () => {
    setIsSavingMlConfig(true);
    try {
      await updateSettings({
        ml_accuracy_threshold: mlAlertThreshold / 100,
        ml_accuracy_alert_enabled: mlAlertEnabled,
        ml_accuracy_alert_email: mlAlertEmail || null,
      });
      toast.success("Configurações de alerta ML salvas!");
      setIsMlAlertConfigured(true);
    } catch (error: any) {
      toast.error(`Erro ao salvar configurações: ${error.message}`);
    } finally {
      setIsSavingMlConfig(false);
    }
  };

  const handleEditMlAlertConfig = async () => {
    setIsEnablingEdit(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsMlAlertConfigured(false);
    setIsEnablingEdit(false);
  };

  const handleTestMlAlert = async () => {
    setIsTestingAlert(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-ml-accuracy");
      if (error) throw error;
      
      if (data?.message === "Alerts disabled") {
        toast.info("Alertas ML desativados. Ative para testar.");
      } else if (data?.message === "No alert email configured") {
        toast.warning("Configure um email de alerta primeiro.");
      } else if (data?.message === "Alert email sent") {
        toast.success(`Email de alerta enviado! Taxa: ${(data.accuracyRate * 100).toFixed(1)}%`);
      } else if (data?.message === "Accuracy OK") {
        toast.success(`Taxa OK (${(data.accuracyRate * 100).toFixed(1)}%) - acima do threshold (${(data.threshold * 100).toFixed(0)}%)`);
      } else {
        toast.info(data?.message || "Verificação concluída");
      }
    } catch (error: any) {
      toast.error(`Erro ao testar alerta: ${error.message}`);
    } finally {
      setIsTestingAlert(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminTitleWithInfo
        title="Machine Learning - Auditoria"
        level="h1"
        tooltipText="Ver ciclo de aprendizado ML"
        infoContent={
          <div className="space-y-4">
            {/* Step-by-step ML Simulation Diagram */}
            <MLProcessSimulationDiagram activityLevel={Math.min(1, (mlEvents?.total || 0) / 50)} />
            
            {/* Real-time stats badges */}
            <div className="flex items-center justify-center gap-3 pt-2 border-t border-border/50">
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 font-medium">
                Eventos: {mlEvents?.total || 0}
              </span>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30 font-medium">
                Regras: {(mlEvents?.byType?.merge_parent || 0) + (mlEvents?.byType?.merge_child || 0)}
              </span>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium border ${
                (mlEvents?.accuracyRate || 0) >= 70 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}>
                Score: {(mlEvents?.accuracyRate || 0).toFixed(0)}%
              </span>
            </div>
          </div>
        }
      />

      {/* SCORECARD DE DESEMPENHO DE TAGS (NEW) */}
      <Card className="p-6 border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 to-green-500/5">
        <div className="flex items-center gap-2 mb-6">
          <Target className="h-5 w-5 text-emerald-400" />
          <h3 className="font-semibold text-lg">Scorecard de Desempenho de Tags</h3>
          <Badge variant="outline" className="ml-2 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
            Score de Aceite
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground mb-6">
          Métricas de quantificação do desempenho da IA na definição de tags. 
          <strong> Acertos</strong> = tags IA validadas (adoções). 
          <strong> Erros</strong> = tags IA rejeitadas (exclusões).
        </p>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-background/50 rounded-lg border border-green-500/30">
            <div className="text-3xl font-bold text-green-400">
              {mlEvents?.adoptions || 0}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Contagem de Acertos</div>
            <div className="text-xs text-green-400/70 mt-1">True Positives</div>
          </div>
          <div className="text-center p-4 bg-background/50 rounded-lg border border-red-500/30">
            <div className="text-3xl font-bold text-red-400">
              {mlEvents?.deletions || 0}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Contagem de Erros</div>
            <div className="text-xs text-red-400/70 mt-1">False Positives</div>
          </div>
          <div className="text-center p-4 bg-background/50 rounded-lg border border-emerald-500/30">
            <div className={`text-3xl font-bold ${
              (mlEvents?.accuracyRate || 0) >= 70 ? 'text-emerald-400' :
              (mlEvents?.accuracyRate || 0) >= 40 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {(mlEvents?.accuracyRate || 0).toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground mt-1">Percentual de Aprendizado</div>
            <div className="text-xs text-muted-foreground mt-1">Acertos / (Acertos + Erros)</div>
          </div>
          <div className="text-center p-4 bg-background/50 rounded-lg border">
            <div className="text-3xl font-bold text-cyan-400">
              {(mlEvents?.adoptions || 0) + (mlEvents?.deletions || 0)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Total Avaliadas</div>
            <div className="text-xs text-muted-foreground mt-1">Base de cálculo</div>
          </div>
        </div>

        {/* Accuracy Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Performance da IA</span>
            <span className={`font-medium ${
              (mlEvents?.accuracyRate || 0) >= 70 ? 'text-emerald-400' :
              (mlEvents?.accuracyRate || 0) >= 40 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {(mlEvents?.accuracyRate || 0).toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                (mlEvents?.accuracyRate || 0) >= 70 ? 'bg-emerald-500' :
                (mlEvents?.accuracyRate || 0) >= 40 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${mlEvents?.accuracyRate || 0}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Quanto maior a taxa, melhor a precisão da IA na categorização automática de documentos.
          </p>
        </div>

        {/* Trend Chart - Percentual de Aprendizado ao Longo do Tempo */}
        {mlEvents?.timeSeriesData && mlEvents.timeSeriesData.filter((d: { accuracyDaily: number | null }) => d.accuracyDaily !== null).length >= 3 && (
          <div className="mt-6 p-4 bg-background/30 rounded-lg border border-emerald-500/20">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Tendência do Percentual de Aprendizado
              <Badge variant="outline" className="ml-2 text-xs bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                Últimos 14 dias
              </Badge>
            </h4>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mlEvents.timeSeriesData.filter((d: { accuracyDaily: number | null }) => d.accuracyDaily !== null)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis 
                    domain={[0, 100]} 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={10}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [`${value}%`, 'Percentual de Aprendizado']}
                  />
                  <defs>
                    <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="accuracyDaily" 
                    stroke="hsl(142, 71%, 45%)" 
                    fill="url(#accuracyGradient)"
                    strokeWidth={2}
                    name="% Aprendizado"
                  />
                  <ReferenceLine 
                    y={70} 
                    stroke="hsl(38, 92%, 50%)" 
                    strokeDasharray="5 5" 
                    label={{ value: 'Meta 70%', fill: 'hsl(38, 92%, 50%)', fontSize: 10, position: 'right' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Evolução diária do percentual de acertos da IA. A linha pontilhada indica a meta de 70% de precisão.
            </p>
          </div>
        )}
      </Card>

      {/* ML EVENTS DASHBOARD - TREINAMENTO (MOVED WITHOUT MODIFICATION) */}
      <Collapsible open={mlEventsOpen} onOpenChange={setMlEventsOpen}>
        <Card className="p-4 border-indigo-500/30 bg-gradient-to-r from-indigo-500/5 to-violet-500/5">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-400" />
              <h3 className="font-semibold text-lg">Dashboard de Eventos ML - Treinamento</h3>
              <Badge variant="outline" className="ml-2 bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                {mlEvents?.total || 0} eventos
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Select value={mlEventsTimeRange.toString()} onValueChange={(v) => setMlEventsTimeRange(Number(v))}>
                <SelectTrigger className="w-[140px] h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
              <ChevronDown className={`h-4 w-4 transition-transform ${mlEventsOpen ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center p-4 bg-background/50 rounded-lg border">
                <div className="text-2xl font-bold text-indigo-400">{mlEvents?.total || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Eventos</div>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-lg border">
                <div className="text-2xl font-bold text-purple-400">{mlEvents?.byType?.['adopt_orphan'] || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Adoções</div>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-lg border">
                <div className="text-2xl font-bold text-cyan-400">
                  {(mlEvents?.byType?.['merge_parent'] || 0) + (mlEvents?.byType?.['merge_child'] || 0)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Merges</div>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-lg border">
                <div className="text-2xl font-bold text-red-400">{mlEvents?.byType?.['delete_orphan'] || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Exclusões</div>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-lg border">
                <div className="text-2xl font-bold text-amber-400">{mlEvents?.byType?.['reject_duplicate'] || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Rejeições</div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-6">
              {/* Pie Chart - Distribution by Action Type */}
              {mlEvents?.pieData && mlEvents.pieData.length > 0 && (
                <div className="p-4 bg-background/30 rounded-lg border">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-indigo-400" />
                    Distribuição por Tipo de Ação
                  </h4>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={mlEvents.pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {mlEvents.pieData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Bar Chart - Average Decision Time */}
              {mlEvents?.decisionTimeData && mlEvents.decisionTimeData.length > 0 && (
                <div className="p-4 bg-background/30 rounded-lg border">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-400" />
                    Tempo Médio de Decisão (ms)
                  </h4>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mlEvents.decisionTimeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value: number, _name: string, props: any) => [
                            `${value}ms (${props.payload.count} decisões)`,
                            'Tempo médio'
                          ]}
                        />
                        <Bar dataKey="avgTime" fill="hsl(239, 84%, 67%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Time Series Chart */}
            {mlEvents?.timeSeriesData && mlEvents.timeSeriesData.length > 0 && (
              <div className="p-4 bg-background/30 rounded-lg border">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-indigo-400" />
                  Evolução Temporal de Eventos
                </h4>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mlEvents.timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Area type="monotone" dataKey="adoptions" stackId="1" stroke="hsl(262, 83%, 58%)" fill="hsl(262, 83%, 58%)" fillOpacity={0.6} name="Adoções" />
                      <Area type="monotone" dataKey="merges" stackId="1" stroke="hsl(187, 71%, 45%)" fill="hsl(187, 71%, 45%)" fillOpacity={0.6} name="Merges" />
                      <Area type="monotone" dataKey="deletes" stackId="1" stroke="hsl(0, 72%, 51%)" fill="hsl(0, 72%, 51%)" fillOpacity={0.6} name="Exclusões" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(262, 83%, 58%)' }}></span> Adoções
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(187, 71%, 45%)' }}></span> Merges
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(0, 72%, 51%)' }}></span> Exclusões
                  </span>
                </div>
              </div>
            )}

            {/* Merge Reasons Distribution Chart */}
            {mlEvents?.mergeReasonsData && mlEvents.mergeReasonsData.length > 0 && (
              <div className="p-4 bg-background/30 rounded-lg border border-cyan-500/20">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Merge className="h-4 w-4 text-cyan-400" />
                  Motivos de Unificação (Data Science)
                  <Badge variant="outline" className="ml-2 text-xs bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
                    {mlEvents.totalMergesWithReasons} merges categorizados
                  </Badge>
                </h4>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mlEvents.mergeReasonsData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={11} 
                        width={100}
                        tick={{ fill: 'hsl(var(--foreground))' }}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: number) => [`${value} ocorrências`, 'Contagem']}
                      />
                      <Bar 
                        dataKey="count" 
                        radius={[0, 4, 4, 0]}
                      >
                        {mlEvents.mergeReasonsData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 p-2 bg-cyan-500/5 rounded-lg border border-cyan-500/10">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-cyan-300">Taxonomia DS:</strong> Sinonímia, Variação Gramatical (Lematização), 
                    Variação de Grafia, Siglas/Acrônimos, Erros de Digitação, Equivalência de Idioma, Generalização Hierárquica.
                  </p>
                </div>
              </div>
            )}

            {/* Auto-Suggestion Statistics */}
            {mlEvents?.autoSuggestionStats && mlEvents.autoSuggestionStats.total > 0 && (
              <div className="p-4 bg-background/30 rounded-lg border border-purple-500/20">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  Estatísticas de Auto-Sugestão (Heurísticas)
                  <Badge variant="outline" className="ml-2 text-xs bg-purple-500/10 text-purple-300 border-purple-500/30">
                    {mlEvents.autoSuggestionStats.total} merges analisados
                  </Badge>
                </h4>
                
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                    <div className="text-2xl font-bold text-green-400">{mlEvents.autoSuggestionStats.accepted}</div>
                    <div className="text-xs text-muted-foreground">Aceitas</div>
                    <div className="text-[10px] text-green-400/80">100% como sugerido</div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center">
                    <div className="text-2xl font-bold text-amber-400">{mlEvents.autoSuggestionStats.modified}</div>
                    <div className="text-xs text-muted-foreground">Modificadas</div>
                    <div className="text-[10px] text-amber-400/80">Ajustadas pelo admin</div>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                    <div className="text-2xl font-bold text-red-400">{mlEvents.autoSuggestionStats.ignored}</div>
                    <div className="text-xs text-muted-foreground">Ignoradas</div>
                    <div className="text-[10px] text-red-400/80">Seleção manual</div>
                  </div>
                </div>
                
                {/* Acceptance Rate Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Taxa de Aceitação</span>
                    <span className={`font-medium ${
                      mlEvents.autoSuggestionStats.acceptanceRate >= 70 ? 'text-green-400' :
                      mlEvents.autoSuggestionStats.acceptanceRate >= 40 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {mlEvents.autoSuggestionStats.acceptanceRate}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        mlEvents.autoSuggestionStats.acceptanceRate >= 70 ? 'bg-green-500' :
                        mlEvents.autoSuggestionStats.acceptanceRate >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${mlEvents.autoSuggestionStats.acceptanceRate}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Quanto maior a taxa, melhor a precisão das heurísticas (Levenshtein, regex plural, detecção de siglas).
                  </p>
                </div>
              </div>
            )}

            {mlEvents?.recentEvents && mlEvents.recentEvents.length > 0 && (
              <div className="p-4 bg-background/30 rounded-lg border">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-indigo-400" />
                  Últimos Eventos de Treinamento
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Data/Hora</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Detalhes</TableHead>
                        <TableHead className="text-right w-[100px]">Tempo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mlEvents.recentEvents.slice(0, 10).map((event: any) => {
                        const actionLabels: Record<string, { label: string; color: string }> = {
                          'adopt_orphan': { label: 'Adoção', color: 'text-purple-400' },
                          'merge_parent': { label: 'Merge Parent', color: 'text-cyan-400' },
                          'merge_child': { label: 'Merge Child', color: 'text-blue-400' },
                          'delete_orphan': { label: 'Exclusão', color: 'text-red-400' },
                          'export_taxonomy': { label: 'Export', color: 'text-green-400' },
                          'import_taxonomy': { label: 'Import', color: 'text-amber-400' },
                          'reject_duplicate': { label: 'Rejeição', color: 'text-pink-400' },
                          'reassign_orphan': { label: 'Reassign', color: 'text-violet-400' }
                        };
                        const action = actionLabels[event.action_type] || { label: event.action_type, color: 'text-muted-foreground' };
                        
                        let details = '-';
                        try {
                          const decision = typeof event.user_decision === 'string' 
                            ? JSON.parse(event.user_decision) 
                            : event.user_decision;
                          if (decision.target_tag_name) {
                            details = `→ ${decision.target_tag_name}`;
                          } else if (decision.exported_count) {
                            details = `${decision.exported_count} tags`;
                          } else if (decision.imported_count) {
                            details = `${decision.imported_count} tags`;
                          }
                        } catch (e) {
                          // Ignore parse errors
                        }

                        return (
                          <TableRow key={event.id}>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(event.created_at).toLocaleString('pt-BR', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${action.color}`}>
                                {action.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm truncate max-w-[200px]">
                              {details}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {event.time_to_decision_ms ? `${event.time_to_decision_ms}ms` : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Empty State */}
            {(!mlEvents || mlEvents.total === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum evento de treinamento ML registrado no período selecionado.</p>
                <p className="text-xs mt-1">Eventos são criados ao realizar merge, adoção ou exclusão de tags.</p>
              </div>
            )}
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ML ALERT CONFIGURATION (MOVED WITHOUT MODIFICATION) */}
      <Card className="p-6 border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-amber-400" />
          <h3 className="font-semibold text-lg">Configuração de Alertas ML</h3>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          Configure notificações por email quando a taxa de acerto ML cair abaixo do threshold.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="ml-alert-enabled">Alertas Habilitados</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Quando habilitado, envia email se a taxa de acerto cair abaixo do threshold (verificação a cada 24h)
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="ml-alert-enabled"
                checked={mlAlertEnabled}
                onCheckedChange={setMlAlertEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ml-alert-threshold">Threshold Mínimo (%)</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="ml-alert-threshold"
                  type="number"
                  min={0}
                  max={100}
                  value={mlAlertThreshold}
                  onChange={(e) => setMlAlertThreshold(Number(e.target.value))}
                  className="w-24"
                  disabled={isMlAlertConfigured}
                />
                <span className="text-sm text-muted-foreground">
                  Alerta quando taxa &lt; {mlAlertThreshold}%
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ml-alert-email">Email de Alerta</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="ml-alert-email"
                  type="email"
                  placeholder="admin@empresa.com"
                  value={mlAlertEmail}
                  onChange={(e) => setMlAlertEmail(e.target.value)}
                  className="flex-1"
                  disabled={isMlAlertConfigured}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-background/50 rounded-lg border">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Status Atual
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Alertas:</span>
                  <Badge variant={mlAlertEnabled ? "default" : "secondary"}>
                    {mlAlertEnabled ? "Ativo" : "Desativado"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Threshold:</span>
                  <span>{mlAlertThreshold}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa Atual:</span>
                  <Badge variant={
                    routingAnalytics && routingAnalytics.accuracyRate >= mlAlertThreshold 
                      ? "default" 
                      : "destructive"
                  }>
                    {routingAnalytics?.accuracyRate?.toFixed(1) || 0}%
                  </Badge>
                </div>
                {adminSettings?.ml_accuracy_last_alert && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Último Alerta:</span>
                    <span className="text-xs">
                      {new Date(adminSettings.ml_accuracy_last_alert).toLocaleString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {isMlAlertConfigured ? (
                <Button 
                  onClick={handleEditMlAlertConfig}
                  variant="outline"
                  className="flex-1"
                  disabled={isEnablingEdit}
                >
                  {isEnablingEdit ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Habilitando...
                    </>
                  ) : (
                    <>
                      <Settings className="h-4 w-4 mr-2" />
                      Configurar
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={handleSaveMlAlertConfig}
                  className="flex-1"
                  disabled={isSavingMlConfig}
                >
                  {isSavingMlConfig ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Configurações"
                  )}
                </Button>
              )}
              <Button 
                variant="outline"
                onClick={handleTestMlAlert}
                disabled={isTestingAlert}
              >
                {isTestingAlert ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Testar Alerta"
                )}
              </Button>
            </div>
          </div>
        </div>
    </Card>

      {/* ML Learning Patterns Section - FASE 3 */}
      <MLLearningPatternsSection />
    </div>
  );
};

export default MLDashboardTab;
