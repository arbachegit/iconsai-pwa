import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw, Cpu, DollarSign, Layers } from 'lucide-react';

const SaasRagArchitectureDiagram = () => {
  const [zoom, setZoom] = useState(100);
  const [animationKey, setAnimationKey] = useState(0);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
  const handleReset = () => {
    setZoom(100);
    setAnimationKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-foreground">Arquitetura SLM Customizada por Empresa</h3>
          <p className="text-sm text-muted-foreground">Pipeline de inferência com RAG customizado e latência ultra-baixa</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Diagram */}
      <Card className="p-4 bg-card border-border overflow-auto">
        <svg
          key={animationKey}
          width="100%"
          height="650"
          viewBox="0 0 1000 650"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          className="transition-transform duration-300"
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="gpuGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(160, 84%, 39%)" />
              <stop offset="100%" stopColor="hsl(158, 64%, 52%)" />
            </linearGradient>
            <linearGradient id="s3Gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(38, 92%, 50%)" />
              <stop offset="100%" stopColor="hsl(45, 93%, 47%)" />
            </linearGradient>
            
            {/* Glow filters */}
            <filter id="glowBlue" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>

            {/* Animated background grid */}
            <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(215, 20%, 25%)" strokeWidth="0.5" opacity="0.3"/>
            </pattern>

            {/* Arrow markers */}
            <marker id="arrowOrange" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="hsl(38, 92%, 50%)" />
            </marker>
            <marker id="arrowBlue" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="hsl(217, 91%, 60%)" />
            </marker>

            {/* Flow paths */}
            <path id="pathA" d="M150,70 L150,105 L500,105 L500,155" fill="none" />
            <path id="pathB" d="M850,70 L850,105 L500,105 L500,155" fill="none" />
            <path id="pathToOrch" d="M500,195 L500,245" fill="none" />
            <path id="pathToCluster" d="M500,295 L500,345" fill="none" />
            <path id="pathToS3A" d="M500,435 L300,485" fill="none" />
            <path id="pathToS3B" d="M500,435 L700,485" fill="none" />
            <path id="pathReturnA" d="M300,535 L300,560 L500,560 L500,435" fill="none" />
            <path id="pathReturnB" d="M700,535 L700,560 L500,560 L500,435" fill="none" />
          </defs>

          {/* Background */}
          <rect width="1000" height="650" fill="hsl(222, 47%, 11%)" />
          <rect width="1000" height="650" fill="url(#gridPattern)" />

          {/* ===== TOP LAYER: EMPRESAS ===== */}
          {/* Empresa A */}
          <g>
            <rect x="80" y="30" width="140" height="45" rx="8" fill="hsl(263, 70%, 50%)" stroke="hsl(263, 70%, 70%)" strokeWidth="2">
              <animate attributeName="opacity" values="0.9;1;0.9" dur="3s" repeatCount="indefinite" />
            </rect>
            <text x="150" y="58" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">Empresa A</text>
          </g>

          {/* Empresa B */}
          <g>
            <rect x="780" y="30" width="140" height="45" rx="8" fill="hsl(158, 64%, 42%)" stroke="hsl(158, 64%, 62%)" strokeWidth="2">
              <animate attributeName="opacity" values="0.9;1;0.9" dur="3s" repeatCount="indefinite" begin="1.5s" />
            </rect>
            <text x="850" y="58" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">Empresa B</text>
          </g>

          {/* ===== API GATEWAY ===== */}
          <g>
            <rect x="300" y="120" width="400" height="40" rx="6" fill="hsl(226, 71%, 40%)" stroke="hsl(217, 91%, 60%)" strokeWidth="2" />
            <text x="500" y="145" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">API GATEWAY (Load Balancer)</text>
          </g>

          {/* ===== ORQUESTRADOR ===== */}
          <g>
            <rect x="300" y="180" width="400" height="40" rx="6" fill="hsl(217, 91%, 50%)" stroke="hsl(217, 91%, 70%)" strokeWidth="2" />
            <text x="500" y="205" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">ORQUESTRADOR (Kubernetes/ECS)</text>
          </g>

          {/* Connection lines top section */}
          <line x1="150" y1="75" x2="150" y2="105" stroke="hsl(263, 70%, 60%)" strokeWidth="2" strokeDasharray="4,2" />
          <line x1="150" y1="105" x2="300" y2="105" stroke="hsl(263, 70%, 60%)" strokeWidth="2" strokeDasharray="4,2" />
          <line x1="300" y1="105" x2="300" y2="120" stroke="hsl(263, 70%, 60%)" strokeWidth="2" strokeDasharray="4,2" />
          
          <line x1="850" y1="75" x2="850" y2="105" stroke="hsl(158, 64%, 52%)" strokeWidth="2" strokeDasharray="4,2" />
          <line x1="850" y1="105" x2="700" y2="105" stroke="hsl(158, 64%, 52%)" strokeWidth="2" strokeDasharray="4,2" />
          <line x1="700" y1="105" x2="700" y2="120" stroke="hsl(158, 64%, 52%)" strokeWidth="2" strokeDasharray="4,2" />

          <line x1="500" y1="160" x2="500" y2="180" stroke="hsl(217, 91%, 60%)" strokeWidth="2" markerEnd="url(#arrowBlue)" />
          <line x1="500" y1="220" x2="500" y2="240" stroke="hsl(217, 91%, 60%)" strokeWidth="2" markerEnd="url(#arrowBlue)" />

          {/* ===== GPU CLUSTER ===== */}
          <g filter="url(#glowGreen)">
            <rect x="200" y="250" width="600" height="110" rx="10" fill="hsl(160, 84%, 25%)" stroke="hsl(158, 64%, 52%)" strokeWidth="3">
              <animate attributeName="stroke-width" values="3;5;3" dur="2s" repeatCount="indefinite" />
              <animate attributeName="stroke" values="hsl(158, 64%, 52%);hsl(158, 64%, 72%);hsl(158, 64%, 52%)" dur="2s" repeatCount="indefinite" />
            </rect>
            <text x="500" y="275" textAnchor="middle" fill="hsl(158, 64%, 80%)" fontSize="11" fontWeight="bold">CLUSTER DE INFERÊNCIA GPU NODES – AWS g5.xlarge</text>
            
            {/* Base Model */}
            <rect x="230" y="290" width="180" height="55" rx="6" fill="hsl(221, 83%, 53%)" stroke="hsl(217, 91%, 70%)" strokeWidth="2">
              <animate attributeName="opacity" values="0.85;1;0.85" dur="1.5s" repeatCount="indefinite" />
            </rect>
            <text x="320" y="315" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">BASE MODEL</text>
            <text x="320" y="332" textAnchor="middle" fill="hsl(217, 91%, 85%)" fontSize="10">Llama 3 / 70B / 80B</text>

            {/* Inference Server */}
            <rect x="450" y="290" width="320" height="55" rx="6" fill="hsl(142, 76%, 36%)" stroke="hsl(142, 71%, 55%)" strokeWidth="2">
              <animate attributeName="opacity" values="0.85;1;0.85" dur="1.5s" repeatCount="indefinite" begin="0.75s" />
            </rect>
            <text x="610" y="315" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">Inference Server (SLM/TGI/LoRAX)</text>
            <text x="610" y="332" textAnchor="middle" fill="hsl(142, 71%, 85%)" fontSize="10">⚡ Ultra-Low Latency Processing</text>
          </g>

          {/* Connection to S3 */}
          <line x1="500" y1="360" x2="500" y2="390" stroke="hsl(38, 92%, 50%)" strokeWidth="2" markerEnd="url(#arrowOrange)" />
          <text x="520" y="380" fill="hsl(38, 92%, 70%)" fontSize="10">Retrieval</text>

          {/* ===== S3 STORAGE ===== */}
          <g>
            <rect x="150" y="400" width="700" height="145" rx="10" fill="hsl(32, 81%, 25%)" stroke="hsl(38, 92%, 50%)" strokeWidth="2" />
            <text x="500" y="425" textAnchor="middle" fill="hsl(45, 93%, 70%)" fontSize="13" fontWeight="bold">ARMAZENAMENTO S3</text>

            {/* Adaptador A */}
            <g>
              <rect x="180" y="440" width="180" height="70" rx="6" fill="hsl(263, 70%, 40%)" stroke="hsl(263, 70%, 60%)" strokeWidth="2">
                <animate attributeName="stroke-width" values="2;4;2" dur="3s" repeatCount="indefinite" begin="2s" />
              </rect>
              <text x="270" y="465" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">Adaptador Empresa A</text>
              <text x="270" y="482" textAnchor="middle" fill="hsl(263, 70%, 80%)" fontSize="9">(RAG Customizado)</text>
              <text x="270" y="500" textAnchor="middle" fill="hsl(263, 70%, 70%)" fontSize="10">●●●●●●●</text>
            </g>

            {/* Adaptador B */}
            <g>
              <rect x="620" y="440" width="180" height="70" rx="6" fill="hsl(158, 64%, 32%)" stroke="hsl(158, 64%, 52%)" strokeWidth="2">
                <animate attributeName="stroke-width" values="2;4;2" dur="3s" repeatCount="indefinite" begin="3s" />
              </rect>
              <text x="710" y="465" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">Adaptador Empresa B</text>
              <text x="710" y="482" textAnchor="middle" fill="hsl(158, 64%, 80%)" fontSize="9">(RAG Customizado)</text>
              <text x="710" y="500" textAnchor="middle" fill="hsl(158, 64%, 70%)" fontSize="10">●●●●●●●</text>
            </g>

            {/* Base Model LoRA */}
            <g>
              <rect x="400" y="440" width="180" height="70" rx="6" fill="hsl(26, 90%, 35%)" stroke="hsl(26, 90%, 55%)" strokeWidth="2" />
              <text x="490" y="465" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">Base Model LoRA</text>
              <text x="490" y="482" textAnchor="middle" fill="hsl(26, 90%, 80%)" fontSize="9">(Modelos Compartilhados)</text>
              <text x="490" y="500" textAnchor="middle" fill="hsl(26, 90%, 70%)" fontSize="10">1x Carregado</text>
            </g>
          </g>

          {/* Return arrows from S3 to Cluster */}
          <path d="M270,440 Q270,400 400,370" fill="none" stroke="hsl(263, 70%, 50%)" strokeWidth="2" strokeDasharray="5,3" opacity="0.6" />
          <path d="M710,440 Q710,400 600,370" fill="none" stroke="hsl(158, 64%, 52%)" strokeWidth="2" strokeDasharray="5,3" opacity="0.6" />
          <text x="350" y="395" fill="hsl(263, 70%, 70%)" fontSize="9">Inference A</text>
          <text x="620" y="395" fill="hsl(158, 64%, 70%)" fontSize="9">Inference B</text>

          {/* ===== ANIMATED DATA FLOW ===== */}
          {/* Flow from Empresa A */}
          <circle r="6" fill="hsl(0, 84%, 60%)">
            <animateMotion dur="4s" repeatCount="indefinite">
              <mpath href="#pathA" />
            </animateMotion>
            <animate attributeName="opacity" values="0;1;1;0" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle r="5" fill="hsl(263, 70%, 60%)">
            <animateMotion dur="4s" repeatCount="indefinite" begin="2s">
              <mpath href="#pathA" />
            </animateMotion>
            <animate attributeName="opacity" values="0;1;1;0" dur="4s" repeatCount="indefinite" begin="2s" />
          </circle>

          {/* Flow from Empresa B */}
          <circle r="6" fill="hsl(25, 95%, 53%)">
            <animateMotion dur="4s" repeatCount="indefinite" begin="1s">
              <mpath href="#pathB" />
            </animateMotion>
            <animate attributeName="opacity" values="0;1;1;0" dur="4s" repeatCount="indefinite" begin="1s" />
          </circle>
          <circle r="5" fill="hsl(158, 64%, 52%)">
            <animateMotion dur="4s" repeatCount="indefinite" begin="3s">
              <mpath href="#pathB" />
            </animateMotion>
            <animate attributeName="opacity" values="0;1;1;0" dur="4s" repeatCount="indefinite" begin="3s" />
          </circle>

          {/* Flow to Orquestrador */}
          <circle r="5" fill="hsl(217, 91%, 60%)">
            <animateMotion dur="1s" repeatCount="indefinite">
              <mpath href="#pathToOrch" />
            </animateMotion>
          </circle>

          {/* Flow to Cluster */}
          <circle r="5" fill="hsl(158, 64%, 52%)">
            <animateMotion dur="1s" repeatCount="indefinite" begin="0.5s">
              <mpath href="#pathToCluster" />
            </animateMotion>
          </circle>

          {/* Flow to S3 Adapters */}
          <circle r="4" fill="hsl(263, 70%, 60%)">
            <animateMotion dur="2s" repeatCount="indefinite" begin="1s">
              <mpath href="#pathToS3A" />
            </animateMotion>
            <animate attributeName="opacity" values="0;1;1;0" dur="2s" repeatCount="indefinite" begin="1s" />
          </circle>
          <circle r="4" fill="hsl(158, 64%, 52%)">
            <animateMotion dur="2s" repeatCount="indefinite" begin="2s">
              <mpath href="#pathToS3B" />
            </animateMotion>
            <animate attributeName="opacity" values="0;1;1;0" dur="2s" repeatCount="indefinite" begin="2s" />
          </circle>

          {/* Return flow from S3 */}
          <circle r="4" fill="hsl(263, 70%, 70%)">
            <animateMotion dur="2.5s" repeatCount="indefinite" begin="2.5s">
              <mpath href="#pathReturnA" />
            </animateMotion>
            <animate attributeName="opacity" values="0;1;1;0" dur="2.5s" repeatCount="indefinite" begin="2.5s" />
          </circle>
          <circle r="4" fill="hsl(158, 64%, 70%)">
            <animateMotion dur="2.5s" repeatCount="indefinite" begin="3.5s">
              <mpath href="#pathReturnB" />
            </animateMotion>
            <animate attributeName="opacity" values="0;1;1;0" dur="2.5s" repeatCount="indefinite" begin="3.5s" />
          </circle>

          {/* Legend */}
          <g transform="translate(20, 560)">
            <rect x="0" y="0" width="180" height="80" rx="6" fill="hsl(222, 47%, 15%)" stroke="hsl(215, 20%, 35%)" strokeWidth="1" />
            <text x="10" y="20" fill="hsl(210, 40%, 80%)" fontSize="10" fontWeight="bold">LEGENDA</text>
            <circle cx="20" cy="38" r="5" fill="hsl(263, 70%, 50%)" />
            <text x="32" y="42" fill="hsl(263, 70%, 80%)" fontSize="9">Empresa A (Fluxo)</text>
            <circle cx="20" cy="56" r="5" fill="hsl(158, 64%, 52%)" />
            <text x="32" y="60" fill="hsl(158, 64%, 80%)" fontSize="9">Empresa B (Fluxo)</text>
            <circle cx="20" cy="74" r="5" fill="hsl(0, 84%, 60%)" />
            <text x="32" y="78" fill="hsl(0, 84%, 80%)" fontSize="9">Dados em Trânsito</text>
          </g>
        </svg>
      </Card>

      {/* Specification Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hardware Specs */}
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="h-5 w-5 text-blue-400" />
            <h4 className="font-bold text-foreground">Especificações de Hardware</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">GPU:</span>
              <span className="text-foreground font-medium">NVIDIA A10G</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VRAM:</span>
              <span className="text-foreground font-medium">24 GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">RAM Sistema:</span>
              <span className="text-foreground font-medium">32 GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">vCPUs:</span>
              <span className="text-foreground font-medium">4</span>
            </div>
          </div>
        </Card>

        {/* AWS Costs */}
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-5 w-5 text-green-400" />
            <h4 className="font-bold text-foreground">Custos AWS (On-Demand)</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">g5.xlarge:</span>
              <span className="text-foreground font-medium">~US$ 738/mês</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Spot Instance:</span>
              <span className="text-green-400 font-medium">~US$ 221/mês</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Economia Spot:</span>
              <span className="text-green-400 font-medium">-70%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">S3 Storage:</span>
              <span className="text-foreground font-medium">~US$ 23/TB</span>
            </div>
          </div>
        </Card>

        {/* LoRA Strategy */}
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-5 w-5 text-orange-400" />
            <h4 className="font-bold text-foreground">Estratégia LoRA</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base Model:</span>
              <span className="text-foreground font-medium">1x Carregado</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Adaptadores:</span>
              <span className="text-foreground font-medium">Hot-swap</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">LoRA Rank:</span>
              <span className="text-foreground font-medium">16</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tamanho Adapter:</span>
              <span className="text-foreground font-medium">~50 MB</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SaasRagArchitectureDiagram;
