import React, { useEffect, useMemo, useRef, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
  embedded?: boolean;
}

type Stage = "starsIn" | "grow" | "write" | "suction" | "done";

type Particle = {
  x: number;
  y: number;
  r: number;
  baseA: number;
  tw: number;
  ph: number;
  born: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  duration = 5500,
  embedded = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const t0Ref = useRef<number>(0);

  const [stage, setStage] = useState<Stage>("starsIn");
  const [fadeOut, setFadeOut] = useState(false);
  const [starScale, setStarScale] = useState(0);
  const [starGlow, setStarGlow] = useState(0);

  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  // Partículas (220 mini-estrelas)
  const particles = useMemo<Particle[]>(() => {
    const count = 220;
    const arr: Particle[] = new Array(count).fill(0).map(() => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.65 + Math.random() * 1.6,
      baseA: 0.25 + Math.random() * 0.75,
      tw: 0.6 + Math.random() * 2.3,
      ph: Math.random() * Math.PI * 2,
      born: Math.random() * 1.0,
    }));
    return arr;
  }, []);

  // Timeline - adjusted for smoother transitions
  const TL = useMemo(() => {
    const tStarsIn = 1200;
    const tGrow = 1800;
    const tWrite = 1600;
    const tSuction = Math.max(600, duration - (tStarsIn + tGrow + tWrite));
    const t1 = tStarsIn;
    const t2 = t1 + tGrow;
    const t3 = t2 + tWrite;
    const t4 = t3 + tSuction;
    return { tStarsIn, tGrow, tWrite, tSuction, t1, t2, t3, t4 };
  }, [duration]);

  function setCanvasSize() {
    const c = canvasRef.current;
    if (!c) return;
    const parent = c.parentElement;
    const w = parent ? parent.clientWidth : window.innerWidth;
    const h = parent ? parent.clientHeight : window.innerHeight;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    c.width = Math.floor(w * dpr);
    c.height = Math.floor(h * dpr);
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    sizeRef.current = { w, h, dpr };
  }

  // Desenha mini estrela 4 pontas
  function drawSparkle4(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    alpha: number
  ) {
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.35, size * 0.18), 0, Math.PI * 2);
    ctx.fill();
  }

  function renderFrame(now: number) {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const { w, h, dpr } = sizeRef.current;
    const t = now - t0Ref.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    // Determina stage
    let st: Stage = "starsIn";
    if (t < TL.t1) st = "starsIn";
    else if (t < TL.t2) st = "grow";
    else if (t < TL.t3) st = "write";
    else if (t < TL.t4) st = "suction";
    else st = "done";
    if (st !== stage) setStage(st);

    // Progressos
    const pStars = clamp01(t / TL.t1);
    const pGrow = clamp01((t - TL.t1) / (TL.t2 - TL.t1));
    const pWrite = clamp01((t - TL.t2) / (TL.t3 - TL.t2));
    const pSuction = clamp01((t - TL.t3) / (TL.t4 - TL.t3));

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.fillStyle = "rgba(255,255,255,0.95)";

    const suctionK = st === "suction" ? easeInOut(pSuction) : 0;

    // Desenha partículas
    for (let i = 0; i < particles.length; i++) {
      const P = particles[i];
      let x = P.x * w;
      let y = P.y * h;

      const bornGate = clamp01((pStars - P.born) / 0.25);
      const appear = st === "starsIn" ? easeOut(bornGate) : 1;
      const tw = 0.55 + 0.45 * Math.sin(P.ph + (now / 1000) * P.tw);

      if (suctionK > 0) {
        const dx = cx - x;
        const dy = cy - y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const pull = suctionK * suctionK * 22;
        x += (dx / dist) * pull * (1 + P.r * 0.5);
        y += (dy / dist) * pull * (1 + P.r * 0.5);
      }

      const fadeParticles = st === "suction" ? clamp01(1 - pSuction * 1.1) : 1;
      const a = P.baseA * tw * appear * fadeParticles;
      const s = P.r * (0.9 + tw * 0.35);

      if (s < 1.05) {
        ctx.globalAlpha = a;
        ctx.fillRect(x, y, 1, 1);
      } else {
        drawSparkle4(ctx, x, y, s, a);
      }
    }

    // Parâmetros da estrela central
    const growK = st === "grow" ? easeInOut(pGrow) : st === "write" ? 1 : st === "suction" ? 1 : st === "starsIn" ? 0 : 1;
    const glowK = st === "grow" ? easeOut(pGrow) * 0.75 : st === "write" ? 0.85 : st === "suction" ? 1.2 : 0;

    const suctionScaleBoost = st === "suction" ? 1 + easeInOut(pSuction) * 0.45 : 1;
    const suctionGlowBoost = st === "suction" ? 1 + easeInOut(pSuction) * 1.2 : 1;

    setStarScale(growK * suctionScaleBoost);
    setStarGlow(glowK * suctionGlowBoost);

    if (st === "done") {
      if (!fadeOut) {
        setFadeOut(true);
        window.setTimeout(() => onComplete(), 1100);
      }
      return;
    }

    rafRef.current = requestAnimationFrame(renderFrame);
  }

  useEffect(() => {
    setCanvasSize();
    const onResize = () => setCanvasSize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    t0Ref.current = performance.now();
    rafRef.current = requestAnimationFrame(renderFrame);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const writingActive = stage === "write" || stage === "suction" || stage === "done";
  
  const textOpacity = stage === "suction" 
    ? clamp01(1 - easeInOut((performance.now() - t0Ref.current - TL.t3) / (TL.t4 - TL.t3)) * 1.25) 
    : 1;

  const overlayOpacity = fadeOut ? 0 : 1;

  return (
    <div
      className={`${embedded ? "absolute" : "fixed"} inset-0 z-50 bg-black overflow-hidden`}
      style={{
        opacity: overlayOpacity,
        transition: "opacity 1s ease-in-out",
      }}
    >
      {/* Canvas: estrelas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ background: "#000" }}
      />

      {/* Estrela central (4 pontas) */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          transform: `translate(-50%, -50%) scale(${starScale})`,
          transition: "transform 0.08s ease-out",
        }}
      >
        <CentralAIStar glow={starGlow} />
      </div>

      {/* Texto "KnowYOU AI" */}
      <div
        className="absolute left-1/2 top-[65%] -translate-x-1/2 pointer-events-none"
        style={{
          opacity: writingActive ? textOpacity : 0,
          transition: "opacity 0.15s ease-out",
        }}
      >
        <HandwritingTitle active={writingActive} />
      </div>
    </div>
  );
};

