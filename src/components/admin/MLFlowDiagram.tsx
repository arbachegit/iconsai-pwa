import { useEffect, useState } from "react";

interface MLFlowDiagramProps {
  /** Activity level from 0 to 1, affects animation speed */
  activityLevel?: number;
}

export const MLFlowDiagram = ({ activityLevel = 0.5 }: MLFlowDiagramProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Calculate animation durations based on activity level (higher activity = faster)
  const baseDuration = 3 - (activityLevel * 2.5);
  const pulseDuration = 4 - (activityLevel * 3);
  const travelDuration = 3 - (activityLevel * 2);

  return (
    <div 
      className={`relative bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5 rounded-xl border border-primary/30 p-4 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="text-sm font-bold text-center mb-3 text-primary flex items-center justify-center gap-2">
        <span className="text-base">🔄</span> 
        Ciclo Completo de Aprendizado ML
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
          8 Etapas
        </span>
      </div>
      
      <svg viewBox="0 0 700 380" className="w-full h-auto">
        <defs>
          {/* Advanced Gradients */}
          <linearGradient id="mlUploadGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0.1" />
          </linearGradient>
          
          <linearGradient id="mlAiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#10B981" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.1" />
          </linearGradient>
          
          <linearGradient id="mlTagsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0891B2" stopOpacity="0.1" />
          </linearGradient>
          
          <linearGradient id="mlAdminGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.1" />
          </linearGradient>
          
          <linearGradient id="mlRulesGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EC4899" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#EC4899" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#DB2777" stopOpacity="0.1" />
          </linearGradient>
          
          <linearGradient id="mlMetricsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#34D399" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#6EE7B7" stopOpacity="0.1" />
          </linearGradient>
          
          <linearGradient id="mlDbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.1" />
          </linearGradient>
          
          <linearGradient id="mlFeedbackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F472B6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#EC4899" stopOpacity="0.2" />
          </linearGradient>

          {/* Glow filters */}
          <filter id="glowOrange" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          
          <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          
          <filter id="glowPurple" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Arrow markers */}
          <marker id="arrowOrange" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#F59E0B" opacity="0.8" />
          </marker>
          <marker id="arrowGreen" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#10B981" opacity="0.8" />
          </marker>
          <marker id="arrowCyan" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#06B6D4" opacity="0.8" />
          </marker>
          <marker id="arrowPurple" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#8B5CF6" opacity="0.8" />
          </marker>
          <marker id="arrowPink" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#EC4899" opacity="0.8" />
          </marker>
          <marker id="arrowBlue" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#3B82F6" opacity="0.8" />
          </marker>
          <marker id="arrowEmerald" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#34D399" opacity="0.8" />
          </marker>
        </defs>

        {/* Background grid */}
        <pattern id="mlGrid" width="25" height="25" patternUnits="userSpaceOnUse">
          <path d="M 25 0 L 0 0 0 25" fill="none" stroke="hsl(var(--muted))" strokeWidth="0.2" opacity="0.4" />
        </pattern>
        <rect width="700" height="380" fill="url(#mlGrid)" rx="8" />

        {/* ═══════════════════════════════════════════════════════════════════════
            NODE 1: Document Upload (Top Left)
        ═══════════════════════════════════════════════════════════════════════ */}
        <g filter="url(#glowOrange)">
          <rect x="15" y="30" width="100" height="70" rx="12" 
            fill="url(#mlUploadGradient)" stroke="#F59E0B" strokeWidth="2">
            <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur={`${pulseDuration}s`} repeatCount="indefinite" />
          </rect>
          <text x="65" y="58" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="700">
            📄 Upload
          </text>
          <text x="65" y="78" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="9">
            Documento Novo
          </text>
        </g>

        {/* ═══════════════════════════════════════════════════════════════════════
            NODE 2: AI Extraction (Top Center-Left)
        ═══════════════════════════════════════════════════════════════════════ */}
        <g filter="url(#glowGreen)">
          <rect x="170" y="30" width="130" height="70" rx="12" 
            fill="url(#mlAiGradient)" stroke="#10B981" strokeWidth="2">
            <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur={`${pulseDuration * 1.1}s`} repeatCount="indefinite" />
          </rect>
          <text x="235" y="55" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">
            🤖 IA Extração
          </text>
          <text x="235" y="73" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">
            suggest-document-tags
          </text>
          <text x="235" y="88" textAnchor="middle" fill="#10B981" fontSize="8" opacity="0.8">
            NLP + Merge Rules
          </text>
        </g>

        {/* ═══════════════════════════════════════════════════════════════════════
            NODE 3: Suggested Tags (Top Center-Right)
        ═══════════════════════════════════════════════════════════════════════ */}
        <g>
          <rect x="355" y="30" width="120" height="70" rx="12" 
            fill="url(#mlTagsGradient)" stroke="#06B6D4" strokeWidth="2">
            <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur={`${pulseDuration * 1.2}s`} repeatCount="indefinite" />
          </rect>
          <text x="415" y="55" textAnchor="middle" fill="#06B6D4" fontSize="13" fontWeight="700">
            🏷️ Tags Sugeridas
          </text>
          <text x="415" y="75" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">
            Parent + Child tags
          </text>
          <text x="415" y="90" textAnchor="middle" fill="#06B6D4" fontSize="8" opacity="0.8">
            Com regras aplicadas
          </text>
        </g>

        {/* ═══════════════════════════════════════════════════════════════════════
            NODE 4: Admin Review (Right Side - EXPANDED)
        ═══════════════════════════════════════════════════════════════════════ */}
        <g filter="url(#glowPurple)">
          <rect x="530" y="20" width="155" height="130" rx="14" 
            fill="url(#mlAdminGradient)" stroke="#8B5CF6" strokeWidth="2.5">
            <animate attributeName="stroke-opacity" values="0.4;1;0.4" dur={`${pulseDuration * 0.8}s`} repeatCount="indefinite" />
          </rect>
          {/* Breathing effect */}
          <rect x="530" y="20" width="155" height="130" rx="14" 
            fill="none" stroke="#8B5CF6" strokeWidth="1" opacity="0.3">
            <animate attributeName="width" values="155;160;155" dur={`${pulseDuration * 1.5}s`} repeatCount="indefinite" />
            <animate attributeName="height" values="130;135;130" dur={`${pulseDuration * 1.5}s`} repeatCount="indefinite" />
            <animate attributeName="x" values="530;527.5;530" dur={`${pulseDuration * 1.5}s`} repeatCount="indefinite" />
            <animate attributeName="y" values="20;17.5;20" dur={`${pulseDuration * 1.5}s`} repeatCount="indefinite" />
          </rect>
          <text x="607" y="45" textAnchor="middle" fill="#8B5CF6" fontSize="14" fontWeight="700">
            👤 Admin Revisão
          </text>
          <line x1="545" y1="55" x2="670" y2="55" stroke="#8B5CF6" strokeWidth="1" opacity="0.4" />
          
          {/* 4 Actions */}
          <g>
            <circle cx="555" cy="75" r="8" fill="#22C55E" opacity="0.3" />
            <text x="570" y="78" fill="#22C55E" fontSize="10" fontWeight="600">✓ Aceita</text>
          </g>
          <g>
            <circle cx="555" cy="95" r="8" fill="#3B82F6" opacity="0.3" />
            <text x="570" y="98" fill="#3B82F6" fontSize="10" fontWeight="600">✎ Corrige</text>
          </g>
          <g>
            <circle cx="555" cy="115" r="8" fill="#EC4899" opacity="0.3" />
            <text x="570" y="118" fill="#EC4899" fontSize="10" fontWeight="600">🔗 Unifica</text>
          </g>
          <g>
            <circle cx="555" cy="135" r="8" fill="#EF4444" opacity="0.3" />
            <text x="570" y="138" fill="#EF4444" fontSize="10" fontWeight="600">✗ Rejeita</text>
          </g>
        </g>

        {/* ═══════════════════════════════════════════════════════════════════════
            NODE 5: tag_merge_rules (Center)
        ═══════════════════════════════════════════════════════════════════════ */}
        <g>
          <rect x="280" y="160" width="140" height="60" rx="10" 
            fill="url(#mlRulesGradient)" stroke="#EC4899" strokeWidth="2">
            <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur={`${pulseDuration * 1.3}s`} repeatCount="indefinite" />
          </rect>
          <text x="350" y="185" textAnchor="middle" fill="#EC4899" fontSize="12" fontWeight="700">
            🧠 tag_merge_rules
          </text>
          <text x="350" y="205" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">
            Banco de Regras ML
          </text>
          {/* Pulsing glow */}
          <ellipse cx="350" cy="190" rx="80" ry="35" fill="none" stroke="#EC4899" strokeWidth="1" opacity="0">
            <animate attributeName="rx" values="80;95;80" dur={`${pulseDuration}s`} repeatCount="indefinite" />
            <animate attributeName="ry" values="35;45;35" dur={`${pulseDuration}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0;0.3" dur={`${pulseDuration}s`} repeatCount="indefinite" />
          </ellipse>
        </g>

        {/* ═══════════════════════════════════════════════════════════════════════
            NODE 6: Metrics Scorecard (Bottom Left)
        ═══════════════════════════════════════════════════════════════════════ */}
        <g>
          <rect x="15" y="270" width="150" height="90" rx="12" 
            fill="url(#mlMetricsGradient)" stroke="#34D399" strokeWidth="2">
            <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur={`${pulseDuration * 1.1}s`} repeatCount="indefinite" />
          </rect>
          <text x="90" y="295" textAnchor="middle" fill="#34D399" fontSize="12" fontWeight="700">
            📊 Métricas
          </text>
          <line x1="30" y1="305" x2="150" y2="305" stroke="#34D399" strokeWidth="0.5" opacity="0.5" />
          <text x="40" y="325" fill="#22C55E" fontSize="9">✅ Acertos (TP)</text>
          <text x="40" y="343" fill="#EF4444" fontSize="9">❌ Erros (FP)</text>
          <text x="90" y="355" textAnchor="middle" fill="#34D399" fontSize="8" fontWeight="600">
            Score: Acertos/(Total)
          </text>
        </g>

        {/* ═══════════════════════════════════════════════════════════════════════
            NODE 7: document_tags Database (Bottom Center)
        ═══════════════════════════════════════════════════════════════════════ */}
        <g>
          <rect x="220" y="280" width="140" height="70" rx="10" 
            fill="url(#mlDbGradient)" stroke="#3B82F6" strokeWidth="2">
            <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur={`${pulseDuration * 1.2}s`} repeatCount="indefinite" />
          </rect>
          <text x="290" y="305" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="700">
            🗄️ document_tags
          </text>
          <text x="290" y="325" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">
            Persistência final
          </text>
          <text x="290" y="340" textAnchor="middle" fill="#3B82F6" fontSize="8" opacity="0.7">
            tags validadas
          </text>
        </g>

        {/* ═══════════════════════════════════════════════════════════════════════
            NODE 8: Feedback Loop Indicator (Bottom Right)
        ═══════════════════════════════════════════════════════════════════════ */}
        <g>
          <ellipse cx="530" cy="310" rx="70" ry="45" 
            fill="url(#mlFeedbackGradient)" stroke="#F472B6" strokeWidth="2" strokeDasharray="8 4">
            <animate attributeName="stroke-dashoffset" from="12" to="0" dur={`${baseDuration * 0.8}s`} repeatCount="indefinite" />
          </ellipse>
          <text x="530" y="305" textAnchor="middle" fill="#F472B6" fontSize="12" fontWeight="700">
            🔄 Feedback Loop
          </text>
          <text x="530" y="325" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">
            Ciclo contínuo
          </text>
        </g>

        {/* ═══════════════════════════════════════════════════════════════════════
            CURVED ARROWS WITH BEZIER PATHS
        ═══════════════════════════════════════════════════════════════════════ */}
        
        {/* Arrow 1: Upload → AI */}
        <g>
          <path id="pathUploadAi" d="M 120 65 Q 145 65 165 65" fill="none" 
            stroke="#F59E0B" strokeWidth="2" strokeDasharray="6 3" markerEnd="url(#arrowGreen)">
            <animate attributeName="stroke-dashoffset" from="9" to="0" dur={`${baseDuration}s`} repeatCount="indefinite" />
          </path>
          <circle r="5" fill="#F59E0B">
            <animateMotion dur={`${travelDuration}s`} repeatCount="indefinite">
              <mpath href="#pathUploadAi" />
            </animateMotion>
          </circle>
          <text x="142" y="55" textAnchor="middle" fill="#F59E0B" fontSize="8" fontWeight="600">1</text>
        </g>

        {/* Arrow 2: AI → Tags */}
        <g>
          <path id="pathAiTags" d="M 305 65 Q 330 65 350 65" fill="none" 
            stroke="#10B981" strokeWidth="2" strokeDasharray="6 3" markerEnd="url(#arrowCyan)">
            <animate attributeName="stroke-dashoffset" from="9" to="0" dur={`${baseDuration}s`} repeatCount="indefinite" />
          </path>
          <circle r="5" fill="#10B981">
            <animateMotion dur={`${travelDuration}s`} repeatCount="indefinite" begin="0.3s">
              <mpath href="#pathAiTags" />
            </animateMotion>
          </circle>
          <text x="327" y="55" textAnchor="middle" fill="#10B981" fontSize="8" fontWeight="600">2</text>
        </g>

        {/* Arrow 3: Tags → Admin (curved) */}
        <g>
          <path id="pathTagsAdmin" d="M 480 65 Q 505 65 525 65" fill="none" 
            stroke="#06B6D4" strokeWidth="2" strokeDasharray="6 3" markerEnd="url(#arrowPurple)">
            <animate attributeName="stroke-dashoffset" from="9" to="0" dur={`${baseDuration}s`} repeatCount="indefinite" />
          </path>
          <circle r="5" fill="#06B6D4">
            <animateMotion dur={`${travelDuration}s`} repeatCount="indefinite" begin="0.6s">
              <mpath href="#pathTagsAdmin" />
            </animateMotion>
          </circle>
          <text x="502" y="55" textAnchor="middle" fill="#06B6D4" fontSize="8" fontWeight="600">3</text>
        </g>

        {/* Arrow 4: Admin → Rules (curved down) */}
        <g>
          <path id="pathAdminRules" d="M 530 150 Q 480 175 425 185" fill="none" 
            stroke="#8B5CF6" strokeWidth="2" strokeDasharray="6 3" markerEnd="url(#arrowPink)">
            <animate attributeName="stroke-dashoffset" from="9" to="0" dur={`${baseDuration}s`} repeatCount="indefinite" />
          </path>
          <circle r="5" fill="#8B5CF6">
            <animateMotion dur={`${travelDuration * 1.1}s`} repeatCount="indefinite" begin="0.9s">
              <mpath href="#pathAdminRules" />
            </animateMotion>
          </circle>
          <text x="475" y="160" textAnchor="middle" fill="#8B5CF6" fontSize="8" fontWeight="600">4</text>
        </g>

        {/* Arrow 5: Rules → AI (feedback up) */}
        <g>
          <path id="pathRulesAi" d="M 280 175 Q 255 130 250 105" fill="none" 
            stroke="#EC4899" strokeWidth="2.5" strokeDasharray="8 4" markerEnd="url(#arrowGreen)">
            <animate attributeName="stroke-dashoffset" from="12" to="0" dur={`${baseDuration * 0.9}s`} repeatCount="indefinite" />
          </path>
          <circle r="6" fill="#EC4899">
            <animateMotion dur={`${travelDuration * 1.3}s`} repeatCount="indefinite" begin="1.2s">
              <mpath href="#pathRulesAi" />
            </animateMotion>
          </circle>
          <text x="258" y="140" textAnchor="middle" fill="#EC4899" fontSize="8" fontWeight="600">5</text>
        </g>

        {/* Arrow 6: Admin → Database (straight down) */}
        <g>
          <path id="pathAdminDb" d="M 607 155 Q 607 200 530 270" fill="none" 
            stroke="#8B5CF6" strokeWidth="2" strokeDasharray="6 3" markerEnd="url(#arrowPink)">
            <animate attributeName="stroke-dashoffset" from="9" to="0" dur={`${baseDuration}s`} repeatCount="indefinite" />
          </path>
          <circle r="5" fill="#8B5CF6">
            <animateMotion dur={`${travelDuration * 1.2}s`} repeatCount="indefinite" begin="1.5s">
              <mpath href="#pathAdminDb" />
            </animateMotion>
          </circle>
        </g>

        {/* Arrow 7: Database → document_tags */}
        <g>
          <path id="pathFeedbackDb" d="M 460 315 Q 400 315 365 315" fill="none" 
            stroke="#F472B6" strokeWidth="2" strokeDasharray="6 3" markerEnd="url(#arrowBlue)">
            <animate attributeName="stroke-dashoffset" from="9" to="0" dur={`${baseDuration}s`} repeatCount="indefinite" />
          </path>
          <circle r="5" fill="#F472B6">
            <animateMotion dur={`${travelDuration}s`} repeatCount="indefinite" begin="1.8s">
              <mpath href="#pathFeedbackDb" />
            </animateMotion>
          </circle>
        </g>

        {/* Arrow 8: document_tags → Metrics */}
        <g>
          <path id="pathDbMetrics" d="M 215 315 Q 180 315 170 315" fill="none" 
            stroke="#3B82F6" strokeWidth="2" strokeDasharray="6 3" markerEnd="url(#arrowEmerald)">
            <animate attributeName="stroke-dashoffset" from="9" to="0" dur={`${baseDuration}s`} repeatCount="indefinite" />
          </path>
          <circle r="5" fill="#3B82F6">
            <animateMotion dur={`${travelDuration}s`} repeatCount="indefinite" begin="2.1s">
              <mpath href="#pathDbMetrics" />
            </animateMotion>
          </circle>
        </g>

        {/* Arrow 9: Metrics → Feedback Loop */}
        <g>
          <path id="pathMetricsFeedback" d="M 90 270 Q 90 240 200 200 Q 280 160 280 155" fill="none" 
            stroke="#34D399" strokeWidth="2" strokeDasharray="6 3" markerEnd="url(#arrowPink)">
            <animate attributeName="stroke-dashoffset" from="9" to="0" dur={`${baseDuration * 1.2}s`} repeatCount="indefinite" />
          </path>
          <circle r="5" fill="#34D399">
            <animateMotion dur={`${travelDuration * 1.5}s`} repeatCount="indefinite" begin="2.4s">
              <mpath href="#pathMetricsFeedback" />
            </animateMotion>
          </circle>
        </g>

        {/* Central label */}
        <text x="350" y="250" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10" fontStyle="italic" opacity="0.8">
          Aprendizado contínuo melhora precisão
        </text>

        {/* Activity indicator */}
        <g>
          <circle cx="680" cy="20" r="8" 
            fill={activityLevel > 0.7 ? "#22C55E" : activityLevel > 0.3 ? "#F59E0B" : "#6B7280"}>
            <animate attributeName="opacity" values="0.5;1;0.5" dur={`${0.5 + (1 - activityLevel)}s`} repeatCount="indefinite" />
          </circle>
          <text x="665" y="24" textAnchor="end" 
            fill={activityLevel > 0.7 ? "#22C55E" : activityLevel > 0.3 ? "#F59E0B" : "#6B7280"} 
            fontSize="8" fontWeight="600">
            {activityLevel > 0.7 ? "ALTA" : activityLevel > 0.3 ? "MÉDIA" : "BAIXA"}
          </text>
        </g>
      </svg>
      
      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-primary/20">
        <div className="text-[10px] text-muted-foreground text-center mb-2 font-semibold uppercase tracking-wider">
          Legenda
        </div>
        <div className="flex items-center justify-center gap-4 flex-wrap text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" /> Upload
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500" /> IA
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-cyan-500" /> Tags
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-500" /> Admin
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-pink-500" /> Regras ML
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500" /> Database
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-400" /> Métricas
          </span>
        </div>
      </div>
    </div>
  );
};