import { useState } from "react";
import { FileText, Brain, FolderTree, User, Check, X, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TaxonomyHierarchySimulationDiagramProps {
  activityLevel?: number;
}

type SimulationPath = "neutral" | "accept" | "reject";

export const TaxonomyHierarchySimulationDiagram = ({ 
  activityLevel = 0.5 
}: TaxonomyHierarchySimulationDiagramProps) => {
  const [selectedPath, setSelectedPath] = useState<SimulationPath>("neutral");
  const animationDuration = Math.max(2, 5 - activityLevel * 3);

  return (
    <div className="w-full space-y-4">
      {/* Titles */}
      <div className="text-center">
        <h2 className="text-base font-bold text-foreground">
          Simulação: Descoberta de Hierarquia Taxonômica
        </h2>
        <h3 className="text-sm text-muted-foreground mt-1">
          Fluxo de como a IA identifica e aprende hierarquias de tags
        </h3>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant={selectedPath === "accept" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedPath(selectedPath === "accept" ? "neutral" : "accept")}
          className={`gap-2 ${
            selectedPath === "accept" 
              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500" 
              : "border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
          }`}
        >
          <Check className="w-4 h-4" />
          Aceitar
        </Button>
        <Button
          variant={selectedPath === "reject" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedPath(selectedPath === "reject" ? "neutral" : "reject")}
          className={`gap-2 ${
            selectedPath === "reject" 
              ? "bg-red-600 hover:bg-red-700 text-white border-red-500" 
              : "border-red-500/50 text-red-400 hover:bg-red-500/10"
          }`}
        >
          <X className="w-4 h-4" />
          Rejeitar
        </Button>
      </div>

      <svg viewBox="0 0 800 520" className="w-full h-auto">
        <defs>
          {/* Gradients */}
          <linearGradient id="docGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="aiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(142, 76%, 36%)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="hierarchyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="adminGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(280, 65%, 60%)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(280, 65%, 60%)" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="acceptGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(160, 84%, 39%)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(160, 84%, 39%)" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="rejectGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(0, 84%, 60%)" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="mlGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(330, 81%, 60%)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(330, 81%, 60%)" stopOpacity="0.4" />
          </linearGradient>

          {/* Flow path markers */}
          <marker id="arrowHead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--muted-foreground))" opacity="0.6" />
          </marker>
        </defs>

        {/* Background grid */}
        <pattern id="simGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#simGrid)" />

        {/* Flow paths with animations */}
        {/* Doc to AI */}
        <path
          d="M 130 55 L 200 55"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="2"
          fill="none"
          opacity="0.4"
          markerEnd="url(#arrowHead)"
          strokeDasharray="5,3"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-16" dur={`${animationDuration}s`} repeatCount="indefinite" />
        </path>

        {/* AI to Hierarchy */}
        <path
          d="M 400 95 L 400 140"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="2"
          fill="none"
          opacity="0.4"
          markerEnd="url(#arrowHead)"
          strokeDasharray="5,3"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-16" dur={`${animationDuration}s`} repeatCount="indefinite" />
        </path>

        {/* Hierarchy to Admin */}
        <path
          d="M 400 230 L 400 270"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="2"
          fill="none"
          opacity="0.4"
          markerEnd="url(#arrowHead)"
          strokeDasharray="5,3"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-16" dur={`${animationDuration}s`} repeatCount="indefinite" />
        </path>

        {/* Admin to Accept */}
        <path
          d="M 320 310 L 220 350"
          stroke="hsl(160, 84%, 39%)"
          strokeWidth={selectedPath === "accept" ? "3" : "2"}
          fill="none"
          opacity={selectedPath === "accept" ? "1" : selectedPath === "reject" ? "0.2" : "0.5"}
          markerEnd="url(#arrowHead)"
          strokeDasharray="5,3"
          className="transition-all duration-300"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-16" dur={`${animationDuration}s`} repeatCount="indefinite" />
        </path>

        {/* Admin to Reject */}
        <path
          d="M 480 310 L 580 350"
          stroke="hsl(0, 84%, 60%)"
          strokeWidth={selectedPath === "reject" ? "3" : "2"}
          fill="none"
          opacity={selectedPath === "reject" ? "1" : selectedPath === "accept" ? "0.2" : "0.5"}
          markerEnd="url(#arrowHead)"
          strokeDasharray="5,3"
          className="transition-all duration-300"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-16" dur={`${animationDuration}s`} repeatCount="indefinite" />
        </path>

        {/* Accept to ML Learn */}
        <path
          d="M 170 430 L 170 460"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="2"
          fill="none"
          opacity="0.4"
          markerEnd="url(#arrowHead)"
        />

        {/* Reject to ML Learn */}
        <path
          d="M 630 430 L 630 460"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="2"
          fill="none"
          opacity="0.4"
          markerEnd="url(#arrowHead)"
        />

        {/* ML to Metrics (curved paths) */}
        <path
          d="M 230 490 Q 350 520 400 490"
          stroke="hsl(330, 81%, 60%)"
          strokeWidth="1.5"
          fill="none"
          opacity="0.4"
          strokeDasharray="4,2"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-12" dur={`${animationDuration * 1.5}s`} repeatCount="indefinite" />
        </path>
        <path
          d="M 570 490 Q 490 520 400 490"
          stroke="hsl(330, 81%, 60%)"
          strokeWidth="1.5"
          fill="none"
          opacity="0.4"
          strokeDasharray="4,2"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-12" dur={`${animationDuration * 1.5}s`} repeatCount="indefinite" />
        </path>

        {/* === NODES === */}

        {/* 1. Document Node */}
        <g transform="translate(30, 20)">
          <rect
            x="0" y="0" width="100" height="70"
            rx="8"
            fill="url(#docGradient)"
            stroke="hsl(var(--primary))"
            strokeWidth="1.5"
          >
            <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" />
          </rect>
          <foreignObject x="10" y="8" width="80" height="24">
            <div className="flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
          </foreignObject>
          <text x="50" y="42" textAnchor="middle" fill="hsl(var(--primary-foreground))" fontSize="9" fontWeight="600">
            Documento
          </text>
          <text x="50" y="55" textAnchor="middle" fill="hsl(var(--primary-foreground))" fontSize="7" opacity="0.8">
            "Relatório Financeiro"
          </text>
        </g>

        {/* 2. AI Analysis Node */}
        <g transform="translate(200, 15)">
          <rect
            x="0" y="0" width="400" height="80"
            rx="8"
            fill="url(#aiGradient)"
            stroke="hsl(142, 76%, 36%)"
            strokeWidth="1.5"
          />
          <foreignObject x="15" y="8" width="30" height="24">
            <div className="flex items-center">
              <Brain className="w-5 h-5 text-emerald-100" />
            </div>
          </foreignObject>
          <text x="55" y="22" fill="hsl(0, 0%, 100%)" fontSize="10" fontWeight="600">
            IA Analisa Texto
          </text>
          <text x="15" y="42" fill="hsl(0, 0%, 100%)" fontSize="8" opacity="0.9">
            Keywords detectadas:
          </text>
          <text x="25" y="55" fill="hsl(0, 0%, 100%)" fontSize="7" opacity="0.8">
            - "balanço patrimonial"  - "fluxo de caixa"  - "demonstração de resultados"
          </text>
          <text x="25" y="68" fill="hsl(0, 0%, 100%)" fontSize="7" opacity="0.8">
            - "contabilidade"  - "auditoria financeira"
          </text>
          
          {/* Pulsing indicator */}
          <circle cx="380" cy="40" r="6" fill="hsl(142, 76%, 50%)">
            <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* 3. Hierarchy Candidate Node */}
        <g transform="translate(200, 140)">
          <rect
            x="0" y="0" width="400" height="90"
            rx="8"
            fill="url(#hierarchyGradient)"
            stroke="hsl(var(--accent))"
            strokeWidth="1.5"
          />
          <foreignObject x="15" y="8" width="30" height="24">
            <div className="flex items-center">
              <FolderTree className="w-5 h-5 text-accent-foreground" />
            </div>
          </foreignObject>
          <text x="55" y="22" fill="hsl(var(--accent-foreground))" fontSize="10" fontWeight="600">
            HIERARQUIA CANDIDATA ENCONTRADA
          </text>
          
          {/* Hierarchy visualization */}
          <rect x="20" y="35" width="180" height="45" rx="4" fill="hsl(var(--background))" opacity="0.3" />
          <text x="30" y="50" fill="hsl(var(--accent-foreground))" fontSize="8">
            Parent: "Finanças"
          </text>
          <text x="45" y="62" fill="hsl(var(--accent-foreground))" fontSize="8">
            Child: "Contabilidade"
          </text>
          <text x="60" y="74" fill="hsl(var(--accent-foreground))" fontSize="8">
            Child: "Balanço"
          </text>
          
          {/* Confidence badge */}
          <rect x="280" y="45" width="100" height="30" rx="4" fill="hsl(45, 93%, 47%)" opacity="0.2" stroke="hsl(45, 93%, 47%)" strokeWidth="1" />
          <text x="330" y="58" textAnchor="middle" fill="hsl(45, 93%, 47%)" fontSize="8" fontWeight="600">
            Confiança: 78%
          </text>
          <text x="330" y="70" textAnchor="middle" fill="hsl(45, 93%, 47%)" fontSize="6">
            (acima do threshold)
          </text>
        </g>

        {/* 4. Admin Decision Node */}
        <g transform="translate(280, 270)">
          <rect
            x="0" y="0" width="240" height="50"
            rx="8"
            fill="url(#adminGradient)"
            stroke="hsl(280, 65%, 60%)"
            strokeWidth="1.5"
          >
            <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
          </rect>
          <foreignObject x="15" y="10" width="30" height="30">
            <div className="flex items-center">
              <User className="w-5 h-5 text-purple-100" />
            </div>
          </foreignObject>
          <text x="55" y="22" fill="hsl(0, 0%, 100%)" fontSize="10" fontWeight="600">
            CIENTISTA DE DADOS (Admin)
          </text>
          <text x="55" y="38" fill="hsl(0, 0%, 100%)" fontSize="8" opacity="0.9">
            "Esta hierarquia está correta?"
          </text>
        </g>

        {/* 5. Accept Path Node */}
        <g 
          transform="translate(50, 355)" 
          opacity={selectedPath === "accept" ? "1" : selectedPath === "reject" ? "0.3" : "1"}
          className="transition-all duration-300"
        >
          <rect
            x="0" y="0" width="240" height="75"
            rx="8"
            fill="url(#acceptGradient)"
            stroke="hsl(160, 84%, 39%)"
            strokeWidth={selectedPath === "accept" ? "3" : "1.5"}
          >
            {selectedPath === "accept" && (
              <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
            )}
          </rect>
          <foreignObject x="15" y="8" width="24" height="24">
            <div className="flex items-center">
              <Check className="w-5 h-5 text-emerald-100" />
            </div>
          </foreignObject>
          <text x="45" y="20" fill="hsl(0, 0%, 100%)" fontSize="10" fontWeight="600">
            ACEITA
          </text>
          
          <text x="15" y="38" fill="hsl(0, 0%, 100%)" fontSize="8">
            Tag Aceita:
          </text>
          <rect x="15" y="44" width="150" height="25" rx="3" fill="hsl(var(--background))" opacity="0.2" />
          <text x="22" y="55" fill="hsl(0, 0%, 100%)" fontSize="7">
            Finanças
          </text>
          <text x="32" y="65" fill="hsl(0, 0%, 100%)" fontSize="7">
            Contabilidade
          </text>
        </g>

        {/* 6. Reject Path Node */}
        <g 
          transform="translate(510, 355)"
          opacity={selectedPath === "reject" ? "1" : selectedPath === "accept" ? "0.3" : "1"}
          className="transition-all duration-300"
        >
          <rect
            x="0" y="0" width="240" height="75"
            rx="8"
            fill="url(#rejectGradient)"
            stroke="hsl(0, 84%, 60%)"
            strokeWidth={selectedPath === "reject" ? "3" : "1.5"}
          >
            {selectedPath === "reject" && (
              <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
            )}
          </rect>
          <foreignObject x="15" y="8" width="24" height="24">
            <div className="flex items-center">
              <X className="w-5 h-5 text-red-100" />
            </div>
          </foreignObject>
          <text x="45" y="20" fill="hsl(0, 0%, 100%)" fontSize="10" fontWeight="600">
            REJEITA
          </text>
          
          <text x="15" y="38" fill="hsl(0, 0%, 100%)" fontSize="8">
            Tag Rejeitada:
          </text>
          <rect x="15" y="44" width="150" height="25" rx="3" fill="hsl(var(--background))" opacity="0.2" />
          <text x="22" y="55" fill="hsl(0, 0%, 100%)" fontSize="7">
            Geral
          </text>
          <text x="32" y="65" fill="hsl(0, 0%, 100%)" fontSize="7">
            Relatório
          </text>
          <text x="175" y="58" fill="hsl(0, 0%, 100%)" fontSize="6" opacity="0.8">
            Motivo:
          </text>
          <text x="175" y="68" fill="hsl(0, 0%, 100%)" fontSize="6" opacity="0.8">
            "Muito genérico"
          </text>
        </g>

        {/* 7. ML Learn Accept */}
        <g 
          transform="translate(50, 465)"
          opacity={selectedPath === "accept" ? "1" : selectedPath === "reject" ? "0.3" : "1"}
          className="transition-all duration-300"
        >
          <rect
            x="0" y="0" width="240" height="50"
            rx="8"
            fill="url(#mlGradient)"
            stroke="hsl(330, 81%, 60%)"
            strokeWidth={selectedPath === "accept" ? "2.5" : "1.5"}
          />
          <foreignObject x="15" y="10" width="24" height="24">
            <div className="flex items-center">
              <Database className="w-4 h-4 text-pink-100" />
            </div>
          </foreignObject>
          <text x="45" y="18" fill="hsl(0, 0%, 100%)" fontSize="9" fontWeight="600">
            ML APRENDE
          </text>
          <text x="15" y="32" fill="hsl(0, 0%, 100%)" fontSize="6.5" opacity="0.9">
            - Regra salva em tag_merge_rules
          </text>
          <text x="15" y="42" fill="hsl(0, 0%, 100%)" fontSize="6.5" opacity="0.9">
            - Score de confiança aumenta
          </text>
        </g>

        {/* 8. ML Learn Reject */}
        <g 
          transform="translate(510, 465)"
          opacity={selectedPath === "reject" ? "1" : selectedPath === "accept" ? "0.3" : "1"}
          className="transition-all duration-300"
        >
          <rect
            x="0" y="0" width="240" height="50"
            rx="8"
            fill="url(#mlGradient)"
            stroke="hsl(330, 81%, 60%)"
            strokeWidth={selectedPath === "reject" ? "2.5" : "1.5"}
          />
          <foreignObject x="15" y="10" width="24" height="24">
            <div className="flex items-center">
              <Database className="w-4 h-4 text-pink-100" />
            </div>
          </foreignObject>
          <text x="45" y="18" fill="hsl(0, 0%, 100%)" fontSize="9" fontWeight="600">
            ML APRENDE
          </text>
          <text x="15" y="32" fill="hsl(0, 0%, 100%)" fontSize="6.5" opacity="0.9">
            - Regra negativa registrada
          </text>
          <text x="15" y="42" fill="hsl(0, 0%, 100%)" fontSize="6.5" opacity="0.9">
            - Evita sugerir parent genérico
          </text>
        </g>

        {/* Animated data packets - Accept path */}
        {selectedPath !== "reject" && (
          <circle r="4" fill="hsl(160, 84%, 39%)">
            <animateMotion dur={`${animationDuration}s`} repeatCount="indefinite">
              <mpath href="#flowPathAccept" />
            </animateMotion>
          </circle>
        )}

        {/* Animated data packets - Reject path */}
        {selectedPath !== "accept" && (
          <circle r="4" fill="hsl(0, 84%, 60%)">
            <animateMotion dur={`${animationDuration}s`} repeatCount="indefinite">
              <mpath href="#flowPathReject" />
            </animateMotion>
          </circle>
        )}

        {/* Hidden paths for animation */}
        <path id="flowPathAccept" d="M 130 55 L 200 55 L 400 55 L 400 140 L 400 270 L 320 310 L 170 390 L 170 465" fill="none" stroke="none" />
        <path id="flowPathReject" d="M 130 55 L 200 55 L 400 55 L 400 140 L 400 270 L 480 310 L 630 390 L 630 465" fill="none" stroke="none" />
      </svg>
    </div>
  );
};
