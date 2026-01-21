import { useState, useEffect, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Activity
} from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import ArchitectureCard from "./ArchitectureCard";
import SaasRagArchitectureDiagram from "./SaasRagArchitectureDiagram";
import DepartmentArchitectureDiagram from "./DepartmentArchitectureDiagram";
import { DynamicSLMArchitectureDiagram } from "./DynamicSLMArchitectureDiagram";
import HyperModularSLMDiagram from "./HyperModularSLMDiagram";
import { BrainFlowDiagram } from "./BrainFlowDiagram";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

type SimulationPhase = 'idle' | 'request' | 'routing' | 'check-adapter' | 'load-adapter' | 'inference' | 'response' | 'complete';
type ViewMode = 'cards' | 'gpu' | 'department-choice' | 'department-static' | 'department-dynamic' | 'saas-choice' | 'saas-static' | 'saas-dynamic';

// EXTRACTED: BackButton outside component to prevent recreation on every render
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

export const InfrastructureArchitectureTab = () => {
  const [selectedView, setSelectedView] = useState<ViewMode>('cards');
  const [zoom, setZoom] = useState(100);
  const [animationKey, setAnimationKey] = useState(0);
  
  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<SimulationPhase>('idle');
  const [adapterLoaded, setAdapterLoaded] = useState(false);

  // Use global audio player context - no local state
  const { playAudio, floatingPlayerState } = useAudioPlayer();
  
  const AUDIO_URL = "https://gmflpmcepempcygdrayv.supabase.co/storage/v1/object/public/tooltip-audio/audio-contents/e137c34e-4523-406a-a7bc-35ac598cc9f6.mp3";
  const AUDIO_TITLE = "AI Escalável: O Segredo dos 90% Mais Barato! 💰";

  // Check if this audio is currently active in the global player
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

  // NOTE: Removed problematic setInterval that caused flickering by resetting animationKey

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

  // Render cards view
  if (selectedView === 'cards') {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gradient">Arquitetura de Infraestrutura</h2>
            <p className="text-muted-foreground mt-1">
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

          {/* Diagrama de Processamento Cognitivo */}
          <BrainFlowDiagram />
        </div>
      </TooltipProvider>
    );
  }

  // Handler functions for navigation - stable references
  const goToCards = () => setSelectedView('cards');
  const goToDepartmentChoice = () => setSelectedView('department-choice');
  const goToSaasChoice = () => setSelectedView('saas-choice');

  // Render department choice view (sub-cards)
  if (selectedView === 'department-choice') {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          <BackButton onClick={goToCards} />
          
          <div>
            <h2 className="text-2xl font-bold text-gradient">Uma Empresa, Vários Departamentos</h2>
            <p className="text-muted-foreground mt-1">
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
      </TooltipProvider>
    );
  }

  // Render department static view
  if (selectedView === 'department-static') {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          <BackButton onClick={goToDepartmentChoice} />
          <DepartmentArchitectureDiagram />
        </div>
      </TooltipProvider>
    );
  }

  // Render department dynamic view
  if (selectedView === 'department-dynamic') {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          <BackButton onClick={goToDepartmentChoice} />
          <DynamicSLMArchitectureDiagram />
        </div>
      </TooltipProvider>
    );
  }

  // Render SaaS choice view (sub-cards)
  if (selectedView === 'saas-choice') {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          <BackButton onClick={goToCards} />
          
          <div>
            <h2 className="text-2xl font-bold text-gradient">Empresas Diferentes</h2>
            <p className="text-muted-foreground mt-1">
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
      </TooltipProvider>
    );
  }

  // Render SaaS static view
  if (selectedView === 'saas-static') {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          <BackButton onClick={goToSaasChoice} />
          <SaasRagArchitectureDiagram />
        </div>
      </TooltipProvider>
    );
  }

  // Render SaaS dynamic view
  if (selectedView === 'saas-dynamic') {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          <BackButton onClick={goToSaasChoice} />
          <HyperModularSLMDiagram />
        </div>
      </TooltipProvider>
    );
  }

  // Render GPU view (default detail view)
  return (
    <TooltipProvider>
      <div className="space-y-6">
        <BackButton onClick={goToCards} />
        
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-shrink-0">
            <h2 className="text-2xl font-bold text-gradient">Arquitetura KY AI SLM</h2>
            <p className="text-muted-foreground mt-1">
              Small Language Model Infrastructure - Base Model + LoRA Adapters
            </p>
          </div>

          {/* Audio Player Compacto */}
          <div className="flex items-center gap-3 bg-card border border-primary/30 rounded-lg px-4 py-2 flex-shrink-0">
            <Headphones className="h-4 w-4 text-primary flex-shrink-0" />
            <span 
              className="text-sm font-medium max-w-[200px] truncate text-foreground" 
              title={AUDIO_TITLE}
            >
              {AUDIO_TITLE}
            </span>
            <div className="flex items-center gap-1">
              {/* Play/Pause Button */}
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
              
              {/* Download Button */}
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

        {/* Main Architecture SVG */}
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div 
              className="relative overflow-auto"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
            >
              <svg 
                key={animationKey}
                viewBox="0 0 900 700" 
                className="w-full h-auto min-h-[600px]"
                style={{ minWidth: '800px' }}
              >
                {/* Definitions */}
                <defs>
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <filter id="strongGlow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* Animated Background Grid */}
                <g opacity="0.1">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <line 
                      key={`v-${i}`} 
                      x1={i * 45} 
                      y1="0" 
                      x2={i * 45} 
                      y2="700" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth="0.5"
                    >
                      <animate attributeName="opacity" values="0.1;0.3;0.1" dur={`${3 + i * 0.2}s`} repeatCount="indefinite" />
                    </line>
                  ))}
                  {Array.from({ length: 16 }).map((_, i) => (
                    <line 
                      key={`h-${i}`} 
                      x1="0" 
                      y1={i * 45} 
                      x2="900" 
                      y2={i * 45} 
                      stroke="hsl(var(--primary))" 
                      strokeWidth="0.5"
                    >
                      <animate attributeName="opacity" values="0.1;0.3;0.1" dur={`${3 + i * 0.15}s`} repeatCount="indefinite" />
                    </line>
                  ))}
                </g>

                {/* ===== USERS SECTION (Purple) ===== */}
                <g>
                  <g className="cursor-pointer" filter={currentPhase === 'request' || currentPhase === 'response' ? 'url(#strongGlow)' : ''}>
                    <rect 
                      x="200" y="30" width="140" height="50" rx="8" 
                      fill={currentPhase === 'request' || currentPhase === 'response' ? 'hsl(271 91% 65% / 0.4)' : 'hsl(271 91% 65% / 0.2)'} 
                      stroke="hsl(271 91% 65%)" 
                      strokeWidth={currentPhase === 'request' || currentPhase === 'response' ? '3' : '2'}
                    >
                      {currentPhase === 'request' && (
                        <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="0.5s" repeatCount="indefinite" />
                      )}
                    </rect>
                    <text x="270" y="60" textAnchor="middle" fill="hsl(271 91% 65%)" fontSize="14" fontWeight="600">Empresa A</text>
                    {currentPhase === 'request' && (
                      <text x="270" y="75" textAnchor="middle" fill="hsl(271 91% 65%)" fontSize="10" fontWeight="400">
                        <animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite" />
                        Enviando...
                      </text>
                    )}
                  </g>

                  <g className="cursor-pointer" opacity={currentPhase !== 'idle' ? '0.4' : '1'}>
                    <rect x="560" y="30" width="140" height="50" rx="8" fill="hsl(271 91% 65% / 0.2)" stroke="hsl(271 91% 65%)" strokeWidth="2">
                      {currentPhase === 'idle' && (
                        <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite" begin="0.5s" />
                      )}
                    </rect>
                    <text x="630" y="60" textAnchor="middle" fill="hsl(271 91% 65%)" fontSize="14" fontWeight="600">Empresa B</text>
                  </g>
                </g>

                {/* ===== ARROWS FROM USERS TO API ===== */}
                <g>
                  <path 
                    d="M270 80 L270 110 L450 110 L450 130" 
                    fill="none" 
                    stroke={currentPhase === 'request' ? 'hsl(271 91% 65%)' : 'hsl(271 91% 65% / 0.5)'} 
                    strokeWidth={currentPhase === 'request' ? '3' : '2'} 
                    strokeDasharray="5,5"
                  >
                    <animate attributeName="stroke-dashoffset" values="10;0" dur="0.5s" repeatCount="indefinite" />
                  </path>
                  
                  {currentPhase === 'request' && (
                    <circle r="6" fill="hsl(271 91% 65%)" filter="url(#glow)">
                      <animateMotion dur="1s" repeatCount="1" path="M270 80 L270 110 L450 110 L450 130" />
                    </circle>
                  )}
                  
                  {currentPhase === 'response' && (
                    <circle r="6" fill="hsl(142 76% 36%)" filter="url(#glow)">
                      <animateMotion dur="1s" repeatCount="1" path="M450 130 L450 110 L270 110 L270 80" />
                    </circle>
                  )}
                </g>

                {/* ===== API GATEWAY (Blue) ===== */}
                <g className="cursor-pointer" filter={currentPhase === 'routing' ? 'url(#strongGlow)' : ''}>
                  <rect 
                    x="300" y="130" width="300" height="60" rx="10" 
                    fill={currentPhase === 'routing' ? 'hsl(217 91% 60% / 0.4)' : 'hsl(217 91% 60% / 0.2)'} 
                    stroke="hsl(217 91% 60%)" 
                    strokeWidth={currentPhase === 'routing' ? '3' : '2'} 
                  />
                  <text x="450" y="155" textAnchor="middle" fill="hsl(217 91% 60%)" fontSize="16" fontWeight="700">API Gateway</text>
                  <text x="450" y="175" textAnchor="middle" fill="hsl(217 91% 60% / 0.7)" fontSize="12">Load Balancer</text>
                  {currentPhase === 'routing' && (
                    <text x="450" y="185" textAnchor="middle" fill="hsl(217 91% 60%)" fontSize="10">
                      <animate attributeName="opacity" values="0;1;0" dur="0.8s" repeatCount="indefinite" />
                      Processando...
                    </text>
                  )}
                </g>

                {/* Arrow to Orchestrator */}
                <path 
                  d="M450 190 L450 220" 
                  fill="none" 
                  stroke={currentPhase === 'routing' ? 'hsl(217 91% 60%)' : 'hsl(217 91% 60% / 0.5)'} 
                  strokeWidth={currentPhase === 'routing' ? '3' : '2'} 
                  strokeDasharray="5,5"
                >
                  <animate attributeName="stroke-dashoffset" values="10;0" dur="0.8s" repeatCount="indefinite" />
                </path>
                {currentPhase === 'routing' && (
                  <circle r="5" fill="hsl(217 91% 60%)" filter="url(#glow)">
                    <animateMotion dur="0.5s" repeatCount="indefinite" path="M450 190 L450 220" />
                  </circle>
                )}

                {/* ===== ORCHESTRATOR (Blue) ===== */}
                <g className="cursor-pointer" filter={currentPhase === 'routing' ? 'url(#strongGlow)' : ''}>
                  <rect 
                    x="300" y="220" width="300" height="60" rx="10" 
                    fill={currentPhase === 'routing' ? 'hsl(217 91% 60% / 0.4)' : 'hsl(217 91% 60% / 0.2)'} 
                    stroke="hsl(217 91% 60%)" 
                    strokeWidth={currentPhase === 'routing' ? '3' : '2'} 
                  />
                  <text x="450" y="245" textAnchor="middle" fill="hsl(217 91% 60%)" fontSize="16" fontWeight="700">Orquestrador</text>
                  <text x="450" y="265" textAnchor="middle" fill="hsl(217 91% 60% / 0.7)" fontSize="12">Kubernetes EKS / ECS</text>
                </g>

                {/* Arrow to GPU Cluster */}
                <path 
                  d="M450 280 L450 310" 
                  fill="none" 
                  stroke={['check-adapter', 'inference'].includes(currentPhase) ? 'hsl(142 76% 36%)' : 'hsl(142 76% 36% / 0.5)'} 
                  strokeWidth={['check-adapter', 'inference'].includes(currentPhase) ? '3' : '2'} 
                  strokeDasharray="5,5"
                >
                  <animate attributeName="stroke-dashoffset" values="10;0" dur="0.8s" repeatCount="indefinite" />
                </path>
                {currentPhase === 'check-adapter' && (
                  <circle r="5" fill="hsl(142 76% 36%)" filter="url(#glow)">
                    <animateMotion dur="0.5s" repeatCount="1" path="M450 280 L450 310" />
                  </circle>
                )}

                {/* ===== GPU CLUSTER (Green) ===== */}
                <g filter={['check-adapter', 'inference'].includes(currentPhase) ? 'url(#glow)' : ''}>
                  <rect 
                    x="100" y="310" width="700" height="230" rx="12" 
                    fill={['check-adapter', 'inference'].includes(currentPhase) ? 'hsl(142 76% 36% / 0.2)' : 'hsl(142 76% 36% / 0.1)'} 
                    stroke="hsl(142 76% 36%)" 
                    strokeWidth={['check-adapter', 'inference'].includes(currentPhase) ? '3' : '2'} 
                  />
                  <text x="450" y="335" textAnchor="middle" fill="hsl(142 76% 36%)" fontSize="14" fontWeight="700">CLUSTER DE INFERÊNCIA GPU NODES - AWS g5.xlarge</text>

                  {/* VRAM Container */}
                  <rect 
                    x="130" y="350" width="640" height="130" rx="8" 
                    fill={currentPhase === 'check-adapter' ? 'hsl(187 96% 42% / 0.25)' : 'hsl(187 96% 42% / 0.15)'} 
                    stroke="hsl(187 96% 42%)" 
                    strokeWidth={currentPhase === 'check-adapter' ? '2' : '1.5'} 
                  />
                  <text x="450" y="370" textAnchor="middle" fill="hsl(187 96% 42%)" fontSize="12" fontWeight="600">VRAM - 24GB (NVIDIA A10G)</text>

                  {/* BASE MODEL */}
                  <g filter={currentPhase === 'inference' ? 'url(#strongGlow)' : 'url(#glow)'}>
                    <rect 
                      x="160" y="385" width="350" height="80" rx="6" 
                      fill={currentPhase === 'inference' ? 'hsl(187 96% 42% / 0.4)' : 'hsl(187 96% 42% / 0.25)'} 
                      stroke="hsl(187 96% 42%)" 
                      strokeWidth={currentPhase === 'inference' ? '3' : '2'}
                    >
                      {currentPhase === 'inference' && (
                        <>
                          <animate attributeName="stroke-width" values="2;4;2" dur="0.5s" repeatCount="indefinite" />
                          <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="0.5s" repeatCount="indefinite" />
                        </>
                      )}
                    </rect>
                    <text x="335" y="415" textAnchor="middle" fill="hsl(187 96% 42%)" fontSize="16" fontWeight="700">BASE MODEL</text>
                    <text x="335" y="435" textAnchor="middle" fill="hsl(187 96% 42%)" fontSize="13">Llama-3-8B - 16GB VRAM</text>
                    <text x="335" y="455" textAnchor="middle" fill="hsl(187 96% 42% / 0.7)" fontSize="11">Carregado 1x - Compartilhado</text>
                    {currentPhase === 'inference' && (
                      <text x="335" y="470" textAnchor="middle" fill="hsl(142 76% 36%)" fontSize="10" fontWeight="600">
                        <animate attributeName="opacity" values="0;1;0" dur="0.5s" repeatCount="indefinite" />
                        PROCESSANDO...
                      </text>
                    )}
                  </g>

                  {/* Inference Slots */}
                  <g>
                    <rect 
                      x="540" y="385" width="100" height="35" rx="4" 
                      fill={adapterLoaded ? 'hsl(271 91% 65% / 0.5)' : 'hsl(271 91% 65% / 0.2)'} 
                      stroke="hsl(271 91% 65%)" 
                      strokeWidth={adapterLoaded ? '2' : '1.5'}
                    >
                      {currentPhase === 'check-adapter' && !adapterLoaded && (
                        <animate attributeName="stroke-opacity" values="0.3;1;0.3" dur="0.5s" repeatCount="indefinite" />
                      )}
                    </rect>
                    <text x="590" y="408" textAnchor="middle" fill="hsl(271 91% 65%)" fontSize="11" fontWeight="600">
                      {adapterLoaded ? 'Adapter A ✓' : 'Slot A'}
                    </text>
                    {currentPhase === 'check-adapter' && (
                      <text x="590" y="415" textAnchor="middle" fill="hsl(271 91% 65%)" fontSize="8">
                        <animate attributeName="opacity" values="0;1;0" dur="0.5s" repeatCount="indefinite" />
                        Verificando...
                      </text>
                    )}

                    <rect x="540" y="430" width="100" height="35" rx="4" fill="hsl(271 91% 65% / 0.15)" stroke="hsl(271 91% 65% / 0.5)" strokeWidth="1" />
                    <text x="590" y="453" textAnchor="middle" fill="hsl(271 91% 65% / 0.5)" fontSize="11">Slot B</text>
                  </g>

                  {/* Inference Server */}
                  <rect 
                    x="130" y="490" width="640" height="40" rx="6" 
                    fill={currentPhase === 'inference' ? 'hsl(142 76% 36% / 0.3)' : 'hsl(142 76% 36% / 0.2)'} 
                    stroke="hsl(142 76% 36%)" 
                    strokeWidth={currentPhase === 'inference' ? '2' : '1.5'} 
                  />
                  <text x="450" y="515" textAnchor="middle" fill="hsl(142 76% 36%)" fontSize="13" fontWeight="600">Inference Server (vLLM / TGI / LoRAX)</text>
                </g>

                {/* ===== ARROWS TO S3 ===== */}
                <g>
                  <path 
                    d="M450 540 L450 570" 
                    fill="none" 
                    stroke={currentPhase === 'load-adapter' ? 'hsl(25 95% 53%)' : 'hsl(25 95% 53% / 0.5)'} 
                    strokeWidth={currentPhase === 'load-adapter' ? '3' : '2'} 
                    strokeDasharray="5,5"
                  >
                    <animate attributeName="stroke-dashoffset" values="10;0" dur="0.5s" repeatCount="indefinite" />
                  </path>
                  <path d="M430 555 L450 540 L470 555" fill="none" stroke="hsl(25 95% 53%)" strokeWidth="2" />
                  <path d="M430 555 L450 570 L470 555" fill="none" stroke="hsl(25 95% 53%)" strokeWidth="2" />
                  
                  {currentPhase === 'load-adapter' && (
                    <circle r="6" fill="hsl(25 95% 53%)" filter="url(#glow)">
                      <animateMotion dur="0.8s" repeatCount="indefinite" path="M450 580 L450 540" />
                    </circle>
                  )}
                  
                  <text x="520" y="558" fill={currentPhase === 'load-adapter' ? 'hsl(25 95% 53%)' : 'hsl(25 95% 53% / 0.6)'} fontSize="10">
                    {currentPhase === 'load-adapter' ? 'Carregando Adapter...' : 'Carregamento Dinâmico'}
                  </text>
                </g>

                {/* ===== S3 STORAGE (Orange) ===== */}
                <g filter={currentPhase === 'load-adapter' ? 'url(#glow)' : ''}>
                  <rect 
                    x="100" y="580" width="700" height="100" rx="12" 
                    fill={currentPhase === 'load-adapter' ? 'hsl(25 95% 53% / 0.2)' : 'hsl(25 95% 53% / 0.1)'} 
                    stroke="hsl(25 95% 53%)" 
                    strokeWidth={currentPhase === 'load-adapter' ? '3' : '2'} 
                  />
                  <text x="450" y="605" textAnchor="middle" fill="hsl(25 95% 53%)" fontSize="14" fontWeight="700">ARMAZENAMENTO S3</text>

                  <rect 
                    x="150" y="620" width="150" height="45" rx="6" 
                    fill={currentPhase === 'load-adapter' ? 'hsl(271 91% 65% / 0.4)' : 'hsl(271 91% 65% / 0.2)'} 
                    stroke="hsl(271 91% 65%)" 
                    strokeWidth={currentPhase === 'load-adapter' ? '3' : '1.5'}
                  >
                    {currentPhase === 'load-adapter' && (
                      <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="0.3s" repeatCount="indefinite" />
                    )}
                  </rect>
                  <text x="225" y="640" textAnchor="middle" fill="hsl(271 91% 65%)" fontSize="12" fontWeight="600">Adapter Empresa A</text>
                  <text x="225" y="656" textAnchor="middle" fill="hsl(271 91% 65% / 0.7)" fontSize="10">~100MB (LoRA)</text>
                  {currentPhase === 'load-adapter' && (
                    <text x="225" y="668" textAnchor="middle" fill="hsl(25 95% 53%)" fontSize="9">
                      <animate attributeName="opacity" values="0;1;0" dur="0.5s" repeatCount="indefinite" />
                      ENVIANDO ↑
                    </text>
                  )}

                  <rect x="375" y="620" width="150" height="45" rx="6" fill="hsl(271 91% 65% / 0.1)" stroke="hsl(271 91% 65% / 0.4)" strokeWidth="1" />
                  <text x="450" y="640" textAnchor="middle" fill="hsl(271 91% 65% / 0.5)" fontSize="12">Adapter Empresa B</text>
                  <text x="450" y="656" textAnchor="middle" fill="hsl(271 91% 65% / 0.4)" fontSize="10">~100MB (LoRA)</text>

                  <rect x="600" y="620" width="150" height="45" rx="6" fill="hsl(187 96% 42% / 0.2)" stroke="hsl(187 96% 42%)" strokeWidth="1.5" />
                  <text x="675" y="640" textAnchor="middle" fill="hsl(187 96% 42%)" fontSize="12" fontWeight="600">Base Model</text>
                  <text x="675" y="656" textAnchor="middle" fill="hsl(187 96% 42% / 0.7)" fontSize="10">Weights (~16GB)</text>
                </g>

                {/* Legend */}
                <g transform="translate(720, 30)">
                  <text x="0" y="0" fill="hsl(var(--foreground))" fontSize="11" fontWeight="600">Legenda:</text>
                  <rect x="0" y="10" width="12" height="12" fill="hsl(271 91% 65% / 0.3)" stroke="hsl(271 91% 65%)" strokeWidth="1" rx="2" />
                  <text x="18" y="20" fill="hsl(var(--muted-foreground))" fontSize="10">Clientes</text>
                  <rect x="0" y="28" width="12" height="12" fill="hsl(217 91% 60% / 0.3)" stroke="hsl(217 91% 60%)" strokeWidth="1" rx="2" />
                  <text x="18" y="38" fill="hsl(var(--muted-foreground))" fontSize="10">Orquestração</text>
                  <rect x="0" y="46" width="12" height="12" fill="hsl(142 76% 36% / 0.3)" stroke="hsl(142 76% 36%)" strokeWidth="1" rx="2" />
                  <text x="18" y="56" fill="hsl(var(--muted-foreground))" fontSize="10">GPU</text>
                  <rect x="0" y="64" width="12" height="12" fill="hsl(187 96% 42% / 0.3)" stroke="hsl(187 96% 42%)" strokeWidth="1" rx="2" />
                  <text x="18" y="74" fill="hsl(var(--muted-foreground))" fontSize="10">VRAM</text>
                  <rect x="0" y="82" width="12" height="12" fill="hsl(25 95% 53% / 0.3)" stroke="hsl(25 95% 53%)" strokeWidth="1" rx="2" />
                  <text x="18" y="92" fill="hsl(var(--muted-foreground))" fontSize="10">Storage</text>
                </g>

                {/* Complete indicator */}
                {currentPhase === 'complete' && (
                  <g>
                    <rect x="350" y="300" width="200" height="50" rx="8" fill="hsl(142 76% 36% / 0.9)" stroke="hsl(142 76% 36%)" strokeWidth="2" filter="url(#strongGlow)">
                      <animate attributeName="opacity" values="0;1" dur="0.3s" fill="freeze" />
                    </rect>
                    <text x="450" y="332" textAnchor="middle" fill="white" fontSize="16" fontWeight="700">
                      <animate attributeName="opacity" values="0;1" dur="0.3s" fill="freeze" />
                      ✓ REQUISIÇÃO COMPLETA
                    </text>
                  </g>
                )}
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Step Progress Indicator */}
        {currentPhase !== 'idle' && (
          <Card className="animate-fade-in">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                {[
                  { phase: 'request', label: 'Requisição', icon: '📤' },
                  { phase: 'routing', label: 'Roteamento', icon: '🔀' },
                  { phase: 'check-adapter', label: 'Verificar', icon: '🔍' },
                  { phase: 'load-adapter', label: 'Carregar', icon: '⬇️' },
                  { phase: 'inference', label: 'Inferência', icon: '⚡' },
                  { phase: 'response', label: 'Resposta', icon: '📥' },
                ].map((step, i, arr) => {
                  const phases: SimulationPhase[] = ['request', 'routing', 'check-adapter', 'load-adapter', 'inference', 'response', 'complete'];
                  const currentIndex = phases.indexOf(currentPhase);
                  const stepIndex = phases.indexOf(step.phase as SimulationPhase);
                  const isActive = currentPhase === step.phase;
                  const isComplete = currentIndex > stepIndex || currentPhase === 'complete';
                  
                  return (
                    <div key={step.phase} className="flex items-center">
                      <div className={`flex flex-col items-center transition-all duration-300 ${isActive ? 'scale-110' : ''}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300 ${
                          isComplete ? 'bg-green-500/30 border-2 border-green-500' :
                          isActive ? 'bg-primary/30 border-2 border-primary animate-pulse' :
                          'bg-muted/30 border border-border'
                        }`}>
                          {isComplete ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : step.icon}
                        </div>
                        <span className={`text-xs mt-1 transition-colors ${
                          isActive ? 'text-primary font-semibold' : 
                          isComplete ? 'text-green-500' : 
                          'text-muted-foreground'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                      {i < arr.length - 1 && (
                        <div className={`w-12 h-0.5 mx-2 transition-colors ${
                          currentIndex > stepIndex ? 'bg-green-500' : 'bg-border'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-cyan-600/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-cyan-400">
                <Server className="h-4 w-4" />
                Especificações de Hardware
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">GPU:</span>
                <span className="font-mono text-cyan-300">NVIDIA A10G (24GB)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">vCPU:</span>
                <span className="font-mono text-cyan-300">4-8 cores</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">RAM Sistema:</span>
                <span className="font-mono text-cyan-300">32GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Disco:</span>
                <span className="font-mono text-cyan-300">SSD NVMe</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Instância AWS:</span>
                <span className="font-mono text-cyan-300">g5.xlarge</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-orange-600/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-orange-400">
                <DollarSign className="h-4 w-4" />
                Custos AWS (On-Demand)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">g5.xlarge:</span>
                <span className="font-mono text-orange-300">~US$ 730/mês</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">g4dn.xlarge:</span>
                <span className="font-mono text-orange-300">~US$ 380/mês</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">g5.12xlarge:</span>
                <span className="font-mono text-orange-300">~US$ 5.800/mês</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-orange-500/20">
                <span className="text-muted-foreground">Spot Instance:</span>
                <span className="font-mono text-green-400">até 70% economia</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-purple-600/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-purple-400">
                <Layers className="h-4 w-4" />
                Estratégia LoRA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Model:</span>
                <span className="font-mono text-purple-300">1x carregado</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Adapter/empresa:</span>
                <span className="font-mono text-purple-300">50-200MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Carregamento:</span>
                <span className="font-mono text-purple-300">~milissegundos</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-purple-500/20">
                <span className="text-muted-foreground">Economia infra:</span>
                <span className="font-mono text-green-400 font-bold">até 90%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Flow Explanation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Fluxo de Requisição
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
              {[
                { step: "1", title: "Requisição", desc: "company_id: A", color: "purple" },
                { step: "2", title: "Verificação", desc: "Adapter na GPU?", color: "blue" },
                { step: "3", title: "Carregamento", desc: "S3 → GPU (~ms)", color: "orange" },
                { step: "4", title: "Inferência", desc: "Base + Adapter A", color: "cyan" },
                { step: "5", title: "Resposta", desc: "Resultado isolado", color: "green" },
              ].map((item) => (
                <div key={item.step} className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-${item.color}-500/20 text-${item.color}-400 border border-${item.color}-500/40`}>
                    {item.step}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default InfrastructureArchitectureTab;
