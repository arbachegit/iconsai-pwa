import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Heart,
  Zap,
  Target,
  Lightbulb,
  Sparkles,
  Play,
  Volume2,
  VolumeX,
  MessageCircle,
  ChevronRight,
  Award,
  Star,
  Clock,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";
import { useVoiceNarration } from "@/hooks/useVoiceNarration";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

// ============== TYPES ==============
interface BrainRegion {
  id: string;
  name: string;
  description: string;
  function: string;
  icon: LucideIcon;
  color: string;
  position: { x: number; y: number };
  metrics: { current: number; target: number; progress: number };
  habits: string[];
}

interface Habit {
  id: string;
  title: string;
  category: string;
  regionId: string;
  progress: number;
  streak: number;
}

// ============== DATA ==============
const brainRegions: BrainRegion[] = [
  {
    id: "limbic",
    name: "Sistema Límbico",
    description:
      "Centro emocional do cérebro. Controla emoções, motivação e memória emocional.",
    function: "Emoções & Motivação",
    icon: Heart,
    color: "#F43F5E",
    position: { x: 50, y: 55 },
    metrics: { current: 72, target: 85, progress: 85 },
    habits: ["Meditação diária", "Diário de gratidão", "Exercícios de respiração"],
  },
  {
    id: "neocortex",
    name: "Neocórtex",
    description:
      "Responsável pelo pensamento racional, linguagem e processamento sensorial.",
    function: "Pensamento Racional",
    icon: Lightbulb,
    color: "#8B5CF6",
    position: { x: 50, y: 20 },
    metrics: { current: 68, target: 90, progress: 76 },
    habits: ["Leitura diária", "Aprender algo novo", "Jogos de lógica"],
  },
  {
    id: "reptilian",
    name: "Cérebro Reptiliano",
    description:
      "Controla funções básicas: respiração, batimentos cardíacos, reflexos.",
    function: "Instintos & Sobrevivência",
    icon: Zap,
    color: "#10B981",
    position: { x: 50, y: 85 },
    metrics: { current: 88, target: 95, progress: 93 },
    habits: ["Sono regular", "Hidratação", "Exercício físico"],
  },
  {
    id: "basal-ganglia",
    name: "Gânglio Basal",
    description:
      "Centro de formação de hábitos. Automatiza comportamentos repetitivos.",
    function: "Formação de Hábitos",
    icon: Target,
    color: "#F59E0B",
    position: { x: 25, y: 55 },
    metrics: { current: 45, target: 80, progress: 56 },
    habits: ["Rotina matinal", "Consistência", "Micro-hábitos"],
  },
  {
    id: "cognition",
    name: "Centro Cognitivo",
    description: "Processa informações, toma decisões e resolve problemas.",
    function: "Cognição & Decisão",
    icon: Brain,
    color: "#00D4FF",
    position: { x: 75, y: 35 },
    metrics: { current: 62, target: 85, progress: 73 },
    habits: ["Foco profundo", "Planejamento", "Revisão de metas"],
  },
  {
    id: "skills",
    name: "Habilidades",
    description: "Habilidades motoras e aprendizado de novas competências.",
    function: "Desenvolvimento de Skills",
    icon: Award,
    color: "#EC4899",
    position: { x: 75, y: 75 },
    metrics: { current: 58, target: 80, progress: 72 },
    habits: ["Prática deliberada", "Feedback constante", "Desafios progressivos"],
  },
  {
    id: "mindset",
    name: "Mindset",
    description: "Crenças, atitudes e perspectivas que moldam o comportamento.",
    function: "Mentalidade & Crenças",
    icon: Sparkles,
    color: "#A855F7",
    position: { x: 25, y: 35 },
    metrics: { current: 55, target: 90, progress: 61 },
    habits: ["Afirmações positivas", "Visualização", "Mentalidade de crescimento"],
  },
];

