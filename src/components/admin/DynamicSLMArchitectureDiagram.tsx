import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, ZoomOut, RotateCcw, Shield, Zap, Database, Share2, Headphones, Play, Pause, Square, Download, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

export const DynamicSLMArchitectureDiagram = () => {
  const [zoom, setZoom] = useState(100);
  const [animationKey, setAnimationKey] = useState(0);
  
  // Use global audio player context - no local state
  const { playAudio, floatingPlayerState, stopPlayback } = useAudioPlayer();

  const AUDIO_URL = "https://gmflpmcepempcygdrayv.supabase.co/storage/v1/object/public/tooltip-audio/audio-contents/bc4eff8f-6306-415b-a86b-88298ad56e59.mp3";
  const AUDIO_TITLE = "🔒 O Segredo da Produtividade Duplicada: SLMs, Paredes de Titânio e o Orquestrador de Dados";

  // Check if this audio is currently active in the global player
  const isThisAudioActive = floatingPlayerState?.audioUrl === AUDIO_URL;
  const isPlaying = isThisAudioActive && floatingPlayerState?.isPlaying;
  const isLoading = isThisAudioActive && floatingPlayerState?.isLoading;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 20, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 20, 60));
  const handleReset = () => {
    setZoom(100);
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
    link.download = 'segredo-produtividade-duplicada.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gradient">Sistema Dinâmico - SLM Modular</h2>
          <p className="text-muted-foreground mt-1">
            Visualização animada do fluxo de segurança e compartilhamento de conhecimento
          </p>
        </div>

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
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1">
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
      </div>

      {/* Legend */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-muted-foreground">Fluxo Cliente A</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-muted-foreground">Fluxo Cliente B</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-muted-foreground">Compartilhamento de Padrões</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-400" />
              <span className="text-muted-foreground">Barreira de Isolamento</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main SVG Diagram */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div 
            className="relative overflow-auto"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            <svg 
              key={animationKey}
              viewBox="0 0 900 750" 
              className="w-full h-auto min-h-[650px]"
              style={{ minWidth: '800px' }}
            >
              {/* Embedded CSS Animations */}
              <style>{`
                @keyframes securityFlowA {
                  0% { offset-distance: 0%; opacity: 0; }
                  5% { opacity: 1; }
                  95% { opacity: 1; }
                  100% { offset-distance: 100%; opacity: 0; }
                }
                @keyframes securityFlowB {
                  0% { offset-distance: 0%; opacity: 0; }
                  5% { opacity: 1; }
                  95% { opacity: 1; }
                  100% { offset-distance: 100%; opacity: 0; }
                }
                @keyframes productivityFlow {
                  0% { offset-distance: 0%; opacity: 0; }
                  10% { opacity: 1; }
                  90% { opacity: 1; }
                  100% { offset-distance: 100%; opacity: 0; }
                }
                @keyframes slmPulse {
                  0%, 100% { transform: scale(1); }
                  50% { transform: scale(1.02); }
                }
                @keyframes storagePulse {
                  0%, 100% { filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.4)); }
                  50% { filter: drop-shadow(0 0 25px rgba(251, 191, 36, 0.9)); }
                }
                @keyframes shieldFlicker {
                  0%, 100% { stroke-opacity: 0.4; stroke-dashoffset: 0; }
                  50% { stroke-opacity: 1; stroke-dashoffset: 8; }
                }
                @keyframes energyGradient {
                  0% { stroke-dashoffset: 20; }
                  100% { stroke-dashoffset: 0; }
                }
                @keyframes glowPulse {
                  0%, 100% { opacity: 0.5; }
                  50% { opacity: 1; }
                }
                .security-dot-a {
                  offset-path: path('M180 120 L180 200 L180 280 L180 440');
                  animation: securityFlowA 2s ease-in-out infinite;
                }
                .security-dot-b {
                  offset-path: path('M720 120 L720 200 L720 280 L720 440');
                  animation: securityFlowB 2s ease-in-out infinite 0.5s;
                }
                .productivity-dot-a {
                  offset-path: path('M180 560 L180 640 L450 640 L450 380');
                  animation: productivityFlow 3.5s ease-in-out infinite 1s;
                }
                .productivity-dot-b {
                  offset-path: path('M720 560 L720 640 L450 640 L450 380');
                  animation: productivityFlow 3.5s ease-in-out infinite 1.5s;
                }
                .slm-box {
                  animation: slmPulse 1.5s ease-in-out infinite;
                  transform-origin: center;
                }
                .storage-box {
                  animation: storagePulse 2s ease-in-out infinite;
                }
                .shield-line {
                  animation: shieldFlicker 1s ease-in-out infinite;
                }
                .energy-line {
                  animation: energyGradient 1s linear infinite;
                }
                .glow-effect {
                  animation: glowPulse 2s ease-in-out infinite;
                }
              `}</style>

              {/* Definitions */}
              <defs>
                <filter id="glowPurple" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="glowGold" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="glowBlue" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="glowRed" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                
                <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(271, 91%, 65%)" />
                  <stop offset="100%" stopColor="hsl(271, 91%, 45%)" />
                </linearGradient>
                <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(142, 76%, 50%)" />
                  <stop offset="100%" stopColor="hsl(142, 76%, 36%)" />
                </linearGradient>
                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(38, 92%, 55%)" />
                  <stop offset="100%" stopColor="hsl(38, 92%, 45%)" />
                </linearGradient>
                <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(200, 90%, 55%)" />
                  <stop offset="100%" stopColor="hsl(200, 90%, 40%)" />
                </linearGradient>
              </defs>

              {/* Background Grid */}
              <g opacity="0.08">
                {Array.from({ length: 20 }).map((_, i) => (
                  <line 
                    key={`v-${i}`} 
                    x1={i * 45} 
                    y1="0" 
                    x2={i * 45} 
                    y2="750" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth="0.5"
                  />
                ))}
                {Array.from({ length: 17 }).map((_, i) => (
                  <line 
                    key={`h-${i}`} 
                    x1="0" 
                    y1={i * 45} 
                    x2="900" 
                    y2={i * 45} 
                    stroke="hsl(var(--primary))" 
                    strokeWidth="0.5"
                  />
                ))}
              </g>

              {/* ===== CLIENTE A (Purple) ===== */}
              <g filter="url(#glowPurple)">
                <rect 
                  x="80" y="40" width="200" height="70" rx="12" 
                  fill="hsl(271, 91%, 65%, 0.25)" 
                  stroke="hsl(271, 91%, 65%)" 
                  strokeWidth="2.5"
                />
                <text x="180" y="70" textAnchor="middle" fill="hsl(271, 91%, 70%)" fontSize="18" fontWeight="700">Cliente A</text>
                <text x="180" y="95" textAnchor="middle" fill="hsl(271, 91%, 60%)" fontSize="12">company_id: A</text>
              </g>

              {/* ===== CLIENTE B (Green) ===== */}
              <g filter="url(#glowGreen)">
                <rect 
                  x="620" y="40" width="200" height="70" rx="12" 
                  fill="hsl(142, 76%, 50%, 0.25)" 
                  stroke="hsl(142, 76%, 50%)" 
                  strokeWidth="2.5"
                />
                <text x="720" y="70" textAnchor="middle" fill="hsl(142, 76%, 60%)" fontSize="18" fontWeight="700">Cliente B</text>
                <text x="720" y="95" textAnchor="middle" fill="hsl(142, 76%, 45%)" fontSize="12">company_id: B</text>
              </g>

              {/* ===== Connection Lines from Clients to RAG ===== */}
              <path 
                d="M180 110 L180 160" 
                fill="none" 
                stroke="hsl(271, 91%, 65%)" 
                strokeWidth="3" 
                strokeDasharray="8,4"
                className="energy-line"
              />
              <path 
                d="M720 110 L720 160" 
                fill="none" 
                stroke="hsl(142, 76%, 50%)" 
                strokeWidth="3" 
                strokeDasharray="8,4"
                className="energy-line"
              />

              {/* ===== RAG-Adaptador-A (Purple) ===== */}
              <g>
                <rect 
                  x="60" y="160" width="240" height="100" rx="12" 
                  fill="hsl(271, 91%, 65%, 0.15)" 
                  stroke="hsl(271, 91%, 55%)" 
                  strokeWidth="2"
                />
                <text x="180" y="195" textAnchor="middle" fill="hsl(271, 91%, 70%)" fontSize="16" fontWeight="600">RAG-Adaptador-A</text>
                <text x="180" y="220" textAnchor="middle" fill="hsl(271, 91%, 55%)" fontSize="11">Filtro de Conteúdo</text>
                <text x="180" y="240" textAnchor="middle" fill="hsl(271, 91%, 55%)" fontSize="11">e Contexto</text>
              </g>

              {/* ===== RAG-Adaptador-B (Green) ===== */}
              <g>
                <rect 
                  x="600" y="160" width="240" height="100" rx="12" 
                  fill="hsl(142, 76%, 50%, 0.15)" 
                  stroke="hsl(142, 76%, 40%)" 
                  strokeWidth="2"
                />
                <text x="720" y="195" textAnchor="middle" fill="hsl(142, 76%, 60%)" fontSize="16" fontWeight="600">RAG-Adaptador-B</text>
                <text x="720" y="220" textAnchor="middle" fill="hsl(142, 76%, 45%)" fontSize="11">Filtro de Conteúdo</text>
                <text x="720" y="240" textAnchor="middle" fill="hsl(142, 76%, 45%)" fontSize="11">e Contexto</text>
              </g>

              {/* ===== Connection Lines from RAG to Storage ===== */}
              <path 
                d="M180 260 L180 310 L350 310" 
                fill="none" 
                stroke="hsl(271, 91%, 55%)" 
                strokeWidth="2"
                strokeDasharray="6,3"
              />
              <path 
                d="M720 260 L720 310 L550 310" 
                fill="none" 
                stroke="hsl(142, 76%, 45%)" 
                strokeWidth="2"
                strokeDasharray="6,3"
              />

              {/* ===== Global Vector Storage (Gold) ===== */}
              <g className="storage-box" filter="url(#glowGold)">
                <rect 
                  x="350" y="280" width="200" height="80" rx="12" 
                  fill="hsl(38, 92%, 50%, 0.25)" 
                  stroke="hsl(38, 92%, 50%)" 
                  strokeWidth="3"
                />
                <Database className="h-6 w-6" x="435" y="295" style={{ color: 'hsl(38, 92%, 60%)' }} />
                <text x="450" y="320" textAnchor="middle" fill="hsl(38, 92%, 65%)" fontSize="14" fontWeight="600">
                  <tspan x="450" dy="0">Armazenamento</tspan>
                  <tspan x="450" dy="18">Vetorizado Global</tspan>
                </text>
              </g>

              {/* ===== Connection Lines from Storage to SLMs ===== */}
              <path 
                d="M350 340 L180 340 L180 400" 
                fill="none" 
                stroke="hsl(38, 92%, 50%)" 
                strokeWidth="2"
              />
              <path 
                d="M550 340 L720 340 L720 400" 
                fill="none" 
                stroke="hsl(38, 92%, 50%)" 
                strokeWidth="2"
              />

              {/* ===== ISOLATION BARRIER ===== */}
              <g>
                <line 
                  x1="450" y1="400" x2="450" y2="560" 
                  stroke="hsl(0, 70%, 50%)" 
                  strokeWidth="4"
                  strokeDasharray="12,6"
                  className="shield-line"
                />
                <Shield 
                  x="430" y="470" 
                  className="h-8 w-8"
                  style={{ color: 'hsl(0, 70%, 55%)' }}
                />
                <text x="450" y="590" textAnchor="middle" fill="hsl(0, 70%, 60%)" fontSize="11" fontWeight="600">
                  BARREIRA DE ISOLAMENTO
                </text>
              </g>

              {/* ===== SLM-A (Purple/Blue) ===== */}
              <g className="slm-box" filter="url(#glowBlue)">
                <rect 
                  x="80" y="400" width="200" height="160" rx="14" 
                  fill="url(#blueGradient)" 
                  fillOpacity="0.3"
                  stroke="hsl(200, 90%, 50%)" 
                  strokeWidth="2.5"
                />
                <text x="180" y="440" textAnchor="middle" fill="hsl(200, 90%, 70%)" fontSize="16" fontWeight="700">SLM-Inferência-A</text>
                <text x="180" y="470" textAnchor="middle" fill="hsl(200, 90%, 55%)" fontSize="12">Modelo Base</text>
                <text x="180" y="490" textAnchor="middle" fill="hsl(200, 90%, 55%)" fontSize="12">+ LoRA-A</text>
                <Zap x="160" y="510" className="h-6 w-6" style={{ color: 'hsl(45, 93%, 55%)' }} />
                <text x="180" y="545" textAnchor="middle" fill="hsl(45, 93%, 60%)" fontSize="10">Inferência Isolada</text>
              </g>

              {/* ===== SLM-B (Green/Blue) ===== */}
              <g className="slm-box" filter="url(#glowBlue)">
                <rect 
                  x="620" y="400" width="200" height="160" rx="14" 
                  fill="url(#blueGradient)" 
                  fillOpacity="0.3"
                  stroke="hsl(200, 90%, 50%)" 
                  strokeWidth="2.5"
                />
                <text x="720" y="440" textAnchor="middle" fill="hsl(200, 90%, 70%)" fontSize="16" fontWeight="700">SLM-Inferência-B</text>
                <text x="720" y="470" textAnchor="middle" fill="hsl(200, 90%, 55%)" fontSize="12">Modelo Base</text>
                <text x="720" y="490" textAnchor="middle" fill="hsl(200, 90%, 55%)" fontSize="12">+ LoRA-B</text>
                <Zap x="700" y="510" className="h-6 w-6" style={{ color: 'hsl(45, 93%, 55%)' }} />
                <text x="720" y="545" textAnchor="middle" fill="hsl(45, 93%, 60%)" fontSize="10">Inferência Isolada</text>
              </g>

              {/* ===== Pattern Sharing Arrows ===== */}
              <g className="glow-effect">
                <path 
                  d="M180 620 C180 680, 450 680, 450 640" 
                  fill="none" 
                  stroke="hsl(158, 64%, 50%)" 
                  strokeWidth="2"
                  strokeDasharray="5,3"
                />
                <path 
                  d="M720 620 C720 680, 450 680, 450 640" 
                  fill="none" 
                  stroke="hsl(158, 64%, 50%)" 
                  strokeWidth="2"
                  strokeDasharray="5,3"
                />
                <Share2 x="430" y="665" className="h-6 w-6" style={{ color: 'hsl(158, 64%, 55%)' }} />
                <text x="450" y="720" textAnchor="middle" fill="hsl(158, 64%, 60%)" fontSize="11" fontWeight="500">
                  Padrões Compartilhados (Anônimos)
                </text>
              </g>

              {/* ===== Animated Security Dots ===== */}
              <circle r="6" fill="hsl(271, 91%, 65%)" className="security-dot-a" />
              <circle r="6" fill="hsl(142, 76%, 50%)" className="security-dot-b" />

              {/* ===== Animated Productivity Dots ===== */}
              <circle r="5" fill="hsl(158, 64%, 55%)" className="productivity-dot-a" />
              <circle r="5" fill="hsl(158, 64%, 55%)" className="productivity-dot-b" />

            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-purple-400" />
              <h3 className="font-semibold text-purple-300">Segurança Total</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Cada cliente tem seu próprio RAG-Adaptador e SLM isolado. Dados nunca se misturam.
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-5 w-5 text-amber-400" />
              <h3 className="font-semibold text-amber-300">Base Compartilhada</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              O armazenamento vetorizado global permite reutilização de padrões anônimos entre clientes.
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-emerald-400" />
              <h3 className="font-semibold text-emerald-300">Produtividade 2x</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Arquitetura LoRA permite hot-swap de adapters, dobrando a eficiência operacional.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
