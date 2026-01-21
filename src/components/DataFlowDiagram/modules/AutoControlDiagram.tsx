import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, Cpu, RefreshCw, Shield, Activity, 
  CheckCircle2, AlertTriangle, XCircle, 
  Volume2, VolumeX, MessageCircle, Eye, Wrench, 
  Database, Clock, TrendingUp, Info, X, Loader2
} from "lucide-react";
import { useVoiceNarration } from "@/hooks/useVoiceNarration";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Types
type RobotStatus = "running" | "idle" | "repairing" | "error";
type RobotType = "collector" | "processor" | "analyzer" | "monitor" | "guardian";
type EventType = "info" | "warning" | "error" | "success";

interface Robot {
  id: string;
  name: string;
  type: RobotType;
  icon: React.ElementType;
  description: string;
  status: RobotStatus;
  health: number;
  cpu: number;
  ram: number;
  network: number;
  tasksCompleted: number;
  lastCheck: Date;
}

interface LogEvent {
  id: string;
  timestamp: Date;
  type: EventType;
  robotId: string;
  message: string;
}

// Color systems
const robotTypeColors: Record<RobotType, { bg: string; border: string; text: string; accent: string }> = {
  collector: { bg: "from-blue-500/20 to-cyan-500/20", border: "border-blue-500/50", text: "text-blue-400", accent: "#3B82F6" },
  processor: { bg: "from-purple-500/20 to-pink-500/20", border: "border-purple-500/50", text: "text-purple-400", accent: "#A855F7" },
  analyzer: { bg: "from-amber-500/20 to-orange-500/20", border: "border-amber-500/50", text: "text-amber-400", accent: "#F59E0B" },
  monitor: { bg: "from-emerald-500/20 to-teal-500/20", border: "border-emerald-500/50", text: "text-emerald-400", accent: "#10B981" },
  guardian: { bg: "from-red-500/20 to-rose-500/20", border: "border-red-500/50", text: "text-red-400", accent: "#EF4444" }
};

const statusColors: Record<RobotStatus, { bg: string; text: string; label: string }> = {
  running: { bg: "bg-green-500", text: "text-green-400", label: "Executando" },
  idle: { bg: "bg-gray-500", text: "text-gray-400", label: "Ocioso" },
  repairing: { bg: "bg-amber-500", text: "text-amber-400", label: "Reparando" },
  error: { bg: "bg-red-500", text: "text-red-400", label: "Erro" }
};

const eventTypeConfig: Record<EventType, { icon: React.ElementType; color: string }> = {
  info: { icon: Info, color: "text-blue-400" },
  warning: { icon: AlertTriangle, color: "text-amber-400" },
  error: { icon: XCircle, color: "text-red-400" },
  success: { icon: CheckCircle2, color: "text-green-400" }
};

// Initial robots data
const createInitialRobots = (): Robot[] => [
  { id: "collector-1", name: "Coletor IBGE", type: "collector", icon: Database, description: "Coleta dados do IBGE SIDRA", status: "running", health: 95, cpu: 45, ram: 60, network: 30, tasksCompleted: 1247, lastCheck: new Date() },
  { id: "collector-2", name: "Coletor BCB", type: "collector", icon: Database, description: "Coleta dados do Banco Central", status: "running", health: 88, cpu: 52, ram: 55, network: 40, tasksCompleted: 892, lastCheck: new Date() },
  { id: "processor-1", name: "Processador RAG", type: "processor", icon: Cpu, description: "Processa documentos para RAG", status: "running", health: 92, cpu: 78, ram: 70, network: 25, tasksCompleted: 3421, lastCheck: new Date() },
  { id: "analyzer-1", name: "Analisador Semântico", type: "analyzer", icon: Eye, description: "Análise semântica de textos", status: "idle", health: 100, cpu: 10, ram: 30, network: 5, tasksCompleted: 2156, lastCheck: new Date() },
  { id: "monitor-1", name: "Monitor de APIs", type: "monitor", icon: Activity, description: "Monitora saúde das APIs", status: "running", health: 85, cpu: 35, ram: 45, network: 60, tasksCompleted: 15782, lastCheck: new Date() },
  { id: "guardian-1", name: "Guardião de Segurança", type: "guardian", icon: Shield, description: "Protege contra ameaças", status: "running", health: 97, cpu: 25, ram: 40, network: 15, tasksCompleted: 456, lastCheck: new Date() }
];