const connections = [
  { from: "neocortex", to: "cognition" },
  { from: "neocortex", to: "mindset" },
  { from: "limbic", to: "basal-ganglia" },
  { from: "limbic", to: "skills" },
  { from: "reptilian", to: "limbic" },
  { from: "cognition", to: "skills" },
  { from: "mindset", to: "basal-ganglia" },
];

const initialHabits: Habit[] = [
  { id: "h1", title: "Meditação 10min", category: "Emocional", regionId: "limbic", progress: 80, streak: 12 },
  { id: "h2", title: "Leitura 30min", category: "Cognitivo", regionId: "neocortex", progress: 65, streak: 7 },
  { id: "h3", title: "Exercício diário", category: "Físico", regionId: "reptilian", progress: 90, streak: 21 },
  { id: "h4", title: "Journaling", category: "Mindset", regionId: "mindset", progress: 45, streak: 5 },
];

// ============== SUB-COMPONENTS ==============

// Region Node (SVG)
const RegionNode: React.FC<{
  region: BrainRegion;
  isSelected: boolean;
  onClick: () => void;
}> = ({ region, isSelected, onClick }) => {
  const { x, y } = region.position;
  const radius = 6;
  const ringRadius = radius + 1.5;
  const circumference = 2 * Math.PI * ringRadius;
  const progressOffset = circumference - (region.metrics.progress / 100) * circumference;
  const Icon = region.icon;

  return (
    <g onClick={onClick} className="cursor-pointer" style={{ pointerEvents: "all" }}>
      {/* Background ring */}
      <circle
        cx={x}
        cy={y}
        r={ringRadius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1"
      />
      {/* Progress ring */}
      <motion.circle
        cx={x}
        cy={y}
        r={ringRadius}
        fill="none"
        stroke={region.color}
        strokeWidth="1.2"
        strokeDasharray={circumference}
        strokeLinecap="round"
        style={{ transform: `rotate(-90deg)`, transformOrigin: `${x}px ${y}px` }}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: progressOffset }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
      {/* Main circle */}
      <motion.circle
        cx={x}
        cy={y}
        r={radius}
        fill={isSelected ? region.color : `${region.color}40`}
        stroke={region.color}
        strokeWidth="0.5"
        whileHover={{ scale: 1.15 }}
        transition={{ type: "spring", stiffness: 300 }}
      />
      {/* Icon */}
      <foreignObject x={x - 2.5} y={y - 2.5} width="5" height="5" style={{ pointerEvents: "none" }}>
        <div className="w-full h-full flex items-center justify-center">
          <Icon
            className="w-full h-full"
            style={{ color: isSelected ? "#fff" : region.color }}
          />
        </div>
      </foreignObject>
      {/* Label */}
      <text
        x={x}
        y={y + radius + 4}
        textAnchor="middle"
        fill="white"
        fontSize="2.2"
        fontWeight="500"
        className="pointer-events-none select-none"
      >
        {region.name.split(" ")[0]}
      </text>
    </g>
  );
};

