import { useEffect, useState } from "react";

export const TaxonomyFlowDiagram = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`relative bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg border border-primary/20 p-3 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="text-xs font-semibold text-center mb-2 text-primary">
        🏷️ Fluxo de Taxonomia Hierárquica
      </div>
      
      <svg viewBox="0 0 480 220" className="w-full h-auto">
        <defs>
          {/* Gradients */}
          <linearGradient id="taxDocGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.1" />
          </linearGradient>
          
          <linearGradient id="taxAiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.1" />
          </linearGradient>
          
          <linearGradient id="taxParentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.1" />
          </linearGradient>
          
          <linearGradient id="taxChildGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.1" />
          </linearGradient>
          
          <linearGradient id="taxMlGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EC4899" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#EC4899" stopOpacity="0.1" />
          </linearGradient>

          {/* Arrow markers */}
          <marker id="taxArrowOrange" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#F59E0B" opacity="0.7" />
          </marker>
          <marker id="taxArrowGreen" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#10B981" opacity="0.7" />
          </marker>
          <marker id="taxArrowPurple" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#8B5CF6" opacity="0.7" />
          </marker>
          <marker id="taxArrowCyan" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#06B6D4" opacity="0.7" />
          </marker>
          <marker id="taxArrowPink" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#EC4899" opacity="0.7" />
          </marker>
        </defs>

        {/* Background grid */}
        <pattern id="taxGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--muted))" strokeWidth="0.3" opacity="0.3" />
        </pattern>
        <rect width="480" height="220" fill="url(#taxGrid)" />

        {/* NODE 1: Document Upload - Left */}
        <g>
          <rect x="10" y="70" width="90" height="55" rx="10" 
            fill="url(#taxDocGradient)" stroke="#F59E0B" strokeWidth="2">
            <animate attributeName="stroke-opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
          </rect>
          <text x="55" y="92" textAnchor="middle" fill="#F59E0B" fontSize="11" fontWeight="600">📄 Doc</text>
          <text x="55" y="110" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">Upload PDF</text>
          
          <circle cx="55" cy="97" r="30" fill="none" stroke="#F59E0B" strokeWidth="1" opacity="0">
            <animate attributeName="r" values="30;45;30" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* ARROW 1: Doc → AI */}
        <g>
          <path d="M 105 97 L 145 97" stroke="#F59E0B" strokeWidth="2" fill="none" strokeDasharray="5 3" markerEnd="url(#taxArrowOrange)">
            <animate attributeName="stroke-dashoffset" from="8" to="0" dur="0.8s" repeatCount="indefinite" />
          </path>
          <circle r="3" fill="#F59E0B">
            <animateMotion dur="1.5s" repeatCount="indefinite">
              <mpath href="#taxPath1" />
            </animateMotion>
          </circle>
          <path id="taxPath1" d="M 105 97 L 145 97" fill="none" />
        </g>

        {/* NODE 2: AI Suggests - Center Top */}
        <g>
          <rect x="150" y="55" width="100" height="55" rx="10" 
            fill="url(#taxAiGradient)" stroke="#10B981" strokeWidth="2">
            <animate attributeName="stroke-opacity" values="0.6;1;0.6" dur="2.5s" repeatCount="indefinite" />
          </rect>
          <text x="200" y="78" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="600">🤖 IA Sugere</text>
          <text x="200" y="95" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">Extrai tags do</text>
          <text x="200" y="105" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">conteúdo</text>
        </g>

        {/* ARROW 2: AI → Parent */}
        <g>
          <path d="M 255 75 L 295 50" stroke="#10B981" strokeWidth="2" fill="none" strokeDasharray="5 3" markerEnd="url(#taxArrowGreen)">
            <animate attributeName="stroke-dashoffset" from="8" to="0" dur="0.8s" repeatCount="indefinite" />
          </path>
          <circle r="3" fill="#10B981">
            <animateMotion dur="1.5s" repeatCount="indefinite" begin="0.3s">
              <mpath href="#taxPath2" />
            </animateMotion>
          </circle>
          <path id="taxPath2" d="M 255 75 L 295 50" fill="none" />
        </g>

        {/* ARROW 3: AI → Child */}
        <g>
          <path d="M 255 95 L 295 120" stroke="#10B981" strokeWidth="2" fill="none" strokeDasharray="5 3" markerEnd="url(#taxArrowGreen)">
            <animate attributeName="stroke-dashoffset" from="8" to="0" dur="0.8s" repeatCount="indefinite" />
          </path>
          <circle r="3" fill="#06B6D4">
            <animateMotion dur="1.5s" repeatCount="indefinite" begin="0.5s">
              <mpath href="#taxPath3" />
            </animateMotion>
          </circle>
          <path id="taxPath3" d="M 255 95 L 295 120" fill="none" />
        </g>

        {/* NODE 3: Parent Tag - Right Top */}
        <g>
          <rect x="300" y="20" width="85" height="50" rx="10" 
            fill="url(#taxParentGradient)" stroke="#8B5CF6" strokeWidth="2">
            <animate attributeName="stroke-opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
          </rect>
          <text x="342" y="42" textAnchor="middle" fill="#8B5CF6" fontSize="10" fontWeight="600">🏷️ Parent</text>
          <text x="342" y="57" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">Categoria</text>
        </g>

        {/* NODE 4: Child Tag - Right Bottom */}
        <g>
          <rect x="300" y="100" width="85" height="50" rx="10" 
            fill="url(#taxChildGradient)" stroke="#06B6D4" strokeWidth="2">
            <animate attributeName="stroke-opacity" values="0.6;1;0.6" dur="2.2s" repeatCount="indefinite" />
          </rect>
          <text x="342" y="122" textAnchor="middle" fill="#06B6D4" fontSize="10" fontWeight="600">🔖 Child</text>
          <text x="342" y="137" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">Subcategoria</text>
        </g>

        {/* Hierarchy Link: Parent → Child */}
        <g>
          <path d="M 342 75 L 342 95" stroke="#8B5CF6" strokeWidth="1.5" fill="none" strokeDasharray="3 2" opacity="0.6" />
          <text x="355" y="88" fill="hsl(var(--muted-foreground))" fontSize="7" fontStyle="italic">filho de</text>
        </g>

        {/* NODE 5: Admin Validate - Bottom Center */}
        <g>
          <rect x="155" y="145" width="90" height="55" rx="10" 
            fill="url(#taxMlGradient)" stroke="#EC4899" strokeWidth="2">
            <animate attributeName="stroke-opacity" values="0.6;1;0.6" dur="2.8s" repeatCount="indefinite" />
          </rect>
          <text x="200" y="168" textAnchor="middle" fill="#EC4899" fontSize="11" fontWeight="600">👤 Admin</text>
          <text x="200" y="185" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">Valida / Merge</text>
        </g>

        {/* ARROW: Tags → Admin (curved) */}
        <g>
          <path d="M 320 155 Q 270 180 250 172" stroke="#EC4899" strokeWidth="2" fill="none" strokeDasharray="5 3" markerEnd="url(#taxArrowPink)">
            <animate attributeName="stroke-dashoffset" from="8" to="0" dur="0.8s" repeatCount="indefinite" />
          </path>
          <circle r="3" fill="#EC4899">
            <animateMotion dur="2s" repeatCount="indefinite" begin="0.8s">
              <mpath href="#taxPath4" />
            </animateMotion>
          </circle>
          <path id="taxPath4" d="M 320 155 Q 270 180 250 172" fill="none" />
        </g>

        {/* NODE 6: ML Rules - Far Right */}
        <g>
          <rect x="395" y="80" width="75" height="55" rx="10" 
            fill="url(#taxMlGradient)" stroke="#EC4899" strokeWidth="2" strokeDasharray="4 2">
            <animate attributeName="stroke-opacity" values="0.4;0.8;0.4" dur="3s" repeatCount="indefinite" />
          </rect>
          <text x="432" y="103" textAnchor="middle" fill="#EC4899" fontSize="10" fontWeight="600">🧠 ML</text>
          <text x="432" y="118" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="7">merge_rules</text>
          <text x="432" y="128" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="7">aprende</text>
        </g>

        {/* ARROW: Admin → ML (feedback) */}
        <g>
          <path d="M 200 205 Q 350 220 432 140" stroke="#EC4899" strokeWidth="1.5" fill="none" strokeDasharray="4 3" markerEnd="url(#taxArrowPink)" opacity="0.7">
            <animate attributeName="stroke-dashoffset" from="7" to="0" dur="1s" repeatCount="indefinite" />
          </path>
          <text x="320" y="215" textAnchor="middle" fill="#EC4899" fontSize="7">feedback ML</text>
        </g>

        {/* ARROW: ML → AI (learned rules) */}
        <g>
          <path d="M 395 100 Q 340 40 255 70" stroke="#EC4899" strokeWidth="1.5" fill="none" strokeDasharray="4 3" markerEnd="url(#taxArrowPink)" opacity="0.7">
            <animate attributeName="stroke-dashoffset" from="7" to="0" dur="1s" repeatCount="indefinite" />
          </path>
          <text x="330" y="30" textAnchor="middle" fill="#EC4899" fontSize="7">regras aprendidas</text>
        </g>

        {/* Step Labels */}
        <text x="55" y="140" textAnchor="middle" fill="#F59E0B" fontSize="8" fontWeight="500">1</text>
        <text x="200" y="125" textAnchor="middle" fill="#10B981" fontSize="8" fontWeight="500">2</text>
        <text x="342" y="165" textAnchor="middle" fill="#8B5CF6" fontSize="8" fontWeight="500">3</text>
        <text x="200" y="210" textAnchor="middle" fill="#EC4899" fontSize="8" fontWeight="500">4</text>
      </svg>
      
      <div className="text-[10px] text-muted-foreground text-center mt-2 space-y-0.5">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Doc
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> IA
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-violet-500" /> Parent
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-500" /> Child
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-pink-500" /> ML
          </span>
        </div>
      </div>
    </div>
  );
};
