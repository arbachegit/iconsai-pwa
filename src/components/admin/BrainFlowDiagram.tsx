import { memo } from "react";
import { Brain, MessageCircle, Sparkles, Star, Lightbulb, Code, Database, Settings, Zap } from "lucide-react";

/**
 * BrainFlowDiagram - Standalone Cognitive Processing Diagram
 * 
 * Displays bidirectional flow between Human Brain and Computational Brain (AI)
 * with continuous animated elements along curved paths.
 * 
 * INPUT (Human → AI): [MessageCircle] → Palavra → [MessageCircle] → Dados → [MessageCircle] → PROMPT
 * OUTPUT (AI → Human): [Sparkles] → VALOR → [Sparkles] → SOLUÇÃO → [Sparkles] → EFICIÊNCIA
 * 
 * Decoupled component - no external state dependencies to prevent flickering
 */
export const BrainFlowDiagram = memo(() => {
  // Fixed animation parameters for continuous flow - NO STATE to prevent re-renders
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

  // Tech icons background - slow blinking with varied sizes
  const backgroundIcons = [
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
    <div className="w-full mt-8 relative">
      {/* Container with cyberpunk styling */}
      <div className="relative rounded-2xl overflow-hidden border border-cyan-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Tech icons background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {backgroundIcons.map((item, i) => (
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

        {/* Main cognitive flow diagram */}
        <svg 
          viewBox="0 0 1000 280" 
          className="w-full h-auto relative z-10 py-6"
          overflow="hidden"
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
              <g key={`input-${index}`} opacity="0">
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
              <g key={`output-${index}`} opacity="0">
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
});

BrainFlowDiagram.displayName = 'BrainFlowDiagram';

export default BrainFlowDiagram;
