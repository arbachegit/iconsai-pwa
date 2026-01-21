import { useState, useEffect, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Server, 
  DollarSign,
  Layers,
  Info,
  Play,
  Pause,
  Download,
  Loader2,
  Headphones,
  RotateCw,
  CheckCircle2,
  ArrowLeft,
  Building2,
  Factory,
  FileImage,
  Activity,
  Globe,
  MessageCircle,
  Sparkles,
  Brain,
  Star,
  Lightbulb,
  Code,
  Database,
  Settings,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import ArchitectureCard from "@/components/admin/ArchitectureCard";
import SaasRagArchitectureDiagram from "@/components/admin/SaasRagArchitectureDiagram";
import DepartmentArchitectureDiagram from "@/components/admin/DepartmentArchitectureDiagram";
import { DynamicSLMArchitectureDiagram } from "@/components/admin/DynamicSLMArchitectureDiagram";
import HyperModularSLMDiagram from "@/components/admin/HyperModularSLMDiagram";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import knowriskLogo from "@/assets/knowrisk-logo.png";

type SimulationPhase = 'idle' | 'request' | 'routing' | 'check-adapter' | 'load-adapter' | 'inference' | 'response' | 'complete';
type ViewMode = 'cards' | 'gpu' | 'department-choice' | 'department-static' | 'department-dynamic' | 'saas-choice' | 'saas-static' | 'saas-dynamic';

interface BackButtonProps {
  onClick: () => void;
}

const BackButton = memo(({ onClick }: BackButtonProps) => (
  <Button 
    variant="outline" 
    onClick={onClick}
    className="gap-2"
    type="button"
  >
    <ArrowLeft className="h-4 w-4" />
    Voltar
  </Button>
));

const Arquitetura = () => {
  const navigate = useNavigate();
  const [selectedView, setSelectedView] = useState<ViewMode>('cards');
  const [zoom, setZoom] = useState(100);
  const [animationKey, setAnimationKey] = useState(0);
  
  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<SimulationPhase>('idle');
  const [adapterLoaded, setAdapterLoaded] = useState(false);

  // Use global audio player context
  const { playAudio, floatingPlayerState } = useAudioPlayer();

  const AUDIO_URL = "https://gmflpmcepempcygdrayv.supabase.co/storage/v1/object/public/tooltip-audio/audio-contents/e137c34e-4523-406a-a7bc-35ac598cc9f6.mp3";
  const AUDIO_TITLE = "AI Escalável: O Segredo dos 90% Mais Barato! 💰";

  const handleGoHome = () => navigate('/');

  const isThisAudioActive = floatingPlayerState?.audioUrl === AUDIO_URL;
  const isPlaying = isThisAudioActive && floatingPlayerState?.isPlaying;
  const isLoading = isThisAudioActive && floatingPlayerState?.isLoading;

  const handleAudioPlayPause = () => {
    playAudio(AUDIO_TITLE, AUDIO_URL);
  };

  const handleAudioDownload = () => {
    const link = document.createElement('a');
    link.href = AUDIO_URL;
    link.download = 'ai-escalavel-90-mais-barato.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const handleZoomIn = () => setZoom(prev => Math.min(prev + 20, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 20, 60));
  const handleReset = () => setZoom(100);

  const startSimulation = () => {
    setIsSimulating(true);
    setCurrentPhase('request');
    setAdapterLoaded(false);

    setTimeout(() => setCurrentPhase('routing'), 1000);
    setTimeout(() => setCurrentPhase('check-adapter'), 2500);
    setTimeout(() => setCurrentPhase('load-adapter'), 3500);
    setTimeout(() => {
      setAdapterLoaded(true);
      setCurrentPhase('inference');
    }, 5000);
    setTimeout(() => setCurrentPhase('response'), 6500);
    setTimeout(() => {
      setCurrentPhase('complete');
      setIsSimulating(false);
    }, 7500);
  };

  const resetSimulation = () => {
    setIsSimulating(false);
    setCurrentPhase('idle');
    setAdapterLoaded(false);
    setAnimationKey(prev => prev + 1);
  };

  const getPhaseLabel = () => {
    switch (currentPhase) {
      case 'request': return '📤 Requisição chegando (company_id: A)';
      case 'routing': return '🔀 Roteando para orquestrador...';
      case 'check-adapter': return '🔍 Verificando adapter na GPU...';
      case 'load-adapter': return '⬇️ Baixando adapter do S3 (~ms)...';
      case 'inference': return '⚡ Executando inferência isolada...';
      case 'response': return '📥 Retornando resposta...';
      case 'complete': return '✅ Requisição completa!';
      default: return '';
    }
  };

  const getPhaseColor = () => {
    switch (currentPhase) {
      case 'request': return 'bg-purple-500/20 text-purple-400 border-purple-500';
      case 'routing': return 'bg-blue-500/20 text-blue-400 border-blue-500';
      case 'check-adapter': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500';
      case 'load-adapter': return 'bg-orange-500/20 text-orange-400 border-orange-500';
      case 'inference': return 'bg-green-500/20 text-green-400 border-green-500';
      case 'response': return 'bg-purple-500/20 text-purple-400 border-purple-500';
      case 'complete': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500';
      default: return '';
    }
  };

  const goToCards = () => setSelectedView('cards');
  const goToDepartmentChoice = () => setSelectedView('department-choice');
  const goToSaasChoice = () => setSelectedView('saas-choice');

  // Header with logo and back button
  const renderHeader = () => (
    <header className="w-full bg-card/80 backdrop-blur-md border-b border-border py-4 px-6 mb-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <img 
          src={knowriskLogo} 
          alt="KnowRisk" 
          className="h-12 object-contain"
        />
        <Button
          variant="outline"
          onClick={handleGoHome}
          className="gap-2 text-white hover:text-white hover:bg-red-600"
        >
          <Globe className="h-4 w-4" />
          Voltar para o App
        </Button>
      </div>
    </header>
  );

  // Tech icons background for diagram - slow blinking with varied sizes
  const renderDiagramBackground = () => {
    const icons = [
      { Icon: Star, x: 5, y: 15, size: 'w-3 h-3', color: 'text-yellow-400', dur: 4 },
      { Icon: Lightbulb, x: 92, y: 20, size: 'w-8 h-8', color: 'text-amber-400', dur: 5 },
      { Icon: Code, x: 15, y: 75, size: 'w-5 h-5', color: 'text-cyan-400', dur: 6 },
      { Icon: Database, x: 88, y: 70, size: 'w-10 h-10', color: 'text-violet-400', dur: 4.5 },
      { Icon: Settings, x: 50, y: 10, size: 'w-4 h-4', color: 'text-slate-400', dur: 5.5 },
      { Icon: Zap, x: 8, y: 45, size: 'w-6 h-6', color: 'text-yellow-300', dur: 3.5 },
      { Icon: Star, x: 75, y: 85, size: 'w-7 h-7', color: 'text-pink-400', dur: 4.2 },
      { Icon: Lightbulb, x: 25, y: 25, size: 'w-3 h-3', color: 'text-amber-300', dur: 5.8 },
      { Icon: Code, x: 82, y: 40, size: 'w-4 h-4', color: 'text-cyan-300', dur: 4.8 },
      { Icon: Database, x: 12, y: 60, size: 'w-6 h-6', color: 'text-violet-300', dur: 5.2 },
      { Icon: Settings, x: 70, y: 15, size: 'w-8 h-8', color: 'text-slate-300', dur: 6.5 },
      { Icon: Zap, x: 40, y: 80, size: 'w-9 h-9', color: 'text-yellow-400', dur: 3.8 },
      { Icon: Star, x: 60, y: 30, size: 'w-2 h-2', color: 'text-yellow-200', dur: 4.4 },
      { Icon: Lightbulb, x: 35, y: 65, size: 'w-7 h-7', color: 'text-amber-500', dur: 5.4 },
      { Icon: Code, x: 55, y: 75, size: 'w-8 h-8', color: 'text-cyan-500', dur: 4.6 },
      { Icon: Database, x: 45, y: 35, size: 'w-3 h-3', color: 'text-violet-500', dur: 6.2 },
      { Icon: Settings, x: 20, y: 85, size: 'w-5 h-5', color: 'text-slate-500', dur: 5.6 },
      { Icon: Zap, x: 78, y: 55, size: 'w-4 h-4', color: 'text-yellow-500', dur: 4.1 },
      { Icon: Star, x: 30, y: 40, size: 'w-6 h-6', color: 'text-pink-300', dur: 5.3 },
      { Icon: Lightbulb, x: 65, y: 60, size: 'w-5 h-5', color: 'text-amber-200', dur: 4.7 },
      { Icon: Star, x: 95, y: 50, size: 'w-4 h-4', color: 'text-yellow-300', dur: 5.1 },
      { Icon: Code, x: 3, y: 30, size: 'w-7 h-7', color: 'text-cyan-200', dur: 4.3 },
      { Icon: Zap, x: 58, y: 15, size: 'w-3 h-3', color: 'text-yellow-200', dur: 3.9 },
      { Icon: Database, x: 85, y: 25, size: 'w-5 h-5', color: 'text-violet-200', dur: 5.7 },
    ];

    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {icons.map((item, i) => (
          <div
            key={`tech-icon-${i}`}
            className="absolute transition-opacity"
            style={{ 
              left: `${item.x}%`, 
              top: `${item.y}%`,
              animation: `slowBlink ${item.dur}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`
            }}
          >
            <item.Icon className={`${item.size} ${item.color}`} />
          </div>
        ))}
        <style>{`
          @keyframes slowBlink {
            0%, 100% { opacity: 0.15; }
            50% { opacity: 0.6; }
          }
        `}</style>
      </div>
    );
  };

  // Reusable hero background
  const renderHeroBackground = () => (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0a1628] to-[#0d1b2a]">
      <svg width="100%" height="100%" className="absolute inset-0">
        <defs>
          <linearGradient id="heroGradientCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9">
              <animate attributeName="stop-opacity" values="0.5;0.9;0.5" dur="4s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.7">
              <animate attributeName="stop-opacity" values="0.7;0.4;0.7" dur="5s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
          <linearGradient id="heroGradientPurple" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.6" />
          </linearGradient>
          <filter id="heroGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Hexagonal circuit grid pattern */}
        {Array.from({ length: 30 }).map((_, i) => {
          const col = i % 10;
          const row = Math.floor(i / 10);
          const x = col * 120 + (row % 2 === 0 ? 0 : 60);
          const y = row * 100 + 30;
          return (
            <polygon
              key={`hero-hex-${i}`}
              points={`${x + 30},${y} ${x + 60},${y + 17} ${x + 60},${y + 52} ${x + 30},${y + 69} ${x},${y + 52} ${x},${y + 17}`}
              fill="none"
              stroke="url(#heroGradientCyan)"
              strokeWidth="0.5"
              opacity="0.15"
            >
              <animate attributeName="opacity" values="0.05;0.25;0.05" dur={`${4 + (i % 4)}s`} begin={`${i * 0.15}s`} repeatCount="indefinite" />
            </polygon>
          );
        })}

        {/* Flowing code streams */}
        {['01101', '10010', '11100', '00111', '10101', '01110', '11001', '00100'].map((code, i) => (
          <text
            key={`hero-code-${i}`}
            x={`${8 + i * 12}%`}
            y="-5%"
            fill="url(#heroGradientCyan)"
            fontSize="10"
            fontFamily="monospace"
            opacity="0"
          >
            <animate attributeName="y" values="-5%;105%" dur={`${8 + i * 1.5}s`} begin={`${i * 1.2}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.5;0.5;0" dur={`${8 + i * 1.5}s`} begin={`${i * 1.2}s`} repeatCount="indefinite" />
            {code}
          </text>
        ))}

        {/* Network nodes pulsing */}
        {[
          { x: '8%', y: '15%' }, { x: '22%', y: '35%' }, { x: '15%', y: '65%' }, { x: '35%', y: '20%' },
          { x: '45%', y: '50%' }, { x: '55%', y: '25%' }, { x: '65%', y: '70%' }, { x: '78%', y: '40%' },
          { x: '85%', y: '18%' }, { x: '92%', y: '60%' }, { x: '50%', y: '85%' }, { x: '30%', y: '80%' }
        ].map((node, i) => (
          <g key={`hero-node-${i}`} filter="url(#heroGlow)">
            <circle cx={node.x} cy={node.y} r="3" fill="url(#heroGradientCyan)" opacity="0.6">
              <animate attributeName="r" values="2;5;2" dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}

        {/* Connection lines */}
        {[
          { x1: '8%', y1: '15%', x2: '22%', y2: '35%' },
          { x1: '22%', y1: '35%', x2: '35%', y2: '20%' },
          { x1: '35%', y1: '20%', x2: '55%', y2: '25%' },
          { x1: '55%', y1: '25%', x2: '78%', y2: '40%' },
          { x1: '78%', y1: '40%', x2: '85%', y2: '18%' },
          { x1: '15%', y1: '65%', x2: '45%', y2: '50%' },
          { x1: '45%', y1: '50%', x2: '65%', y2: '70%' },
          { x1: '65%', y1: '70%', x2: '92%', y2: '60%' },
          { x1: '30%', y1: '80%', x2: '50%', y2: '85%' },
          { x1: '50%', y1: '85%', x2: '65%', y2: '70%' }
        ].map((line, i) => (
          <line
            key={`hero-conn-${i}`}
            x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
            stroke="url(#heroGradientCyan)"
            strokeWidth="1"
            strokeDasharray="6,4"
            opacity="0.3"
          >
            <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.15;0.4;0.15" dur={`${3 + i * 0.3}s`} repeatCount="indefinite" />
          </line>
        ))}

        {/* Server wireframes */}
        {[
          { x: 80, y: 120 }, { x: 250, y: 280 }, { x: 450, y: 150 },
          { x: 700, y: 320 }, { x: 900, y: 180 }, { x: 1100, y: 350 }
        ].map((server, i) => (
          <g key={`hero-server-${i}`} transform={`translate(${server.x}, ${server.y})`} opacity="0.25">
            <rect x="0" y="0" width="40" height="55" rx="3" fill="none" stroke="url(#heroGradientCyan)" strokeWidth="1.5">
              <animate attributeName="opacity" values="0.2;0.6;0.2" dur={`${4 + i}s`} repeatCount="indefinite" />
            </rect>
            {[12, 24, 36].map((lineY, j) => (
              <line key={j} x1="5" y1={lineY} x2="35" y2={lineY} stroke="url(#heroGradientCyan)" strokeWidth="1">
                <animate attributeName="opacity" values="0.2;0.7;0.2" dur={`${3 + j}s`} begin={`${i * 0.5}s`} repeatCount="indefinite" />
              </line>
            ))}
            <circle cx="8" cy="8" r="2" fill="#22d3ee">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}

        {/* Data particles */}
        {Array.from({ length: 15 }).map((_, i) => (
          <circle key={`hero-particle-${i}`} r="2" fill="url(#heroGradientCyan)" opacity="0">
            <animate attributeName="cx" values={`${-5 + (i % 5) * 2}%;${105}%`} dur={`${10 + i * 2}s`} begin={`${i * 0.8}s`} repeatCount="indefinite" />
            <animate attributeName="cy" values={`${10 + (i % 8) * 10}%;${15 + ((i + 3) % 7) * 12}%;${8 + (i % 9) * 10}%`} dur={`${10 + i * 2}s`} begin={`${i * 0.8}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.7;0.7;0" dur={`${10 + i * 2}s`} begin={`${i * 0.8}s`} repeatCount="indefinite" />
          </circle>
        ))}

        {/* Circuit paths */}
        <path
          d="M0,200 Q200,150 400,200 T800,180 T1200,220"
          fill="none"
          stroke="url(#heroGradientPurple)"
          strokeWidth="1"
          strokeDasharray="10,8"
          opacity="0.2"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-36" dur="4s" repeatCount="indefinite" />
        </path>
        <path
          d="M0,400 Q300,350 600,420 T1200,380"
          fill="none"
          stroke="url(#heroGradientCyan)"
          strokeWidth="1"
          strokeDasharray="8,6"
          opacity="0.15"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="5s" repeatCount="indefinite" />
        </path>
      </svg>
    </div>
  );

  // Brain flow animation component - Cognitive Processing Diagram
  const renderBrainFlowAnimation = () => {
    // Fixed animation parameters for continuous flow
    const ANIMATION_DURATION = 24; // seconds for full path traversal
    const STAGGER_DELAY = 4; // seconds between elements (24s / 6 elements = 4s)

    // INPUT elements: [Icon] → Palavra → [Icon] → Dados → [Icon] → PROMPT (6 elements)
    const inputElements = [
      { type: 'icon', color: 'text-pink-300' },
      { type: 'badge', text: 'Palavra', bg: '#a855f7' },
      { type: 'icon', color: 'text-pink-300' },
      { type: 'badge', text: 'Dados', bg: '#8b5cf6' },
      { type: 'icon', color: 'text-pink-300' },
      { type: 'badge', text: 'PROMPT', bg: '#10b981' },
    ];

    // OUTPUT elements: [Icon] → VALOR → [Icon] → SOLUÇÃO → [Icon] → EFICIÊNCIA (6 elements)
    const outputElements = [
      { type: 'icon', color: 'text-cyan-300' },
      { type: 'badge', text: 'VALOR', bg: '#06b6d4', textColor: '#0f172a' },
      { type: 'icon', color: 'text-violet-300' },
      { type: 'badge', text: 'SOLUÇÃO', bg: '#8b5cf6', textColor: '#fff' },
      { type: 'icon', color: 'text-cyan-300' },
      { type: 'badge', text: 'EFICIÊNCIA', bg: '#22d3ee', textColor: '#0f172a', width: 96 },
    ];

    return (
      <div className="w-full mt-12 relative">
        {/* Container with cyberpunk styling */}
        <div className="relative rounded-2xl overflow-hidden border border-cyan-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          {/* Tech icons background */}
          {renderDiagramBackground()}

          {/* Main cognitive flow diagram */}
          <svg 
            viewBox="0 0 1000 280" 
            className="w-full h-auto relative z-10 py-6"
          >
            <defs>
              {/* Human brain gradient - warm magenta/pink */}
              <linearGradient id="humanBrainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#f472b6" stopOpacity="1" />
                <stop offset="100%" stopColor="#db2777" stopOpacity="0.9" />
              </linearGradient>
              
              {/* AI brain gradient - cool cyan/teal */}
              <linearGradient id="aiBrainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#22d3ee" stopOpacity="1" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.9" />
              </linearGradient>

              {/* Input flow gradient (warm to cool) */}
              <linearGradient id="inputFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>

              {/* Output flow gradient (cool to warm) */}
              <linearGradient id="outputFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>

              {/* Glow filters */}
              <filter id="brainGlowPink" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feFlood floodColor="#ec4899" floodOpacity="0.5" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="brainGlowCyan" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feFlood floodColor="#06b6d4" floodOpacity="0.5" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Motion paths - extended to brain centers */}
              <path id="inputPath" d="M140,120 C350,50 650,50 860,120" fill="none" />
              <path id="outputPath" d="M860,160 C650,230 350,230 140,160" fill="none" />
            </defs>

            {/* === LEFT SIDE: Human Brain === */}
            <g transform="translate(140, 140)">
              {/* Glow ring */}
              <circle r="65" fill="none" stroke="url(#humanBrainGrad)" strokeWidth="2" opacity="0.4" filter="url(#brainGlowPink)">
                <animate attributeName="r" values="60;65;60" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.5;0.3" dur="3s" repeatCount="indefinite" />
              </circle>
              
              {/* Main circle */}
              <circle r="52" fill="url(#humanBrainGrad)" opacity="0.9" />
              <circle r="48" fill="#0c1929" opacity="0.8" />
              
              {/* Lucide Brain Icon via foreignObject */}
              <foreignObject x="-32" y="-32" width="64" height="64">
                <div className="w-full h-full flex items-center justify-center">
                  <Brain className="w-14 h-14 text-pink-400 drop-shadow-[0_0_12px_rgba(236,72,153,0.8)]" />
                </div>
              </foreignObject>
              
              {/* Label below */}
              <text y="85" textAnchor="middle" fill="#f472b6" fontSize="14" fontWeight="700">Cérebro Humano</text>
            </g>

            {/* === RIGHT SIDE: AI/Computational Brain === */}
            <g transform="translate(860, 140)">
              {/* Glow ring */}
              <circle r="65" fill="none" stroke="url(#aiBrainGrad)" strokeWidth="2" opacity="0.4" filter="url(#brainGlowCyan)">
                <animate attributeName="r" values="60;65;60" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.5;0.3" dur="2.5s" repeatCount="indefinite" />
              </circle>
              
              {/* Main circle */}
              <circle r="52" fill="url(#aiBrainGrad)" opacity="0.9" />
              <circle r="48" fill="#0c1929" opacity="0.8" />
              
              {/* Lucide Sparkles Icon via foreignObject */}
              <foreignObject x="-32" y="-32" width="64" height="64">
                <div className="w-full h-full flex items-center justify-center">
                  <Sparkles className="w-14 h-14 text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
                </div>
              </foreignObject>

              {/* IA Label below icon */}
              <text y="10" textAnchor="middle" fill="#22d3ee" fontSize="16" fontWeight="900" opacity="0.9">IA</text>
              
              {/* Label below */}
              <text y="85" textAnchor="middle" fill="#22d3ee" fontSize="14" fontWeight="700">Cérebro Computacional</text>
            </g>

            {/* INPUT FLOW: Human → AI (Top arc) */}
            <g>
              {/* Flow path line */}
              <path 
                d="M140,120 C350,50 650,50 860,120" 
                fill="none" 
                stroke="url(#inputFlowGrad)" 
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.6"
              />
              
              {/* Animated dashes on path */}
              <path 
                d="M140,120 C350,50 650,50 860,120" 
                fill="none" 
                stroke="url(#inputFlowGrad)" 
                strokeWidth="2"
                strokeDasharray="12,8"
                opacity="0.8"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-40" dur="1.5s" repeatCount="indefinite" />
              </path>

              {/* INPUT Elements - Continuous flow Human → AI */}
              {inputElements.map((el, index) => (
                <g key={`input-${index}`}>
                  <animateMotion 
                    dur={`${ANIMATION_DURATION}s`} 
                    begin={`${index * STAGGER_DELAY}s`} 
                    repeatCount="indefinite" 
                    calcMode="linear"
                  >
                    <mpath href="#inputPath" />
                  </animateMotion>
                  <animate 
                    attributeName="opacity" 
                    values="0;1;1;0" 
                    keyTimes="0;0.05;0.95;1" 
                    dur={`${ANIMATION_DURATION}s`} 
                    begin={`${index * STAGGER_DELAY}s`} 
                    repeatCount="indefinite"
                  />
                  {el.type === 'icon' ? (
                    <foreignObject x="-14" y="-14" width="28" height="28">
                      <div className="w-full h-full flex items-center justify-center">
                        <MessageCircle className={`w-6 h-6 ${el.color} drop-shadow-[0_0_10px_rgba(236,72,153,0.9)]`} />
                      </div>
                    </foreignObject>
                  ) : (
                    <>
                      <rect 
                        x={el.text === 'PROMPT' ? -40 : el.text === 'Dados' ? -34 : -40} 
                        y="-14" 
                        width={el.text === 'PROMPT' ? 80 : el.text === 'Dados' ? 68 : 80} 
                        height="28" 
                        rx="14" 
                        fill={el.bg} 
                        opacity="0.95" 
                      />
                      <text x="0" y="6" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">{el.text}</text>
                    </>
                  )}
                </g>
              ))}
            </g>

            {/* OUTPUT FLOW: AI → Human (Bottom arc) */}
            <g>
              {/* Flow path line */}
              <path 
                d="M860,160 C650,230 350,230 140,160" 
                fill="none" 
                stroke="url(#outputFlowGrad)" 
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.6"
              />
              
              {/* Animated dashes on path */}
              <path 
                d="M860,160 C650,230 350,230 140,160" 
                fill="none" 
                stroke="url(#outputFlowGrad)" 
                strokeWidth="2"
                strokeDasharray="12,8"
                opacity="0.8"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-40" dur="1.5s" repeatCount="indefinite" />
              </path>

              {/* OUTPUT Elements - Continuous flow AI → Human */}
              {outputElements.map((el, index) => (
                <g key={`output-${index}`}>
                  <animateMotion 
                    dur={`${ANIMATION_DURATION}s`} 
                    begin={`${index * STAGGER_DELAY}s`} 
                    repeatCount="indefinite" 
                    calcMode="linear"
                  >
                    <mpath href="#outputPath" />
                  </animateMotion>
                  <animate 
                    attributeName="opacity" 
                    values="0;1;1;0" 
                    keyTimes="0;0.05;0.95;1" 
                    dur={`${ANIMATION_DURATION}s`} 
                    begin={`${index * STAGGER_DELAY}s`} 
                    repeatCount="indefinite"
                  />
                  {el.type === 'icon' ? (
                    <foreignObject x="-14" y="-14" width="28" height="28">
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className={`w-6 h-6 ${el.color} drop-shadow-[0_0_10px_rgba(6,182,212,0.9)]`} />
                      </div>
                    </foreignObject>
                  ) : (
                    <>
                      <rect 
                        x={-(el.width || 60) / 2} 
                        y="-14" 
                        width={el.width || 60} 
                        height="28" 
                        rx="14" 
                        fill={el.bg} 
                        opacity="0.95" 
                      />
                      <text x="0" y="6" textAnchor="middle" fill={el.textColor} fontSize="12" fontWeight="600">{el.text}</text>
                    </>
                  )}
                </g>
              ))}
            </g>
          </svg>
        </div>

      </div>
    );
  };

  // Cards view
  if (selectedView === 'cards') {
    return (
      <TooltipProvider>
        <div className="min-h-screen relative overflow-hidden">
          {/* FULL PAGE CYBERPUNK HERO BACKGROUND */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0a1628] to-[#0d1b2a]">
            <svg width="100%" height="100%" className="absolute inset-0">
              <defs>
                {/* Cyberpunk gradient */}
                <linearGradient id="heroGradientCyan" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9">
                    <animate attributeName="stop-opacity" values="0.5;0.9;0.5" dur="4s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.7">
                    <animate attributeName="stop-opacity" values="0.7;0.4;0.7" dur="5s" repeatCount="indefinite" />
                  </stop>
                </linearGradient>
                <linearGradient id="heroGradientPurple" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0.6" />
                </linearGradient>
                
                {/* Glow filter */}
                <filter id="heroGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Hexagonal circuit grid pattern */}
              {Array.from({ length: 30 }).map((_, i) => {
                const col = i % 10;
                const row = Math.floor(i / 10);
                const x = col * 120 + (row % 2 === 0 ? 0 : 60);
                const y = row * 100 + 30;
                return (
                  <polygon
                    key={`hero-hex-${i}`}
                    points={`${x + 30},${y} ${x + 60},${y + 17} ${x + 60},${y + 52} ${x + 30},${y + 69} ${x},${y + 52} ${x},${y + 17}`}
                    fill="none"
                    stroke="url(#heroGradientCyan)"
                    strokeWidth="0.5"
                    opacity="0.15"
                  >
                    <animate attributeName="opacity" values="0.05;0.25;0.05" dur={`${4 + (i % 4)}s`} begin={`${i * 0.15}s`} repeatCount="indefinite" />
                  </polygon>
                );
              })}

              {/* Flowing code streams - vertical */}
              {['01101', '10010', '11100', '00111', '10101', '01110', '11001', '00100'].map((code, i) => (
                <text
                  key={`hero-code-${i}`}
                  x={`${8 + i * 12}%`}
                  y="-5%"
                  fill="url(#heroGradientCyan)"
                  fontSize="10"
                  fontFamily="monospace"
                  opacity="0"
                >
                  <animate attributeName="y" values="-5%;105%" dur={`${8 + i * 1.5}s`} begin={`${i * 1.2}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0;0.5;0.5;0" dur={`${8 + i * 1.5}s`} begin={`${i * 1.2}s`} repeatCount="indefinite" />
                  {code}
                </text>
              ))}

              {/* Network nodes pulsing with connections */}
              {[
                { x: '8%', y: '15%' }, { x: '22%', y: '35%' }, { x: '15%', y: '65%' }, { x: '35%', y: '20%' },
                { x: '45%', y: '50%' }, { x: '55%', y: '25%' }, { x: '65%', y: '70%' }, { x: '78%', y: '40%' },
                { x: '85%', y: '18%' }, { x: '92%', y: '60%' }, { x: '50%', y: '85%' }, { x: '30%', y: '80%' }
              ].map((node, i) => (
                <g key={`hero-node-${i}`} filter="url(#heroGlow)">
                  <circle cx={node.x} cy={node.y} r="3" fill="url(#heroGradientCyan)" opacity="0.6">
                    <animate attributeName="r" values="2;5;2" dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0.8;0.3" dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" />
                  </circle>
                </g>
              ))}

              {/* Animated connection lines between nodes */}
              {[
                { x1: '8%', y1: '15%', x2: '22%', y2: '35%' },
                { x1: '22%', y1: '35%', x2: '35%', y2: '20%' },
                { x1: '35%', y1: '20%', x2: '55%', y2: '25%' },
                { x1: '55%', y1: '25%', x2: '78%', y2: '40%' },
                { x1: '78%', y1: '40%', x2: '85%', y2: '18%' },
                { x1: '15%', y1: '65%', x2: '45%', y2: '50%' },
                { x1: '45%', y1: '50%', x2: '65%', y2: '70%' },
                { x1: '65%', y1: '70%', x2: '92%', y2: '60%' },
                { x1: '30%', y1: '80%', x2: '50%', y2: '85%' },
                { x1: '50%', y1: '85%', x2: '65%', y2: '70%' }
              ].map((line, i) => (
                <line
                  key={`hero-conn-${i}`}
                  x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                  stroke="url(#heroGradientCyan)"
                  strokeWidth="1"
                  strokeDasharray="6,4"
                  opacity="0.3"
                >
                  <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.15;0.4;0.15" dur={`${3 + i * 0.3}s`} repeatCount="indefinite" />
                </line>
              ))}

              {/* Server wireframes with pulsing */}
              {[
                { x: 80, y: 120 }, { x: 250, y: 280 }, { x: 450, y: 150 },
                { x: 700, y: 320 }, { x: 900, y: 180 }, { x: 1100, y: 350 }
              ].map((server, i) => (
                <g key={`hero-server-${i}`} transform={`translate(${server.x}, ${server.y})`} opacity="0.25">
                  <rect x="0" y="0" width="40" height="55" rx="3" fill="none" stroke="url(#heroGradientCyan)" strokeWidth="1.5">
                    <animate attributeName="opacity" values="0.2;0.6;0.2" dur={`${4 + i}s`} repeatCount="indefinite" />
                  </rect>
                  {/* Server rack lines */}
                  {[12, 24, 36].map((lineY, j) => (
                    <line key={j} x1="5" y1={lineY} x2="35" y2={lineY} stroke="url(#heroGradientCyan)" strokeWidth="1">
                      <animate attributeName="opacity" values="0.2;0.7;0.2" dur={`${3 + j}s`} begin={`${i * 0.5}s`} repeatCount="indefinite" />
                    </line>
                  ))}
                  {/* Status LEDs */}
                  <circle cx="8" cy="8" r="2" fill="#22d3ee">
                    <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
                  </circle>
                </g>
              ))}

              {/* Data particles flowing across screen */}
              {Array.from({ length: 15 }).map((_, i) => (
                <circle key={`hero-particle-${i}`} r="2" fill="url(#heroGradientCyan)" opacity="0">
                  <animate attributeName="cx" values={`${-5 + (i % 5) * 2}%;${105}%`} dur={`${10 + i * 2}s`} begin={`${i * 0.8}s`} repeatCount="indefinite" />
                  <animate attributeName="cy" values={`${10 + (i % 8) * 10}%;${15 + ((i + 3) % 7) * 12}%;${8 + (i % 9) * 10}%`} dur={`${10 + i * 2}s`} begin={`${i * 0.8}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0;0.7;0.7;0" dur={`${10 + i * 2}s`} begin={`${i * 0.8}s`} repeatCount="indefinite" />
                </circle>
              ))}

              {/* Large decorative circuit paths */}
              <path
                d="M0,200 Q200,150 400,200 T800,180 T1200,220"
                fill="none"
                stroke="url(#heroGradientPurple)"
                strokeWidth="1"
                strokeDasharray="10,8"
                opacity="0.2"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-36" dur="4s" repeatCount="indefinite" />
              </path>
              <path
                d="M0,400 Q300,350 600,420 T1200,380"
                fill="none"
                stroke="url(#heroGradientCyan)"
                strokeWidth="1"
                strokeDasharray="8,6"
                opacity="0.15"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="5s" repeatCount="indefinite" />
              </path>
            </svg>
          </div>
          
          {/* Content layer above background */}
          <div className="relative z-10">
          {renderHeader()}
          <div className="max-w-7xl mx-auto px-6 pb-12 space-y-8 relative z-10">
            <div className="text-center py-6">
              <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-4">Arquitetura de Infraestrutura</h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Selecione uma visualização para explorar a arquitetura do sistema
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ArchitectureCard
                title="Arquitetura de GPU"
                description="Infraestrutura GPU com LoRA Adapters para inferência multi-tenant"
                icon={Server}
                color="cyan"
                badge="AWS g5.xlarge"
                onClick={() => setSelectedView('gpu')}
              />
              <ArchitectureCard
                title="Uma Empresa, Vários Departamentos"
                description="SLM customizado por departamento com base de conhecimento compartilhada"
                icon={Building2}
                color="green"
                badge="Multi-RAG"
                onClick={() => setSelectedView('department-choice')}
              />
              <ArchitectureCard
                title="Empresas Diferentes"
                description="SLM modular para múltiplas empresas com isolamento completo"
                icon={Factory}
                color="purple"
                badge="SaaS"
                onClick={() => setSelectedView('saas-choice')}
              />
            </div>

            {/* Brain Flow Animation */}
            {renderBrainFlowAnimation()}
          </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Department choice view
  if (selectedView === 'department-choice') {
    return (
      <TooltipProvider>
        <div className="min-h-screen relative overflow-hidden">
          {renderHeroBackground()}
          <div className="relative z-10">
            {renderHeader()}
            <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
              <BackButton onClick={goToCards} />
              
              <div>
                <h1 className="text-3xl font-bold text-gradient">Uma Empresa, Vários Departamentos</h1>
                <p className="text-muted-foreground mt-2">
                  Selecione o tipo de visualização da arquitetura
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ArchitectureCard
                  title="Esquema Estático"
                  description="Diagrama estrutural com hierarquia de departamentos e fluxo de dados"
                  icon={FileImage}
                  color="green"
                  badge="Estrutura"
                  onClick={() => setSelectedView('department-static')}
                />
                <ArchitectureCard
                  title="Sistema Dinâmico"
                  description="Visualização animada com fluxos de segurança e compartilhamento de conhecimento"
                  icon={Activity}
                  color="cyan"
                  badge="Animado"
                  onClick={() => setSelectedView('department-dynamic')}
                />
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Department static view
  if (selectedView === 'department-static') {
    return (
      <TooltipProvider>
        <div className="min-h-screen relative overflow-hidden">
          {renderHeroBackground()}
          <div className="relative z-10">
            {renderHeader()}
            <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
              <BackButton onClick={goToDepartmentChoice} />
              <DepartmentArchitectureDiagram />
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Department dynamic view
  if (selectedView === 'department-dynamic') {
    return (
      <TooltipProvider>
        <div className="min-h-screen relative overflow-hidden">
          {renderHeroBackground()}
          <div className="relative z-10">
            {renderHeader()}
            <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
              <BackButton onClick={goToDepartmentChoice} />
              <DynamicSLMArchitectureDiagram />
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // SaaS choice view
  if (selectedView === 'saas-choice') {
    return (
      <TooltipProvider>
        <div className="min-h-screen relative overflow-hidden">
          {renderHeroBackground()}
          <div className="relative z-10">
            {renderHeader()}
            <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
              <BackButton onClick={goToCards} />
              
              <div>
                <h1 className="text-3xl font-bold text-gradient">Empresas Diferentes</h1>
                <p className="text-muted-foreground mt-2">
                  Selecione o tipo de visualização da arquitetura SLM multi-tenant
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ArchitectureCard
                  title="Esquema Estático"
                  description="Diagrama estrutural com pipeline de inferência e RAG customizado"
                  icon={FileImage}
                  color="purple"
                  badge="Estrutura"
                  onClick={() => setSelectedView('saas-static')}
                />
                <ArchitectureCard
                  title="Sistema Dinâmico"
                  description="Visualização lúdica com fluxos de segurança, hiperfoco e eficiência compartilhada"
                  icon={Activity}
                  color="cyan"
                  badge="Animado"
                  onClick={() => setSelectedView('saas-dynamic')}
                />
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // SaaS static view
  if (selectedView === 'saas-static') {
    return (
      <TooltipProvider>
        <div className="min-h-screen relative overflow-hidden">
          {renderHeroBackground()}
          <div className="relative z-10">
            {renderHeader()}
            <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
              <BackButton onClick={goToSaasChoice} />
              <SaasRagArchitectureDiagram />
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // SaaS dynamic view
  if (selectedView === 'saas-dynamic') {
    return (
      <TooltipProvider>
        <div className="min-h-screen relative overflow-hidden">
          {renderHeroBackground()}
          <div className="relative z-10">
            {renderHeader()}
            <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
              <BackButton onClick={goToSaasChoice} />
              <HyperModularSLMDiagram />
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // GPU view
  return (
    <TooltipProvider>
      <div className="min-h-screen relative overflow-hidden">
        {renderHeroBackground()}
        <div className="relative z-10">
        {renderHeader()}
        <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
          <BackButton onClick={goToCards} />
          
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-shrink-0">
              <h1 className="text-3xl font-bold text-gradient">Arquitetura KY AI SLM</h1>
              <p className="text-muted-foreground mt-1">
                Small Language Model Infrastructure - Base Model + LoRA Adapters
              </p>
            </div>

            {/* Audio Player */}
            <div className="flex items-center gap-3 bg-card border border-primary/30 rounded-lg px-4 py-2 flex-shrink-0">
              <Headphones className="h-4 w-4 text-primary flex-shrink-0" />
              <span 
                className="text-sm font-medium max-w-[200px] truncate text-foreground" 
                title={AUDIO_TITLE}
              >
                {AUDIO_TITLE}
              </span>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleAudioPlayPause} 
                  className="h-8 w-8 hover:bg-primary/20"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  {isPlaying && <Pause className="h-4 w-4 text-primary" />}
                  {!isLoading && !isPlaying && <Play className="h-4 w-4 text-primary" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleAudioDownload} 
                  className="h-8 w-8 hover:bg-primary/20"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Zoom Controls */}
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1 flex-shrink-0">
              <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground w-12 text-center">{zoom}%</span>
              <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleReset} className="h-8 w-8">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Simulation Controls */}
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={startSimulation} 
                  disabled={isSimulating}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  {isSimulating ? 'Simulando...' : 'Simular Requisição'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={resetSimulation}
                  disabled={currentPhase === 'idle'}
                  className="gap-2"
                >
                  <RotateCw className="h-4 w-4" />
                  Resetar
                </Button>
                {currentPhase !== 'idle' && (
                  <Badge variant="outline" className={getPhaseColor()}>
                    {getPhaseLabel()}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Main Architecture SVG - Full AI Process Flow Animation */}
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <div 
                className="relative overflow-auto"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              >
                <svg 
                  key={animationKey}
                  viewBox="0 0 1000 750" 
                  className="w-full h-auto min-h-[650px]"
                  style={{ minWidth: '900px' }}
                >
                  {/* Definitions */}
                  <defs>
                    {/* Glow filters */}
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                    <filter id="glowStrong" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                    
                    {/* Gradients */}
                    <linearGradient id="requestGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                    <linearGradient id="routingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                    <linearGradient id="vectorDbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                    <linearGradient id="relationalDbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                    <linearGradient id="gpuGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#16a34a" />
                    </linearGradient>
                    <linearGradient id="s3Grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#ea580c" />
                    </linearGradient>
                    <linearGradient id="responseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                    
                    {/* Animation paths */}
                    <path id="pathUserToAPI" d="M500,70 L500,130" />
                    <path id="pathAPIToOrchestrator" d="M500,170 L500,230" />
                    <path id="pathToVectorDB" d="M500,290 Q350,320 200,360" />
                    <path id="pathToRelationalDB" d="M500,290 Q650,320 800,360" />
                    <path id="pathOrchestratorToGPU" d="M500,290 L500,420" />
                    <path id="pathVectorToGPU" d="M200,420 Q350,480 420,480" />
                    <path id="pathS3ToGPU" d="M900,480 L720,480" />
                    <path id="pathGPUToResponse" d="M500,560 L500,640" />
                    <path id="pathResponseToUser" d="M500,680 Q200,600 100,100" />
                    
                    {/* Arrow marker */}
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--primary))" />
                    </marker>
                  </defs>

                  {/* Background Grid */}
                  <g opacity="0.08">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <line key={`v-${i}`} x1={i * 40} y1="0" x2={i * 40} y2="750" stroke="#06b6d4" strokeWidth="0.5" />
                    ))}
                    {Array.from({ length: 20 }).map((_, i) => (
                      <line key={`h-${i}`} x1="0" y1={i * 40} x2="1000" y2={i * 40} stroke="#06b6d4" strokeWidth="0.5" />
                    ))}
                  </g>

                  {/* ============ COMPONENT BLOCKS ============ */}
                  
                  {/* 1. USER / COMPANY - Top */}
                  <g filter={currentPhase === 'request' ? 'url(#glowStrong)' : undefined}>
                    <rect x="420" y="30" width="160" height="50" rx="25" 
                      fill={currentPhase === 'request' ? 'url(#requestGrad)' : '#1e1b4b'} 
                      stroke="#a855f7" strokeWidth="2" 
                      opacity={currentPhase === 'request' ? 1 : 0.7}
                    />
                    <text x="500" y="62" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">
                      👤 Empresa / Usuário
                    </text>
                    {currentPhase === 'request' && (
                      <rect x="420" y="30" width="160" height="50" rx="25" fill="none" stroke="#a855f7" strokeWidth="3">
                        <animate attributeName="stroke-opacity" values="1;0.3;1" dur="0.5s" repeatCount="indefinite" />
                      </rect>
                    )}
                  </g>

                  {/* 2. API GATEWAY */}
                  <g filter={currentPhase === 'routing' ? 'url(#glowStrong)' : undefined}>
                    <rect x="420" y="120" width="160" height="60" rx="10" 
                      fill={currentPhase === 'routing' ? 'url(#routingGrad)' : '#0c2d48'} 
                      stroke="#3b82f6" strokeWidth="2"
                      opacity={currentPhase === 'routing' ? 1 : 0.7}
                    />
                    <text x="500" y="148" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold">🔌 API Gateway</text>
                    <text x="500" y="168" textAnchor="middle" fill="#94a3b8" fontSize="10">REST / WebSocket</text>
                    {currentPhase === 'routing' && (
                      <rect x="420" y="120" width="160" height="60" rx="10" fill="none" stroke="#3b82f6" strokeWidth="3">
                        <animate attributeName="stroke-opacity" values="1;0.3;1" dur="0.5s" repeatCount="indefinite" />
                      </rect>
                    )}
                  </g>

                  {/* 3. ORCHESTRATOR */}
                  <g filter={currentPhase === 'check-adapter' ? 'url(#glowStrong)' : undefined}>
                    <rect x="400" y="220" width="200" height="80" rx="12" 
                      fill={currentPhase === 'check-adapter' ? 'url(#routingGrad)' : '#0f2942'} 
                      stroke="#06b6d4" strokeWidth="2"
                      opacity={['check-adapter', 'load-adapter'].includes(currentPhase) ? 1 : 0.7}
                    />
                    <text x="500" y="250" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold">🎯 Orquestrador</text>
                    <text x="500" y="270" textAnchor="middle" fill="#94a3b8" fontSize="10">Route by company_id</text>
                    <text x="500" y="288" textAnchor="middle" fill="#22d3ee" fontSize="10" fontWeight="bold">
                      {currentPhase === 'check-adapter' ? '🔍 Verificando adapter...' : 
                       currentPhase === 'load-adapter' ? '⬇️ Carregando LoRA...' : 'Idle'}
                    </text>
                    {currentPhase === 'check-adapter' && (
                      <rect x="400" y="220" width="200" height="80" rx="12" fill="none" stroke="#06b6d4" strokeWidth="3">
                        <animate attributeName="stroke-opacity" values="1;0.3;1" dur="0.5s" repeatCount="indefinite" />
                      </rect>
                    )}
                  </g>

                  {/* 4. VECTOR DB (RAG) - Left */}
                  <g filter={currentPhase === 'check-adapter' ? 'url(#glow)' : undefined}>
                    <rect x="100" y="340" width="180" height="100" rx="12" 
                      fill={currentPhase === 'check-adapter' ? 'url(#vectorDbGrad)' : '#1e1b4b'} 
                      stroke="#8b5cf6" strokeWidth="2"
                      opacity={currentPhase === 'check-adapter' ? 1 : 0.6}
                    />
                    <text x="190" y="375" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">🧠 Vector DB</text>
                    <text x="190" y="395" textAnchor="middle" fill="#c4b5fd" fontSize="10">RAG Embeddings</text>
                    <text x="190" y="415" textAnchor="middle" fill="#a78bfa" fontSize="9">pgvector / Pinecone</text>
                    <text x="190" y="432" textAnchor="middle" fill="#22d3ee" fontSize="9" fontWeight="bold">
                      {currentPhase === 'check-adapter' ? '🔎 Buscando contexto...' : ''}
                    </text>
                    {currentPhase === 'check-adapter' && (
                      <circle cx="270" cy="350" r="8" fill="#8b5cf6">
                        <animate attributeName="opacity" values="1;0.3;1" dur="0.3s" repeatCount="indefinite" />
                      </circle>
                    )}
                  </g>

                  {/* 5. RELATIONAL DB - Right */}
                  <g filter={currentPhase === 'check-adapter' ? 'url(#glow)' : undefined}>
                    <rect x="720" y="340" width="180" height="100" rx="12" 
                      fill={currentPhase === 'check-adapter' ? 'url(#relationalDbGrad)' : '#0c2d48'} 
                      stroke="#3b82f6" strokeWidth="2"
                      opacity={currentPhase === 'check-adapter' ? 1 : 0.6}
                    />
                    <text x="810" y="375" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">💾 Relational DB</text>
                    <text x="810" y="395" textAnchor="middle" fill="#93c5fd" fontSize="10">PostgreSQL / Supabase</text>
                    <text x="810" y="415" textAnchor="middle" fill="#60a5fa" fontSize="9">Users, Configs, Logs</text>
                    <text x="810" y="432" textAnchor="middle" fill="#22d3ee" fontSize="9" fontWeight="bold">
                      {currentPhase === 'check-adapter' ? '🔎 Validando empresa...' : ''}
                    </text>
                    {currentPhase === 'check-adapter' && (
                      <circle cx="730" cy="350" r="8" fill="#3b82f6">
                        <animate attributeName="opacity" values="1;0.3;1" dur="0.3s" repeatCount="indefinite" />
                      </circle>
                    )}
                  </g>

                  {/* 6. S3 STORAGE - Far Right */}
                  <g filter={currentPhase === 'load-adapter' ? 'url(#glowStrong)' : undefined}>
                    <rect x="850" y="460" width="120" height="80" rx="10" 
                      fill={currentPhase === 'load-adapter' ? 'url(#s3Grad)' : '#422006'} 
                      stroke="#f97316" strokeWidth="2"
                      opacity={currentPhase === 'load-adapter' ? 1 : 0.6}
                    />
                    <text x="910" y="490" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">📦 S3 Storage</text>
                    <text x="910" y="508" textAnchor="middle" fill="#fdba74" fontSize="9">LoRA Adapters</text>
                    <text x="910" y="525" textAnchor="middle" fill="#fb923c" fontSize="9">(~50MB each)</text>
                    {currentPhase === 'load-adapter' && (
                      <rect x="850" y="460" width="120" height="80" rx="10" fill="none" stroke="#f97316" strokeWidth="3">
                        <animate attributeName="stroke-opacity" values="1;0.3;1" dur="0.3s" repeatCount="indefinite" />
                      </rect>
                    )}
                  </g>

                  {/* 7. GPU CLUSTER - Main Processing Area */}
                  <g filter={currentPhase === 'inference' ? 'url(#glowStrong)' : undefined}>
                    <rect x="300" y="420" width="400" height="160" rx="16" 
                      fill={currentPhase === 'inference' ? '#052e16' : '#0a1f0a'} 
                      stroke="#22c55e" strokeWidth="3"
                      opacity={currentPhase === 'inference' ? 1 : 0.8}
                    />
                    <text x="500" y="448" textAnchor="middle" fill="#22c55e" fontSize="14" fontWeight="bold">
                      ⚡ GPU Cluster (AWS g5.xlarge)
                    </text>
                    
                    {/* Base Model inside GPU */}
                    <rect x="340" y="460" width="160" height="50" rx="8" fill="#134e4a" stroke="#14b8a6" strokeWidth="2" />
                    <text x="420" y="485" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">Base Model</text>
                    <text x="420" y="500" textAnchor="middle" fill="#5eead4" fontSize="9">Llama 3.2 / Qwen 2.5</text>
                    
                    {/* LoRA Adapter inside GPU */}
                    <rect x="520" y="460" width="140" height="50" rx="8" 
                      fill={adapterLoaded ? '#065f46' : '#1e293b'} 
                      stroke={adapterLoaded ? '#10b981' : '#475569'} strokeWidth="2"
                    >
                      {currentPhase === 'load-adapter' && (
                        <animate attributeName="fill" values="#1e293b;#065f46;#1e293b" dur="0.5s" repeatCount="indefinite" />
                      )}
                    </rect>
                    <text x="590" y="485" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">
                      {adapterLoaded ? '✓ LoRA A' : 'LoRA Slot'}
                    </text>
                    <text x="590" y="500" textAnchor="middle" fill={adapterLoaded ? '#6ee7b7' : '#94a3b8'} fontSize="9">
                      {adapterLoaded ? 'Loaded!' : 'Waiting...'}
                    </text>
                    
                    {/* SLM Inference */}
                    <rect x="380" y="520" width="240" height="45" rx="8" 
                      fill={currentPhase === 'inference' ? '#166534' : '#14532d'} 
                      stroke="#4ade80" strokeWidth="2"
                    >
                      {currentPhase === 'inference' && (
                        <animate attributeName="fill" values="#14532d;#166534;#14532d" dur="0.3s" repeatCount="indefinite" />
                      )}
                    </rect>
                    <text x="500" y="548" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">
                      {currentPhase === 'inference' ? '🔥 SLM Processing...' : '🧠 SLM Inference Engine'}
                    </text>
                    
                    {currentPhase === 'inference' && (
                      <g>
                        <circle cx="340" cy="545" r="6" fill="#4ade80">
                          <animate attributeName="opacity" values="1;0.2;1" dur="0.2s" repeatCount="indefinite" />
                        </circle>
                        <circle cx="660" cy="545" r="6" fill="#4ade80">
                          <animate attributeName="opacity" values="0.2;1;0.2" dur="0.2s" repeatCount="indefinite" />
                        </circle>
                      </g>
                    )}
                  </g>

                  {/* 8. RESPONSE - Bottom */}
                  <g filter={currentPhase === 'response' || currentPhase === 'complete' ? 'url(#glowStrong)' : undefined}>
                    <rect x="400" y="620" width="200" height="60" rx="12" 
                      fill={currentPhase === 'complete' ? '#065f46' : currentPhase === 'response' ? 'url(#responseGrad)' : '#0c4a6e'} 
                      stroke={currentPhase === 'complete' ? '#10b981' : '#06b6d4'} strokeWidth="2"
                      opacity={['response', 'complete'].includes(currentPhase) ? 1 : 0.6}
                    />
                    <text x="500" y="648" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold">
                      {currentPhase === 'complete' ? '✅ Resposta Entregue!' : '📤 Response'}
                    </text>
                    <text x="500" y="668" textAnchor="middle" fill={currentPhase === 'complete' ? '#6ee7b7' : '#7dd3fc'} fontSize="10">
                      {currentPhase === 'complete' ? 'Latência: ~150ms' : 'JSON / Stream'}
                    </text>
                    {currentPhase === 'complete' && (
                      <circle cx="500" cy="650" r="40" fill="none" stroke="#10b981" strokeWidth="2" opacity="0">
                        <animate attributeName="r" values="20;60" dur="1s" fill="freeze" />
                        <animate attributeName="opacity" values="0.8;0" dur="1s" fill="freeze" />
                      </circle>
                    )}
                  </g>

                  {/* ============ CONNECTION LINES ============ */}
                  
                  {/* User → API */}
                  <path d="M500,80 L500,120" stroke="#a855f7" strokeWidth="2" strokeDasharray="6,3" opacity="0.6" />
                  
                  {/* API → Orchestrator */}
                  <path d="M500,180 L500,220" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6,3" opacity="0.6" />
                  
                  {/* Orchestrator → Vector DB */}
                  <path d="M400,270 Q300,300 280,340" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="6,3" opacity="0.5" />
                  
                  {/* Orchestrator → Relational DB */}
                  <path d="M600,270 Q700,300 720,340" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6,3" opacity="0.5" />
                  
                  {/* Orchestrator → GPU */}
                  <path d="M500,300 L500,420" stroke="#22c55e" strokeWidth="3" strokeDasharray="8,4" opacity="0.6" />
                  
                  {/* Vector DB → GPU (RAG context) */}
                  <path d="M280,420 Q320,450 340,480" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="5,3" opacity="0.4" />
                  
                  {/* S3 → GPU (LoRA loading) */}
                  <path d="M850,500 L700,500" stroke="#f97316" strokeWidth="2" strokeDasharray="6,3" opacity={currentPhase === 'load-adapter' ? 1 : 0.4} />
                  
                  {/* GPU → Response */}
                  <path d="M500,580 L500,620" stroke="#06b6d4" strokeWidth="3" strokeDasharray="8,4" opacity="0.6" />

                  {/* ============ ANIMATED DATA PACKETS ============ */}
                  
                  {/* Packet: User → API (Phase: request) */}
                  {currentPhase === 'request' && (
                    <g>
                      <circle r="10" fill="#a855f7" filter="url(#glow)">
                        <animateMotion dur="0.8s" fill="freeze">
                          <mpath href="#pathUserToAPI" />
                        </animateMotion>
                        <animate attributeName="opacity" values="1;0.6;1" dur="0.3s" repeatCount="indefinite" />
                      </circle>
                      <circle r="6" fill="#ec4899">
                        <animateMotion dur="0.8s" fill="freeze">
                          <mpath href="#pathUserToAPI" />
                        </animateMotion>
                      </circle>
                    </g>
                  )}

                  {/* Packet: API → Orchestrator (Phase: routing) */}
                  {currentPhase === 'routing' && (
                    <g>
                      <circle r="10" fill="#3b82f6" filter="url(#glow)">
                        <animateMotion dur="0.8s" fill="freeze">
                          <mpath href="#pathAPIToOrchestrator" />
                        </animateMotion>
                      </circle>
                      <circle r="5" fill="#06b6d4">
                        <animateMotion dur="0.8s" fill="freeze">
                          <mpath href="#pathAPIToOrchestrator" />
                        </animateMotion>
                      </circle>
                    </g>
                  )}

                  {/* Packets: Orchestrator → DBs (Phase: check-adapter) */}
                  {currentPhase === 'check-adapter' && (
                    <g>
                      {/* To Vector DB */}
                      <circle r="8" fill="#8b5cf6" filter="url(#glow)">
                        <animateMotion dur="1s" fill="freeze">
                          <mpath href="#pathToVectorDB" />
                        </animateMotion>
                      </circle>
                      {/* To Relational DB */}
                      <circle r="8" fill="#3b82f6" filter="url(#glow)">
                        <animateMotion dur="1s" fill="freeze">
                          <mpath href="#pathToRelationalDB" />
                        </animateMotion>
                      </circle>
                      {/* To GPU */}
                      <circle r="10" fill="#22c55e" filter="url(#glow)">
                        <animateMotion dur="1.2s" fill="freeze">
                          <mpath href="#pathOrchestratorToGPU" />
                        </animateMotion>
                      </circle>
                    </g>
                  )}

                  {/* Packet: S3 → GPU (Phase: load-adapter) */}
                  {currentPhase === 'load-adapter' && (
                    <g>
                      <rect x="-20" y="-10" width="40" height="20" rx="4" fill="#f97316" filter="url(#glow)">
                        <animateMotion dur="1.2s" fill="freeze">
                          <mpath href="#pathS3ToGPU" />
                        </animateMotion>
                      </rect>
                      <text x="0" y="5" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">
                        <animateMotion dur="1.2s" fill="freeze">
                          <mpath href="#pathS3ToGPU" />
                        </animateMotion>
                        LoRA
                      </text>
                    </g>
                  )}

                  {/* Packet: GPU → Response (Phase: response) */}
                  {currentPhase === 'response' && (
                    <g>
                      <circle r="12" fill="#06b6d4" filter="url(#glow)">
                        <animateMotion dur="0.8s" fill="freeze">
                          <mpath href="#pathGPUToResponse" />
                        </animateMotion>
                      </circle>
                      <circle r="6" fill="#22d3ee">
                        <animateMotion dur="0.8s" fill="freeze">
                          <mpath href="#pathGPUToResponse" />
                        </animateMotion>
                      </circle>
                    </g>
                  )}

                  {/* ============ IDLE STATE - Continuous Flow ============ */}
                  {currentPhase === 'idle' && !isSimulating && (
                    <g opacity="0.4">
                      {/* Slow flowing particles along main path */}
                      {[0, 3, 6, 9].map((delay) => (
                        <circle key={`idle-${delay}`} r="4" fill="#06b6d4">
                          <animate attributeName="cy" values="80;150;260;450;550;640" dur="8s" begin={`${delay}s`} repeatCount="indefinite" />
                          <animate attributeName="cx" values="500;500;500;500;500;500" dur="8s" begin={`${delay}s`} repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0;0.6;0.6;0.6;0.6;0" dur="8s" begin={`${delay}s`} repeatCount="indefinite" />
                        </circle>
                      ))}
                    </g>
                  )}

                  {/* ============ LABELS & LEGEND ============ */}
                  
                  {/* Cost savings badge */}
                  <g transform="translate(50, 620)">
                    <rect width="120" height="50" rx="10" fill="#052e16" stroke="#22c55e" strokeWidth="2" />
                    <text x="60" y="28" textAnchor="middle" fill="#4ade80" fontSize="12" fontWeight="bold">💰 90% Savings</text>
                    <text x="60" y="44" textAnchor="middle" fill="#86efac" fontSize="9">vs dedicated</text>
                  </g>

                  {/* Multi-tenant badge */}
                  <g transform="translate(50, 30)">
                    <rect width="130" height="50" rx="10" fill="#0c4a6e" stroke="#06b6d4" strokeWidth="2" />
                    <text x="65" y="28" textAnchor="middle" fill="#22d3ee" fontSize="11" fontWeight="bold">🏢 Multi-Tenant</text>
                    <text x="65" y="44" textAnchor="middle" fill="#7dd3fc" fontSize="9">1 GPU, N empresas</text>
                  </g>

                  {/* Latency badge */}
                  <g transform="translate(50, 100)">
                    <rect width="100" height="40" rx="8" fill="#1e1b4b" stroke="#8b5cf6" strokeWidth="2" />
                    <text x="50" y="26" textAnchor="middle" fill="#a78bfa" fontSize="10" fontWeight="bold">⚡ ~150ms</text>
                    <text x="50" y="38" textAnchor="middle" fill="#c4b5fd" fontSize="8">avg latency</text>
                  </g>

                </svg>
              </div>
            </CardContent>
          </Card>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <Server className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Multi-Tenant</h4>
                    <p className="text-sm text-muted-foreground">Uma GPU, múltiplas empresas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Layers className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">LoRA Adapters</h4>
                    <p className="text-sm text-muted-foreground">Hot-swap em milissegundos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-500/30 bg-gradient-to-br from-green-500/10 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <DollarSign className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Custo Otimizado</h4>
                    <p className="text-sm text-muted-foreground">90% mais barato que dedicado</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Arquitetura;