// Estrela central de 4 pontas
function CentralAIStar({ glow }: { glow: number }) {
  const g = Math.max(0, glow);

  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      className="block"
      style={{
        filter: `drop-shadow(0 0 ${8 + g * 25}px rgba(220,235,255,${0.3 + g * 0.5})) drop-shadow(0 0 ${4 + g * 12}px rgba(180,210,255,${0.25 + g * 0.35}))`,
      }}
    >
      <defs>
        <linearGradient id="starGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="50%" stopColor="#e8f4ff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#d0e8ff" stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id="starGlow4" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="40%" stopColor="#e0f0ff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#b8d8ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Glow background */}
      <circle cx="60" cy="60" r="55" fill="url(#starGlow4)" opacity={0.3 + g * 0.4} />

      {/* 4-pointed star shape */}
      <path
        d="M60 5 L65 50 L60 55 L55 50 Z M60 115 L55 70 L60 65 L65 70 Z M5 60 L50 55 L55 60 L50 65 Z M115 60 L70 65 L65 60 L70 55 Z"
        fill="url(#starGrad4)"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth="1"
      />

      {/* Center circle */}
      <circle cx="60" cy="60" r="12" fill="url(#starGrad4)" />
    </svg>
  );
}

// Texto simples com animação CSS - SOLUÇÃO DEFINITIVA
function HandwritingTitle({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    if (active) {
      const timer = setTimeout(() => setVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [active]);

  return (
    <div className="flex flex-col items-center">
      {/* KnowYOU - Texto único, sem separação de letras */}
      <h1 
        className={`
          text-5xl font-bold text-white whitespace-nowrap
          transition-all duration-1000 ease-out
          ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        `}
        style={{
          textShadow: '0 0 20px rgba(200,220,255,0.6), 0 0 40px rgba(150,180,255,0.3)',
          letterSpacing: '-0.02em',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      >
        KnowYOU
      </h1>
      
      {/* AI - Subtítulo */}
      <p 
        className={`
          text-xl font-semibold text-white/80 text-center mt-2
          transition-all duration-700
          ${visible ? 'opacity-100 translate-y-0 delay-500' : 'opacity-0 translate-y-2'}
        `}
        style={{
          textShadow: '0 0 12px rgba(200,220,255,0.4)',
          transitionDelay: visible ? '500ms' : '0ms'
        }}
      >
        AI
      </p>
    </div>
  );
}

export default SplashScreen;