// MetricBar component
const MetricBar: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[10px] text-gray-400">
      <span>{label}</span>
      <span>{value.toFixed(0)}%</span>
    </div>
    <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
      <motion.div
        className={cn(
          "h-full rounded-full",
          value >= 80 ? "bg-red-500" : value >= 60 ? "bg-amber-500" : "bg-emerald-500"
        )}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.5 }}
      />
    </div>
  </div>
);

// RobotCard component
const RobotCard: React.FC<{ robot: Robot; onClick: (robot: Robot) => void }> = ({ robot, onClick }) => {
  const colors = robotTypeColors[robot.type];
  const status = statusColors[robot.status];
  const Icon = robot.icon;

  const healthColor = robot.health >= 90 ? "bg-green-500" : robot.health >= 70 ? "bg-amber-500" : "bg-red-500";

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(robot)}
      className={cn(
        "p-4 rounded-xl border bg-gradient-to-br cursor-pointer transition-shadow hover:shadow-lg hover:shadow-black/20",
        colors.bg, colors.border
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <motion.div
          animate={robot.status === "repairing" ? { rotate: 360 } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className={cn("p-2 rounded-lg bg-black/20", colors.border)}
        >
          <Icon className={cn("w-6 h-6", colors.text)} />
        </motion.div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm truncate">{robot.name}</h3>
          <Badge className={cn("text-[10px] px-1.5 py-0", status.bg)}>
            <span className="flex items-center gap-1">
              {robot.status === "running" && (
                <motion.span
                  className="w-1.5 h-1.5 rounded-full bg-white"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              {status.label}
            </span>
          </Badge>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-400 mt-2 line-clamp-1">{robot.description}</p>

      {/* Health bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">Saúde</span>
          <span className={cn("font-medium", robot.health >= 90 ? "text-green-400" : robot.health >= 70 ? "text-amber-400" : "text-red-400")}>
            {robot.health.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", healthColor)}
            initial={{ width: 0 }}
            animate={{ width: `${robot.health}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <MetricBar label="CPU" value={robot.cpu} />
        <MetricBar label="RAM" value={robot.ram} />
        <MetricBar label="NET" value={robot.network} />
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          {robot.tasksCompleted.toLocaleString()}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {robot.lastCheck.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </motion.div>
  );
};

// CentralBrain component
const CentralBrain: React.FC<{ robots: Robot[] }> = ({ robots }) => {
  const activeCount = robots.filter(r => r.status === "running").length;
  const avgHealth = robots.reduce((sum, r) => sum + r.health, 0) / robots.length;

  return (
    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
      <h3 className="font-semibold text-white mb-4 text-sm">Central Brain</h3>

      <div className="relative w-44 h-44 mx-auto">
        {/* Outer rotating ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-500/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />

        {/* Middle ring */}
        <div className="absolute inset-4 rounded-full border border-emerald-500/20" />

        {/* Central circle */}
        <div className="absolute inset-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/50 flex items-center justify-center flex-col">
          <Bot className="w-8 h-8 text-emerald-400" />
          <span className="text-lg font-bold text-white">{activeCount}/6</span>
          <span className="text-[10px] text-gray-400">Ativos</span>
        </div>

        {/* Robot dots on the border */}
        {robots.map((robot, index) => {
          const angle = (index / 6) * 2 * Math.PI - Math.PI / 2;
          const x = 88 + Math.cos(angle) * 72;
          const y = 88 + Math.sin(angle) * 72;

          return (
            <Tooltip key={robot.id}>
              <TooltipTrigger asChild>
                <motion.div
                  className={cn(
                    "absolute w-4 h-4 rounded-full cursor-pointer border-2 border-gray-900",
                    statusColors[robot.status].bg
                  )}
                  style={{ left: x - 8, top: y - 8 }}
                  animate={robot.status === "running" ? {
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.7, 1]
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  whileHover={{ scale: 1.3 }}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p className="font-medium">{robot.name}</p>
                <p className="text-gray-400">{statusColors[robot.status].label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Average health badge */}
      <div className="mt-4 text-center">
        <Badge className={cn(
          "text-xs",
          avgHealth >= 90 ? "bg-green-500" : avgHealth >= 70 ? "bg-amber-500" : "bg-red-500"
        )}>
          Saúde Média: {avgHealth.toFixed(0)}%
        </Badge>
      </div>
    </div>
  );
};

// EventLog component
const EventLog: React.FC<{ events: LogEvent[] }> = ({ events }) => {
  return (
    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
      <h3 className="font-semibold text-white mb-3 text-sm">Log de Eventos</h3>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {events.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">Nenhum evento registrado</p>
        ) : (
          events.slice(0, 20).map(event => {
            const config = eventTypeConfig[event.type];
            const Icon = config.icon;
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 text-xs"
              >
                <Icon className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", config.color)} />
                <div className="min-w-0">
                  <span className="text-gray-500 text-[10px]">
                    {event.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                  <p className="text-gray-300 truncate">{event.message}</p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

// RobotDetailModal component
const RobotDetailModal: React.FC<{ robot: Robot | null; onClose: () => void }> = ({ robot, onClose }) => {
  if (!robot) return null;

  const colors = robotTypeColors[robot.type];
  const status = statusColors[robot.status];
  const Icon = robot.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className={cn(
            "bg-gray-900 rounded-xl p-6 max-w-md w-full border",
            colors.border
          )}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-3 rounded-xl bg-gradient-to-br", colors.bg)}>
                <Icon className={cn("w-8 h-8", colors.text)} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{robot.name}</h2>
                <Badge className={cn("text-xs capitalize", colors.text, "bg-transparent border", colors.border)}>
                  {robot.type}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <p className="text-gray-400 text-sm mb-4">{robot.description}</p>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <span className="text-xs text-gray-400">Status</span>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("w-2 h-2 rounded-full", status.bg)} />
                <span className={cn("font-medium", status.text)}>{status.label}</span>
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <span className="text-xs text-gray-400">Saúde</span>
              <p className={cn(
                "font-bold text-lg",
                robot.health >= 90 ? "text-green-400" : robot.health >= 70 ? "text-amber-400" : "text-red-400"
              )}>
                {robot.health.toFixed(1)}%
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <span className="text-xs text-gray-400">Tarefas Completadas</span>
              <p className="font-bold text-lg text-white">{robot.tasksCompleted.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <span className="text-xs text-gray-400">Última Verificação</span>
              <p className="font-medium text-white">{robot.lastCheck.toLocaleTimeString("pt-BR")}</p>
            </div>
          </div>

          {/* Resource usage */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300">Uso de Recursos</h4>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">CPU</span>
                  <span className="text-white">{robot.cpu.toFixed(0)}%</span>
                </div>
                <Progress value={robot.cpu} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">RAM</span>
                  <span className="text-white">{robot.ram.toFixed(0)}%</span>
                </div>
                <Progress value={robot.ram} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Network</span>
                  <span className="text-white">{robot.network.toFixed(0)}%</span>
                </div>
                <Progress value={robot.network} className="h-2" />
              </div>
            </div>
          </div>

          <Button className="mt-6 w-full" onClick={onClose}>
            Fechar
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Main component
export const AutoControlDiagram: React.FC = () => {
  const [robots, setRobots] = useState<Robot[]>(createInitialRobots);
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [autoRepair, setAutoRepair] = useState(true);
  
  // Voice narration hook
  const { isLoading: isNarrationLoading, isPlaying: isNarrationPlaying, play: playNarration, stop: stopNarration } = useVoiceNarration("autocontrol");

  const addEvent = useCallback((type: EventType, robotId: string, message: string) => {
    const newEvent: LogEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      robotId,
      message
    };
    setEvents(prev => [newEvent, ...prev].slice(0, 20));
  }, []);

  // Simulation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setRobots(prevRobots => {
        return prevRobots.map(robot => {
          // Fluctuate health (+/- 2%)
          let newHealth = robot.health + (Math.random() * 4 - 2);
          newHealth = Math.max(0, Math.min(100, newHealth));

          // Fluctuate metrics
          let newCpu = robot.cpu + (Math.random() * 10 - 5);
          let newRam = robot.ram + (Math.random() * 6 - 3);
          let newNetwork = robot.network + (Math.random() * 8 - 4);

          // Clamp values
          newCpu = Math.max(5, Math.min(100, newCpu));
          newRam = Math.max(10, Math.min(100, newRam));
          newNetwork = Math.max(0, Math.min(100, newNetwork));

          // Status logic
          let newStatus = robot.status;
          if (newHealth < 70 && robot.status === "running") {
            newStatus = "repairing";
            addEvent("warning", robot.id, `${robot.name} entrou em modo de reparo`);
          } else if (newHealth > 85 && robot.status === "repairing" && autoRepair) {
            newStatus = "running";
            addEvent("success", robot.id, `${robot.name} recuperado com sucesso`);
          }

          // Increment tasks if running
          const newTasks = robot.status === "running"
            ? robot.tasksCompleted + Math.floor(Math.random() * 3)
            : robot.tasksCompleted;

          // Random info events
          if (Math.random() < 0.1 && robot.status === "running") {
            addEvent("info", robot.id, `${robot.name} processou lote de dados`);
          }

          return {
            ...robot,
            health: newHealth,
            cpu: newCpu,
            ram: newRam,
            network: newNetwork,
            status: newStatus,
            tasksCompleted: newTasks,
            lastCheck: new Date()
          };
        });
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [autoRepair, addEvent]);

  return (
    <TooltipProvider>
      <div className="min-h-full bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-900/70 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-400" />
            AutoControl
          </h2>

          <div className="flex items-center gap-2">
            {/* Auto-Repair toggle */}
            <Button
              variant={autoRepair ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRepair(!autoRepair)}
              className={cn(
                "text-xs",
                autoRepair && "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              <RefreshCw className={cn("w-3.5 h-3.5 mr-1", autoRepair && "animate-spin")} />
              Auto-Repair
            </Button>

            {/* Audio toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => isNarrationPlaying ? stopNarration() : playNarration()} 
                  className="h-8 w-8"
                  disabled={isNarrationLoading}
                >
                  {isNarrationLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isNarrationPlaying ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isNarrationLoading ? "Carregando..." : isNarrationPlaying ? "Parar narração" : "Ouvir narração"}
              </TooltipContent>
            </Tooltip>

            {/* WhatsApp */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Notificar WhatsApp</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex gap-4">
          {/* Robot cards grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {robots.map(robot => (
              <RobotCard
                key={robot.id}
                robot={robot}
                onClick={setSelectedRobot}
              />
            ))}
          </div>

          {/* Sidebar */}
          <div className="w-56 space-y-4 hidden lg:block shrink-0">
            <CentralBrain robots={robots} />
            <EventLog events={events} />
          </div>
        </div>

        {/* Mobile sidebar (collapsed) */}
        <div className="lg:hidden p-4 pt-0 grid grid-cols-2 gap-4">
          <CentralBrain robots={robots} />
          <EventLog events={events} />
        </div>

        {/* Detail modal */}
        {selectedRobot && (
          <RobotDetailModal robot={selectedRobot} onClose={() => setSelectedRobot(null)} />
        )}
      </div>
    </TooltipProvider>
  );
};

export default AutoControlDiagram;
