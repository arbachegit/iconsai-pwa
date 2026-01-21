import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw, Shield, Zap, Server, Headphones, Play, Pause, Square, Download, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

const HyperModularSLMDiagram = () => {
  const [zoom, setZoom] = useState(1);
  const [animationKey, setAnimationKey] = useState(0);
  
  // Use global audio player context - no local state
  const { playAudio, floatingPlayerState, stopPlayback } = useAudioPlayer();

  const AUDIO_URL = "https://gmflpmcepempcygdrayv.supabase.co/storage/v1/object/public/tooltip-audio/audio-contents/65c265c8-e54b-4f7e-96f1-44136000ed7b.mp3";
  const AUDIO_TITLE = "🛡️Paredes de Titânio e Gênios Hiperfocados";

  // Check if this audio is currently active in the global player
  const isThisAudioActive = floatingPlayerState?.audioUrl === AUDIO_URL;
  const isPlaying = isThisAudioActive && floatingPlayerState?.isPlaying;
  const isLoading = isThisAudioActive && floatingPlayerState?.isLoading;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleReset = () => {
    setZoom(1);
    setAnimationKey(prev => prev + 1);
  };

  const handleAudioPlayPause = () => {
    playAudio(AUDIO_TITLE, AUDIO_URL);
  };

  const handleAudioStop = () => {
    if (isThisAudioActive) {
      stopPlayback();
    }
  };

  const handleAudioDownload = () => {
    const link = document.createElement('a');
    link.href = AUDIO_URL;
    link.download = 'paredes-titanio-genios-hiperfocados.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            Arquitetura SLM Hiper-Modular (Multi-Tenant)
          </CardTitle>
          <div className="flex items-center gap-3">
            {/* Audio Player */}
            <TooltipProvider>
              <div className="flex items-center gap-2 bg-card border border-primary/30 rounded-lg px-3 py-2">
                <Headphones className="h-4 w-4 text-primary shrink-0" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm font-medium max-w-[140px] truncate cursor-default">
                      {AUDIO_TITLE}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    {AUDIO_TITLE}
                  </TooltipContent>
                </Tooltip>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={handleAudioPlayPause} className="h-8 w-8">
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {isPlaying && <Pause className="h-4 w-4 text-primary" />}
                    {!isLoading && !isPlaying && <Play className="h-4 w-4 text-primary" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleAudioStop} 
                    disabled={!isThisAudioActive}
                    className="h-8 w-8"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleAudioDownload} className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TooltipProvider>
            
            {/* Zoom Controls */}
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handleZoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleZoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleReset}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto rounded-lg bg-slate-950/50 p-4">
          <svg
            key={animationKey}
            viewBox="0 0 1000 700"
            className="w-full h-auto min-w-[800px]"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center top' }}
          >
            <defs>
              {/* Gradients */}
              <linearGradient id="hmEconomyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(263, 70%, 55%)" />
                <stop offset="100%" stopColor="hsl(263, 70%, 40%)" />
              </linearGradient>
              <linearGradient id="hmHealthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(158, 64%, 47%)" />
                <stop offset="100%" stopColor="hsl(158, 64%, 35%)" />
              </linearGradient>
              <linearGradient id="hmGpuGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(220, 25%, 30%)" />
                <stop offset="100%" stopColor="hsl(220, 25%, 18%)" />
              </linearGradient>
              <linearGradient id="hmSlmGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(200, 90%, 50%)" />
                <stop offset="100%" stopColor="hsl(200, 90%, 38%)" />
              </linearGradient>
              <linearGradient id="hmGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(45, 93%, 55%)" />
                <stop offset="100%" stopColor="hsl(45, 93%, 42%)" />
              </linearGradient>
              <linearGradient id="hmRedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(0, 70%, 55%)" />
                <stop offset="100%" stopColor="hsl(0, 70%, 42%)" />
              </linearGradient>

              {/* Filters */}
              <filter id="hmGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="hmGpuGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Paths for animations */}
              <path id="pathApiToRagA" d="M 200 130 L 200 200" fill="none" />
              <path id="pathApiToRagB" d="M 800 130 L 800 200" fill="none" />
              <path id="pathRagToSlmA" d="M 200 290 L 200 340" fill="none" />
              <path id="pathRagToSlmB" d="M 800 290 L 800 340" fill="none" />
              <path id="pathSlmToGpuA" d="M 200 440 L 200 520 L 400 520 L 400 560" fill="none" />
              <path id="pathSlmToGpuB" d="M 800 440 L 800 520 L 600 520 L 600 560" fill="none" />
              <path id="pathGpuToSlmA" d="M 400 560 L 400 520 L 200 520 L 200 440" fill="none" />
              <path id="pathGpuToSlmB" d="M 600 560 L 600 520 L 800 520 L 800 440" fill="none" />
            </defs>

            <style>{`
              @keyframes hmDataFlowEconomy {
                0% { offset-distance: 0%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { offset-distance: 100%; opacity: 0; }
              }
              @keyframes hmDataFlowHealth {
                0% { offset-distance: 0%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { offset-distance: 100%; opacity: 0; }
              }
              @keyframes hmQueryFlow {
                0% { offset-distance: 0%; opacity: 0; }
                15% { opacity: 1; }
                85% { opacity: 1; }
                100% { offset-distance: 100%; opacity: 0; }
              }
              @keyframes hmReturnFlow {
                0% { offset-distance: 0%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { offset-distance: 100%; opacity: 0; }
              }
              @keyframes hmSlmPulse {
                0%, 100% { transform: scale(1); filter: drop-shadow(0 0 8px hsla(200, 90%, 50%, 0.4)); }
                50% { transform: scale(1.02); filter: drop-shadow(0 0 16px hsla(200, 90%, 50%, 0.7)); }
              }
              @keyframes hmGpuTurbine {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              @keyframes hmGpuPulse {
                0%, 100% { filter: drop-shadow(0 0 10px hsla(220, 50%, 50%, 0.3)); }
                50% { filter: drop-shadow(0 0 25px hsla(220, 50%, 50%, 0.6)); }
              }
              @keyframes hmLockPulse {
                0%, 100% { opacity: 0.8; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.15); }
              }
              @keyframes hmTunnelFlow {
                0% { stroke-dashoffset: 20; }
                100% { stroke-dashoffset: 0; }
              }
              @keyframes hmSloganFade {
                0%, 20% { opacity: 0; }
                30%, 70% { opacity: 1; }
                80%, 100% { opacity: 0; }
              }
              @keyframes hmShutterClose {
                0%, 40% { stroke-dasharray: 0, 100; }
                50%, 100% { stroke-dasharray: 100, 0; }
              }
              .hm-slm-box { animation: hmSlmPulse 2s ease-in-out infinite; }
              .hm-gpu-box { animation: hmGpuPulse 2.5s ease-in-out infinite; }
              .hm-turbine { animation: hmGpuTurbine 4s linear infinite; transform-origin: center; }
              .hm-lock { animation: hmLockPulse 1.5s ease-in-out infinite; }
              .hm-tunnel { animation: hmTunnelFlow 1s linear infinite; }
              .hm-slogan-security { animation: hmSloganFade 4s ease-in-out infinite; }
              .hm-slogan-productivity { animation: hmSloganFade 4s ease-in-out infinite 2s; }
              .hm-economy-data { offset-path: path('M 200 130 L 200 200'); animation: hmDataFlowEconomy 2s ease-in-out infinite; }
              .hm-health-data { offset-path: path('M 800 130 L 800 200'); animation: hmDataFlowHealth 2s ease-in-out infinite 0.3s; }
              .hm-rag-to-slm-a { offset-path: path('M 200 290 L 200 340'); animation: hmDataFlowEconomy 1.5s ease-in-out infinite 1s; }
              .hm-rag-to-slm-b { offset-path: path('M 800 290 L 800 340'); animation: hmDataFlowHealth 1.5s ease-in-out infinite 1.3s; }
              .hm-query-a { offset-path: path('M 200 440 L 200 520 L 400 520 L 400 560'); animation: hmQueryFlow 2.5s ease-in-out infinite; }
              .hm-query-b { offset-path: path('M 800 440 L 800 520 L 600 520 L 600 560'); animation: hmQueryFlow 2.5s ease-in-out infinite 0.5s; }
              .hm-return-a { offset-path: path('M 400 560 L 400 520 L 200 520 L 200 440'); animation: hmReturnFlow 1s ease-out infinite 2.5s; }
              .hm-return-b { offset-path: path('M 600 560 L 600 520 L 800 520 L 800 440'); animation: hmReturnFlow 1s ease-out infinite 3s; }
              .hm-shutter { animation: hmShutterClose 2.5s ease-in-out infinite; }
            `}</style>

            {/* Background Layer Labels */}
            <text x="500" y="30" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12" fontWeight="600" opacity="0.7">
              CAMADA 1: FONTE DE DADOS (RAG EXTERNO)
            </text>
            <text x="500" y="180" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12" fontWeight="600" opacity="0.7">
              CAMADA 2: ISOLAMENTO E CUSTOMIZAÇÃO
            </text>
            <text x="500" y="510" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12" fontWeight="600" opacity="0.7">
              CAMADA 3: INFRAESTRUTURA COMPARTILHADA
            </text>

            {/* ====== CAMADA 1: CLIENTES E APIs ====== */}
            
            {/* Cliente A - Economia */}
            <g>
              <rect x="100" y="50" width="200" height="80" rx="8" fill="url(#hmEconomyGradient)" filter="url(#hmGlow)" />
              <text x="200" y="75" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">CLIENTE-A-ECONOMIA</text>
              <text x="200" y="95" textAnchor="middle" fill="white" fontSize="10" opacity="0.9">Domínio Financeiro</text>
              
              {/* APIs de Economia */}
              <rect x="115" y="105" width="70" height="25" rx="4" fill="url(#hmGoldGradient)" />
              <text x="150" y="122" textAnchor="middle" fill="hsl(220, 20%, 15%)" fontSize="9" fontWeight="bold">🏛️ API-BC</text>
              
              <rect x="215" y="105" width="70" height="25" rx="4" fill="url(#hmGoldGradient)" />
              <text x="250" y="122" textAnchor="middle" fill="hsl(220, 20%, 15%)" fontSize="9" fontWeight="bold">📊 IBGE</text>
            </g>

            {/* Cliente B - Saúde */}
            <g>
              <rect x="700" y="50" width="200" height="80" rx="8" fill="url(#hmHealthGradient)" filter="url(#hmGlow)" />
              <text x="800" y="75" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">CLIENTE-B-SAUDE</text>
              <text x="800" y="95" textAnchor="middle" fill="white" fontSize="10" opacity="0.9">Domínio Médico</text>
              
              {/* APIs de Saúde */}
              <rect x="715" y="105" width="70" height="25" rx="4" fill="url(#hmRedGradient)" />
              <text x="750" y="122" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">🏥 OMS</text>
              
              <rect x="815" y="105" width="70" height="25" rx="4" fill="url(#hmRedGradient)" />
              <text x="850" y="122" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">🏨 MIN.SAÚDE</text>
            </g>

            {/* ====== CAMADA 2: RAG PRIVADO E SLMs ====== */}

            {/* Connection Lines Layer 1 to 2 */}
            <line x1="200" y1="130" x2="200" y2="200" stroke="hsl(263, 70%, 50%)" strokeWidth="2" strokeDasharray="5,3" className="hm-tunnel" />
            <line x1="800" y1="130" x2="800" y2="200" stroke="hsl(158, 64%, 42%)" strokeWidth="2" strokeDasharray="5,3" className="hm-tunnel" />

            {/* RAG Privado A */}
            <g>
              <rect x="100" y="200" width="200" height="90" rx="8" fill="hsl(263, 50%, 25%)" stroke="hsl(263, 70%, 50%)" strokeWidth="2" />
              <text x="200" y="225" textAnchor="middle" fill="hsl(263, 70%, 70%)" fontSize="13" fontWeight="bold">RAG-PRIVADO-A</text>
              <text x="200" y="245" textAnchor="middle" fill="hsl(263, 50%, 80%)" fontSize="10">RAG & Vetorização</text>
              <text x="200" y="260" textAnchor="middle" fill="hsl(263, 50%, 80%)" fontSize="10">(Proprietário)</text>
              <text x="200" y="280" textAnchor="middle" fill="hsl(45, 93%, 55%)" fontSize="9">💰 Dados Econômicos</text>
            </g>

            {/* RAG Privado B */}
            <g>
              <rect x="700" y="200" width="200" height="90" rx="8" fill="hsl(158, 40%, 20%)" stroke="hsl(158, 64%, 42%)" strokeWidth="2" />
              <text x="800" y="225" textAnchor="middle" fill="hsl(158, 64%, 65%)" fontSize="13" fontWeight="bold">RAG-PRIVADO-B</text>
              <text x="800" y="245" textAnchor="middle" fill="hsl(158, 40%, 75%)" fontSize="10">RAG & Vetorização</text>
              <text x="800" y="260" textAnchor="middle" fill="hsl(158, 40%, 75%)" fontSize="10">(Proprietário)</text>
              <text x="800" y="280" textAnchor="middle" fill="hsl(0, 70%, 60%)" fontSize="9">❤️ Dados de Saúde</text>
            </g>

            {/* Connection Lines RAG to SLM */}
            <line x1="200" y1="290" x2="200" y2="340" stroke="hsl(263, 70%, 50%)" strokeWidth="2" />
            <line x1="800" y1="290" x2="800" y2="340" stroke="hsl(158, 64%, 42%)" strokeWidth="2" />

            {/* SLM Hiperfocada A */}
            <g className="hm-slm-box">
              <rect x="100" y="340" width="200" height="100" rx="10" fill="url(#hmSlmGradient)" />
              <text x="200" y="370" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">SLM-HIPERFOCADA-A</text>
              <text x="200" y="395" textAnchor="middle" fill="white" fontSize="10" opacity="0.9">Phi-3-mini (LoRA)</text>
              <text x="200" y="415" textAnchor="middle" fill="hsl(45, 93%, 55%)" fontSize="9">🎯 Economia & Finanças</text>
              <text x="200" y="430" textAnchor="middle" fill="white" fontSize="8" opacity="0.7">Hiperfoco Total</text>
            </g>

            {/* SLM Hiperfocada B */}
            <g className="hm-slm-box">
              <rect x="700" y="340" width="200" height="100" rx="10" fill="url(#hmSlmGradient)" />
              <text x="800" y="370" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">SLM-HIPERFOCADA-B</text>
              <text x="800" y="395" textAnchor="middle" fill="white" fontSize="10" opacity="0.9">Phi-3-mini (LoRA)</text>
              <text x="800" y="415" textAnchor="middle" fill="hsl(0, 70%, 60%)" fontSize="9">❤️ Saúde & Medicina</text>
              <text x="800" y="430" textAnchor="middle" fill="white" fontSize="8" opacity="0.7">Hiperfoco Total</text>
            </g>

            {/* Isolation Barrier */}
            <g>
              <line x1="500" y1="200" x2="500" y2="500" stroke="hsl(0, 70%, 50%)" strokeWidth="3" strokeDasharray="10,5" />
              <text x="500" y="480" textAnchor="middle" fill="hsl(0, 70%, 60%)" fontSize="10" fontWeight="bold">
                🔒 ISOLAMENTO TOTAL
              </text>
            </g>

            {/* GPU Layer */}
            <g className="hm-gpu-box">
              <rect x="350" y="560" width="300" height="100" rx="12" fill="url(#hmGpuGradient)" filter="url(#hmGpuGlow)" />
              <text x="500" y="590" textAnchor="middle" fill="hsl(220, 20%, 80%)" fontSize="14" fontWeight="bold">GPU COMPARTILHADA</text>
              <text x="500" y="610" textAnchor="middle" fill="hsl(220, 20%, 65%)" fontSize="11">NVIDIA A10G (24GB VRAM)</text>
              <text x="500" y="630" textAnchor="middle" fill="hsl(45, 93%, 55%)" fontSize="10">⚡ Hot-Swap LoRA Adapters (~ms)</text>
              <text x="500" y="650" textAnchor="middle" fill="hsl(158, 64%, 50%)" fontSize="9">90% Redução de Custo</text>
            </g>

            {/* Connection Lines SLM to GPU */}
            <line x1="200" y1="440" x2="200" y2="520" stroke="hsl(200, 90%, 50%)" strokeWidth="2" />
            <line x1="200" y1="520" x2="400" y2="520" stroke="hsl(200, 90%, 50%)" strokeWidth="2" />
            <line x1="400" y1="520" x2="400" y2="560" stroke="hsl(200, 90%, 50%)" strokeWidth="2" />

            <line x1="800" y1="440" x2="800" y2="520" stroke="hsl(200, 90%, 50%)" strokeWidth="2" />
            <line x1="800" y1="520" x2="600" y2="520" stroke="hsl(200, 90%, 50%)" strokeWidth="2" />
            <line x1="600" y1="520" x2="600" y2="560" stroke="hsl(200, 90%, 50%)" strokeWidth="2" />

            {/* Animated Data Dots */}
            <circle r="6" fill="hsl(263, 70%, 55%)" className="hm-economy-data" />
            <circle r="6" fill="hsl(158, 64%, 50%)" className="hm-health-data" />
            <circle r="5" fill="hsl(263, 70%, 60%)" className="hm-rag-to-slm-a" />
            <circle r="5" fill="hsl(158, 64%, 55%)" className="hm-rag-to-slm-b" />
            <circle r="4" fill="hsl(200, 90%, 55%)" className="hm-query-a" />
            <circle r="4" fill="hsl(200, 90%, 55%)" className="hm-query-b" />
            <circle r="4" fill="hsl(45, 93%, 55%)" className="hm-return-a" />
            <circle r="4" fill="hsl(45, 93%, 55%)" className="hm-return-b" />

          </svg>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-purple-400" />
                <h3 className="font-semibold text-purple-300">Hiperfoco por Domínio</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Cada SLM é treinada apenas em seu domínio (economia ou saúde), garantindo respostas precisas e especializadas.
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-500/30 bg-gradient-to-br from-red-500/10 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Server className="h-5 w-5 text-red-400" />
                <h3 className="font-semibold text-red-300">Isolamento Total</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                RAGs privados garantem que dados de um cliente nunca se misturam com dados de outro.
              </p>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-emerald-400" />
                <h3 className="font-semibold text-emerald-300">Eficiência Compartilhada</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                GPU única com hot-swap de LoRA Adapters permite servir múltiplos clientes com 90% menos custo.
              </p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

export default HyperModularSLMDiagram;