// Brain Visualization (SVG)
const BrainVisualization: React.FC<{
  selectedRegion: BrainRegion | null;
  onSelectRegion: (region: BrainRegion) => void;
}> = ({ selectedRegion, onSelectRegion }) => {
  const getRegionPosition = (id: string) => {
    const region = brainRegions.find((r) => r.id === id);
    return region ? region.position : { x: 50, y: 50 };
  };

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <radialGradient id="brainGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(139,92,246,0.2)" />
          <stop offset="70%" stopColor="rgba(139,92,246,0.05)" />
          <stop offset="100%" stopColor="rgba(30,30,50,0.1)" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Brain silhouette */}
      <ellipse
        cx="50"
        cy="52"
        rx="42"
        ry="38"
        fill="url(#brainGradient)"
        stroke="rgba(139,92,246,0.2)"
        strokeWidth="0.5"
      />

      {/* Connection lines */}
      {connections.map((conn) => {
        const from = getRegionPosition(conn.from);
        const to = getRegionPosition(conn.to);
        return (
          <line
            key={`${conn.from}-${conn.to}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.3"
            strokeDasharray="1,1"
          />
        );
      })}

      {/* Center "YOU" logo */}
      <motion.g
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <circle cx="50" cy="52" r="7" fill="rgba(139,92,246,0.25)" filter="url(#glow)" />
        <circle cx="50" cy="52" r="5" fill="rgba(139,92,246,0.4)" />
        <text
          x="50"
          y="54"
          textAnchor="middle"
          fill="white"
          fontSize="3.5"
          fontWeight="bold"
          className="select-none"
        >
          YOU
        </text>
      </motion.g>

      {/* Region nodes */}
      {brainRegions.map((region) => (
        <RegionNode
          key={region.id}
          region={region}
          isSelected={selectedRegion?.id === region.id}
          onClick={() => onSelectRegion(region)}
        />
      ))}
    </svg>
  );
};

// Region Details Panel
const RegionDetailsPanel: React.FC<{
  region: BrainRegion;
  onClose: () => void;
}> = ({ region, onClose }) => {
  const Icon = region.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="absolute left-4 top-1/2 -translate-y-1/2 w-72 bg-gray-900/95 backdrop-blur-sm rounded-xl p-4 border shadow-xl z-10"
      style={{ borderColor: `${region.color}40` }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="p-2.5 rounded-lg"
          style={{ backgroundColor: `${region.color}25` }}
        >
          <Icon className="w-6 h-6" style={{ color: region.color }} />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">{region.name}</h3>
          <Badge
            className="text-xs mt-0.5"
            style={{ backgroundColor: `${region.color}25`, color: region.color }}
          >
            {region.function}
          </Badge>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-400 mb-4 leading-relaxed">{region.description}</p>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-gray-800/60 rounded-lg">
          <span className="text-base font-bold" style={{ color: region.color }}>
            {region.metrics.current}%
          </span>
          <p className="text-[10px] text-gray-400 mt-0.5">Atual</p>
        </div>
        <div className="text-center p-2 bg-gray-800/60 rounded-lg">
          <span className="text-base font-bold text-white">
            {region.metrics.target}%
          </span>
          <p className="text-[10px] text-gray-400 mt-0.5">Meta</p>
        </div>
        <div className="text-center p-2 bg-gray-800/60 rounded-lg">
          <span className="text-base font-bold text-emerald-400">
            {region.metrics.progress}%
          </span>
          <p className="text-[10px] text-gray-400 mt-0.5">Progresso</p>
        </div>
      </div>

      {/* Recommended habits */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-white mb-2">Hábitos Recomendados</h4>
        <div className="space-y-1.5">
          {region.habits.map((habit, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="text-gray-300">{habit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Start training button */}
      <Button className="w-full text-white text-sm" style={{ backgroundColor: region.color }}>
        <Play className="w-4 h-4 mr-2" />
        Iniciar Treino
      </Button>
    </motion.div>
  );
};

// Quick Stats
const QuickStats: React.FC = () => (
  <div className="grid grid-cols-2 gap-2 mb-4">
    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
      <Brain className="w-5 h-5 text-purple-400 mx-auto mb-1" />
      <span className="text-lg font-bold text-white">7</span>
      <p className="text-[10px] text-gray-400">Áreas Mapeadas</p>
    </div>
    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
      <Clock className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
      <span className="text-lg font-bold text-white">28</span>
      <p className="text-[10px] text-gray-400">Dias de Treino</p>
    </div>
  </div>
);

// Habits Tracker
const HabitsTracker: React.FC<{ habits: Habit[] }> = ({ habits }) => (
  <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700/50 mb-4">
    <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
      <Target className="w-4 h-4 text-amber-400" />
      Seus Hábitos
    </h3>

    <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
      {habits.map((habit) => {
        const region = brainRegions.find((r) => r.id === habit.regionId);
        const Icon = region?.icon || Target;
        return (
          <div key={habit.id} className="bg-gray-800/50 rounded-lg p-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-white font-medium">{habit.title}</span>
              <div className="flex items-center gap-1.5">
                <Icon className="w-3 h-3" style={{ color: region?.color }} />
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {habit.streak}🔥
                </Badge>
              </div>
            </div>
            <Progress value={habit.progress} className="h-1" />
            <span className="text-[10px] text-gray-500 mt-1 block">{habit.category}</span>
          </div>
        );
      })}
    </div>
  </div>
);

// Today's Focus
const TodayFocus: React.FC<{ region: BrainRegion }> = ({ region }) => {
  const Icon = region.icon;

  return (
    <div
      className="rounded-xl p-3 border"
      style={{
        background: `linear-gradient(135deg, ${region.color}15, transparent)`,
        borderColor: `${region.color}40`,
      }}
    >
      <h3 className="font-semibold text-white text-sm mb-2 flex items-center gap-2">
        <Star className="w-4 h-4 text-amber-400" />
        Foco de Hoje
      </h3>

      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${region.color}25` }}>
          <Icon className="w-5 h-5" style={{ color: region.color }} />
        </div>
        <div>
          <p className="font-medium text-white text-sm">{region.name}</p>
          <p className="text-[10px] text-gray-400">{region.function}</p>
        </div>
      </div>

      <Button className="w-full text-white text-xs" style={{ backgroundColor: region.color }}>
        Começar Treino
        <ChevronRight className="w-3 h-3 ml-1" />
      </Button>
    </div>
  );
};

// Region Legend (Footer)
const RegionLegend: React.FC<{
  selectedRegion: BrainRegion | null;
  onSelect: (region: BrainRegion) => void;
}> = ({ selectedRegion, onSelect }) => (
  <div className="flex flex-wrap justify-center gap-2 p-3 bg-gray-900/70 border-t border-gray-700/50">
    {brainRegions.map((region) => (
      <button
        key={region.id}
        onClick={() => onSelect(region)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all text-xs",
          selectedRegion?.id === region.id
            ? "bg-white/10 ring-1"
            : "hover:bg-white/5"
        )}
        style={
          selectedRegion?.id === region.id
            ? { "--tw-ring-color": region.color } as React.CSSProperties
            : undefined
        }
      >
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: region.color }}
        />
        <span className="text-white">{region.name}</span>
      </button>
    ))}
  </div>
);

