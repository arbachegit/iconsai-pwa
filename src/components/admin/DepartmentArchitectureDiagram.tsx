import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw, Cpu, DollarSign, Layers } from 'lucide-react';

const DepartmentArchitectureDiagram = () => {
  const [zoom, setZoom] = useState(100);
  const [animationKey, setAnimationKey] = useState(0);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
  const handleReset = () => {
    setZoom(100);
    setAnimationKey(prev => prev + 1);
  };

  // Department colors
  const deptColors = {
    comercial: { fill: 'hsl(217, 91%, 50%)', stroke: 'hsl(217, 91%, 70%)', text: 'hsl(217, 91%, 85%)' },
    rh: { fill: 'hsl(142, 76%, 36%)', stroke: 'hsl(142, 76%, 56%)', text: 'hsl(142, 76%, 85%)' },
    financeiro: { fill: 'hsl(263, 70%, 50%)', stroke: 'hsl(263, 70%, 70%)', text: 'hsl(263, 70%, 85%)' },
    ti: { fill: 'hsl(25, 95%, 45%)', stroke: 'hsl(25, 95%, 65%)', text: 'hsl(25, 95%, 85%)' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-foreground">SLM para Uma Empresa, Vários Departamentos</h3>
          <p className="text-sm text-muted-foreground">RAG customizado por departamento com base de conhecimento compartilhada</p>
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
            {/* Glow filters */}
            <filter id="deptGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="slmGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>

            {/* Grid pattern */}
            <pattern id="deptGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(215, 20%, 25%)" strokeWidth="0.5" opacity="0.3"/>
            </pattern>

            {/* Flow paths */}
            <path id="pathComercial" d="M170,110 L170,200" fill="none" />
            <path id="pathRH" d="M390,110 L390,200" fill="none" />
            <path id="pathFinanceiro" d="M610,110 L610,200" fill="none" />
            <path id="pathTI" d="M830,110 L830,200" fill="none" />
            <path id="pathToStorage" d="M500,300 L500,380" fill="none" />
            <path id="pathToSLM" d="M500,470 L500,530" fill="none" />
          </defs>

          {/* Background */}
          <rect width="1000" height="650" fill="hsl(222, 47%, 11%)" />
          <rect width="1000" height="650" fill="url(#deptGrid)" />

          {/* Company Container */}
          <rect x="50" y="20" width="900" height="600" rx="15" fill="none" stroke="hsl(215, 20%, 35%)" strokeWidth="2" strokeDasharray="8,4" />
          <text x="500" y="50" textAnchor="middle" fill="hsl(210, 40%, 70%)" fontSize="18" fontWeight="bold">EMPRESA X</text>

          {/* ===== DEPARTMENTS ===== */}
          {/* Comercial */}
          <g>
            <rect x="100" y="70" width="140" height="50" rx="8" fill={deptColors.comercial.fill} stroke={deptColors.comercial.stroke} strokeWidth="2">
              <animate attributeName="opacity" values="0.9;1;0.9" dur="3s" repeatCount="indefinite" />
            </rect>
            <text x="170" y="100" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">Comercial</text>
          </g>

          {/* RH */}
          <g>
            <rect x="320" y="70" width="140" height="50" rx="8" fill={deptColors.rh.fill} stroke={deptColors.rh.stroke} strokeWidth="2">
              <animate attributeName="opacity" values="0.9;1;0.9" dur="3s" repeatCount="indefinite" begin="0.5s" />
            </rect>
            <text x="390" y="100" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">RH</text>
          </g>

          {/* Financeiro */}
          <g>
            <rect x="540" y="70" width="140" height="50" rx="8" fill={deptColors.financeiro.fill} stroke={deptColors.financeiro.stroke} strokeWidth="2">
              <animate attributeName="opacity" values="0.9;1;0.9" dur="3s" repeatCount="indefinite" begin="1s" />
            </rect>
            <text x="610" y="100" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">Financeiro</text>
          </g>

          {/* TI */}
          <g>
            <rect x="760" y="70" width="140" height="50" rx="8" fill={deptColors.ti.fill} stroke={deptColors.ti.stroke} strokeWidth="2">
              <animate attributeName="opacity" values="0.9;1;0.9" dur="3s" repeatCount="indefinite" begin="1.5s" />
            </rect>
            <text x="830" y="100" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">TI</text>
          </g>

          {/* ===== RAG ADAPTERS ===== */}
          {/* Connection lines */}
          <line x1="170" y1="120" x2="170" y2="150" stroke={deptColors.comercial.stroke} strokeWidth="2" strokeDasharray="4,2" />
          <line x1="390" y1="120" x2="390" y2="150" stroke={deptColors.rh.stroke} strokeWidth="2" strokeDasharray="4,2" />
          <line x1="610" y1="120" x2="610" y2="150" stroke={deptColors.financeiro.stroke} strokeWidth="2" strokeDasharray="4,2" />
          <line x1="830" y1="120" x2="830" y2="150" stroke={deptColors.ti.stroke} strokeWidth="2" strokeDasharray="4,2" />

          {/* RAG Comercial */}
          <g>
            <rect x="100" y="150" width="140" height="70" rx="6" fill="hsl(217, 91%, 25%)" stroke={deptColors.comercial.stroke} strokeWidth="2">
              <animate attributeName="stroke-width" values="2;3;2" dur="2s" repeatCount="indefinite" />
            </rect>
            <text x="170" y="175" textAnchor="middle" fill={deptColors.comercial.text} fontSize="11" fontWeight="bold">RAG Depto</text>
            <text x="170" y="195" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">Comercial</text>
            <text x="170" y="212" textAnchor="middle" fill={deptColors.comercial.text} fontSize="9">Propostas, Vendas</text>
          </g>

          {/* RAG RH */}
          <g>
            <rect x="320" y="150" width="140" height="70" rx="6" fill="hsl(142, 76%, 20%)" stroke={deptColors.rh.stroke} strokeWidth="2">
              <animate attributeName="stroke-width" values="2;3;2" dur="2s" repeatCount="indefinite" begin="0.5s" />
            </rect>
            <text x="390" y="175" textAnchor="middle" fill={deptColors.rh.text} fontSize="11" fontWeight="bold">RAG Depto</text>
            <text x="390" y="195" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">RH</text>
            <text x="390" y="212" textAnchor="middle" fill={deptColors.rh.text} fontSize="9">Políticas, Benefícios</text>
          </g>

          {/* RAG Financeiro */}
          <g>
            <rect x="540" y="150" width="140" height="70" rx="6" fill="hsl(263, 70%, 25%)" stroke={deptColors.financeiro.stroke} strokeWidth="2">
              <animate attributeName="stroke-width" values="2;3;2" dur="2s" repeatCount="indefinite" begin="1s" />
            </rect>
            <text x="610" y="175" textAnchor="middle" fill={deptColors.financeiro.text} fontSize="11" fontWeight="bold">RAG Depto</text>
            <text x="610" y="195" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">Financeiro</text>
            <text x="610" y="212" textAnchor="middle" fill={deptColors.financeiro.text} fontSize="9">Relatórios, Budget</text>
          </g>

          {/* RAG TI */}
          <g>
            <rect x="760" y="150" width="140" height="70" rx="6" fill="hsl(25, 95%, 25%)" stroke={deptColors.ti.stroke} strokeWidth="2">
              <animate attributeName="stroke-width" values="2;3;2" dur="2s" repeatCount="indefinite" begin="1.5s" />
            </rect>
            <text x="830" y="175" textAnchor="middle" fill={deptColors.ti.text} fontSize="11" fontWeight="bold">RAG Depto</text>
            <text x="830" y="195" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">TI</text>
            <text x="830" y="212" textAnchor="middle" fill={deptColors.ti.text} fontSize="9">Docs Técnicos, KB</text>
          </g>

          {/* ===== CONVERGENCE LINES ===== */}
          <line x1="170" y1="220" x2="170" y2="260" stroke={deptColors.comercial.stroke} strokeWidth="2" strokeDasharray="4,2" />
          <line x1="170" y1="260" x2="380" y2="260" stroke={deptColors.comercial.stroke} strokeWidth="2" strokeDasharray="4,2" />
          
          <line x1="390" y1="220" x2="390" y2="260" stroke={deptColors.rh.stroke} strokeWidth="2" strokeDasharray="4,2" />
          <line x1="390" y1="260" x2="420" y2="260" stroke={deptColors.rh.stroke} strokeWidth="2" strokeDasharray="4,2" />

          <line x1="610" y1="220" x2="610" y2="260" stroke={deptColors.financeiro.stroke} strokeWidth="2" strokeDasharray="4,2" />
          <line x1="610" y1="260" x2="580" y2="260" stroke={deptColors.financeiro.stroke} strokeWidth="2" strokeDasharray="4,2" />

          <line x1="830" y1="220" x2="830" y2="260" stroke={deptColors.ti.stroke} strokeWidth="2" strokeDasharray="4,2" />
          <line x1="830" y1="260" x2="620" y2="260" stroke={deptColors.ti.stroke} strokeWidth="2" strokeDasharray="4,2" />

          {/* Central vertical connector */}
          <line x1="500" y1="260" x2="500" y2="290" stroke="hsl(38, 92%, 50%)" strokeWidth="3" />

          {/* ===== ARMAZENAMENTO VETORIZADO ===== */}
          <g>
            <rect x="200" y="290" width="600" height="80" rx="10" fill="hsl(32, 81%, 20%)" stroke="hsl(38, 92%, 50%)" strokeWidth="3">
              <animate attributeName="stroke-width" values="3;4;3" dur="2s" repeatCount="indefinite" />
            </rect>
            <text x="500" y="320" textAnchor="middle" fill="hsl(45, 93%, 70%)" fontSize="14" fontWeight="bold">ARMAZENAMENTO VETORIZADO</text>
            <text x="500" y="345" textAnchor="middle" fill="hsl(45, 93%, 55%)" fontSize="12">(Base de Conhecimento Unificada)</text>
            <text x="500" y="362" textAnchor="middle" fill="hsl(45, 93%, 45%)" fontSize="10">Embeddings + Metadados por Departamento</text>
          </g>

          {/* ===== SLM BASE ===== */}
          <line x1="500" y1="370" x2="500" y2="420" stroke="hsl(187, 96%, 42%)" strokeWidth="3" />
          
          <g filter="url(#slmGlow)">
            <rect x="200" y="420" width="600" height="100" rx="12" fill="hsl(187, 96%, 20%)" stroke="hsl(187, 96%, 52%)" strokeWidth="4">
              <animate attributeName="stroke-width" values="4;6;4" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="stroke" values="hsl(187, 96%, 52%);hsl(187, 96%, 72%);hsl(187, 96%, 52%)" dur="1.5s" repeatCount="indefinite" />
            </rect>
            <text x="500" y="455" textAnchor="middle" fill="hsl(187, 96%, 80%)" fontSize="16" fontWeight="bold">SLM (MODELO BASE CENTRAL)</text>
            <text x="500" y="480" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">Llama-3-8B + LoRA Adapters</text>
            <text x="500" y="505" textAnchor="middle" fill="hsl(187, 96%, 65%)" fontSize="11">Customizado por Departamento • Inferência Unificada</text>
          </g>

          {/* ===== ANIMATED DATA FLOW ===== */}
          {/* Comercial flow */}
          <circle r="5" fill={deptColors.comercial.stroke}>
            <animateMotion dur="2s" repeatCount="indefinite">
              <mpath href="#pathComercial" />
            </animateMotion>
          </circle>

          {/* RH flow */}
          <circle r="5" fill={deptColors.rh.stroke}>
            <animateMotion dur="2s" repeatCount="indefinite" begin="0.5s">
              <mpath href="#pathRH" />
            </animateMotion>
          </circle>

          {/* Financeiro flow */}
          <circle r="5" fill={deptColors.financeiro.stroke}>
            <animateMotion dur="2s" repeatCount="indefinite" begin="1s">
              <mpath href="#pathFinanceiro" />
            </animateMotion>
          </circle>

          {/* TI flow */}
          <circle r="5" fill={deptColors.ti.stroke}>
            <animateMotion dur="2s" repeatCount="indefinite" begin="1.5s">
              <mpath href="#pathTI" />
            </animateMotion>
          </circle>

          {/* Flow to storage */}
          <circle r="6" fill="hsl(38, 92%, 50%)">
            <animateMotion dur="1.5s" repeatCount="indefinite">
              <mpath href="#pathToStorage" />
            </animateMotion>
          </circle>

          {/* Flow to SLM */}
          <circle r="6" fill="hsl(187, 96%, 52%)">
            <animateMotion dur="1.5s" repeatCount="indefinite" begin="0.75s">
              <mpath href="#pathToSLM" />
            </animateMotion>
          </circle>

          {/* Legend */}
          <g transform="translate(20, 545)">
            <rect x="0" y="0" width="200" height="85" rx="6" fill="hsl(222, 47%, 15%)" stroke="hsl(215, 20%, 35%)" strokeWidth="1" />
            <text x="10" y="18" fill="hsl(210, 40%, 80%)" fontSize="10" fontWeight="bold">LEGENDA</text>
            <circle cx="20" cy="35" r="5" fill={deptColors.comercial.fill} />
            <text x="32" y="39" fill={deptColors.comercial.text} fontSize="9">Comercial</text>
            <circle cx="100" cy="35" r="5" fill={deptColors.rh.fill} />
            <text x="112" y="39" fill={deptColors.rh.text} fontSize="9">RH</text>
            <circle cx="20" cy="55" r="5" fill={deptColors.financeiro.fill} />
            <text x="32" y="59" fill={deptColors.financeiro.text} fontSize="9">Financeiro</text>
            <circle cx="100" cy="55" r="5" fill={deptColors.ti.fill} />
            <text x="112" y="59" fill={deptColors.ti.text} fontSize="9">TI</text>
            <circle cx="20" cy="75" r="5" fill="hsl(187, 96%, 52%)" />
            <text x="32" y="79" fill="hsl(187, 96%, 80%)" fontSize="9">SLM Central</text>
          </g>
        </svg>
      </Card>

      {/* Specification Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Benefits */}
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-5 w-5 text-cyan-400" />
            <h4 className="font-bold text-foreground">Benefícios Multi-RAG</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Isolamento:</span>
              <span className="text-cyan-300 font-medium">Por Departamento</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modelo Base:</span>
              <span className="text-cyan-300 font-medium">1x Compartilhado</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Adapters:</span>
              <span className="text-cyan-300 font-medium">4x Especializados</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Manutenção:</span>
              <span className="text-green-400 font-medium">Independente</span>
            </div>
          </div>
        </Card>

        {/* Costs */}
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-5 w-5 text-green-400" />
            <h4 className="font-bold text-foreground">Economia de Infraestrutura</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">vs 4 Modelos:</span>
              <span className="text-green-400 font-medium">~75% economia</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GPU Única:</span>
              <span className="text-foreground font-medium">g5.xlarge</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VRAM Usage:</span>
              <span className="text-foreground font-medium">~18GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Custo/mês:</span>
              <span className="text-green-400 font-medium">~US$ 730</span>
            </div>
          </div>
        </Card>

        {/* Architecture */}
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="h-5 w-5 text-purple-400" />
            <h4 className="font-bold text-foreground">Arquitetura Técnica</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base Model:</span>
              <span className="text-purple-300 font-medium">Llama-3-8B</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Adapter Size:</span>
              <span className="text-purple-300 font-medium">~50-100MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Swap Time:</span>
              <span className="text-purple-300 font-medium">~50ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vector DB:</span>
              <span className="text-purple-300 font-medium">Unificado</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DepartmentArchitectureDiagram;