// ============== MAIN COMPONENT ==============
export const TutorDiagram: React.FC = () => {
  const [selectedRegion, setSelectedRegion] = useState<BrainRegion | null>(null);
  const [habits] = useState<Habit[]>(initialHabits);
  
  // Voice narration hook
  const { isLoading: isNarrationLoading, isPlaying: isNarrationPlaying, play: playNarration, stop: stopNarration } = useVoiceNarration("tutor");

  // Today's focus: region with lowest progress
  const todayFocus = useMemo(() => {
    return brainRegions.reduce((min, region) =>
      region.metrics.progress < min.metrics.progress ? region : min
    );
  }, []);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-gray-900/70 border-b border-gray-700/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            Tutor Cerebral
          </h2>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-white"
                  onClick={() => isNarrationPlaying ? stopNarration() : playNarration()}
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-white"
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>WhatsApp</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Brain Area */}
          <div className="flex-1 relative p-4 flex items-center justify-center">
            <div className="aspect-square w-full max-w-md">
              <BrainVisualization
                selectedRegion={selectedRegion}
                onSelectRegion={setSelectedRegion}
              />
            </div>

            {/* Details Panel */}
            <AnimatePresence>
              {selectedRegion && (
                <RegionDetailsPanel
                  region={selectedRegion}
                  onClose={() => setSelectedRegion(null)}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Right Sidebar */}
          <div className="w-64 p-3 border-l border-gray-700/50 hidden lg:block overflow-y-auto">
            <QuickStats />
            <HabitsTracker habits={habits} />
            <TodayFocus region={todayFocus} />
          </div>
        </div>

        {/* Footer Legend */}
        <RegionLegend
          selectedRegion={selectedRegion}
          onSelect={setSelectedRegion}
        />
      </div>
    </TooltipProvider>
  );
};

export default TutorDiagram;
