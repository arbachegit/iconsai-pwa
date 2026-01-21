import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, ChevronDown, BookOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AIHistoryPanel } from "./AIHistoryPanel";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const HeroSection = () => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Background grid points
    const gridSpacing = 80;
    const gridPoints: Array<{ x: number; y: number }> = [];
    
    for (let x = 0; x < canvas.width; x += gridSpacing) {
      for (let y = 0; y < canvas.height; y += gridSpacing) {
        gridPoints.push({ x, y });
      }
    }

    // Enhanced particles
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      opacity: number;
      pulsePhase: number;
      hue: number;
    }> = [];

    // Create more particles with varied properties
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 3 + 1,
        opacity: Math.random() * 0.5 + 0.3,
        pulsePhase: Math.random() * Math.PI * 2,
        hue: 180 + Math.random() * 60, // Blue to purple range
      });
    }

    let animationFrame: number;
    let lastTime = 0;

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // Fade effect instead of full clear
      ctx.fillStyle = "rgba(10, 14, 39, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw static grid in background
      ctx.strokeStyle = "rgba(0, 217, 255, 0.03)";
      ctx.lineWidth = 1;
      
      gridPoints.forEach((point, i) => {
        gridPoints.forEach((otherPoint, j) => {
          if (i >= j) return;
          const dx = point.x - otherPoint.x;
          const dy = point.y - otherPoint.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < gridSpacing * 1.5) {
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(otherPoint.x, otherPoint.y);
            ctx.stroke();
          }
        });
      });

      // Draw and update particles
      particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.pulsePhase += 0.02;

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // Pulse effect
        const pulseScale = 1 + Math.sin(particle.pulsePhase) * 0.3;
        const currentRadius = particle.radius * pulseScale;
        const currentOpacity = particle.opacity * (0.7 + Math.sin(particle.pulsePhase) * 0.3);

        // Draw particle with glow
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, currentRadius * 3
        );
        gradient.addColorStop(0, `hsla(${particle.hue}, 100%, 50%, ${currentOpacity})`);
        gradient.addColorStop(0.5, `hsla(${particle.hue}, 100%, 50%, ${currentOpacity * 0.3})`);
        gradient.addColorStop(1, `hsla(${particle.hue}, 100%, 50%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, currentRadius * 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections between nearby particles
        particles.forEach((otherParticle, otherIndex) => {
          if (index >= otherIndex) return;
          
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            const connectionOpacity = (1 - distance / 150) * 0.2;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            
            const avgHue = (particle.hue + otherParticle.hue) / 2;
            ctx.strokeStyle = `hsla(${avgHue}, 100%, 50%, ${connectionOpacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Recalculate grid
      gridPoints.length = 0;
      for (let x = 0; x < canvas.width; x += gridSpacing) {
        for (let y = 0; y < canvas.height; y += gridSpacing) {
          gridPoints.push({ x, y });
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 md:pt-20">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: 0.6 }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-card/50 backdrop-blur-sm px-4 py-2 rounded-full border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              {t("hero.title")}
            </span>
          </div>

          <h1 className="py-2 text-4xl md:text-6xl lg:text-7xl font-bold leading-normal bg-gradient-to-r from-cyan-400 via-green-400 to-yellow-400 bg-clip-text text-transparent">
            {t("hero.subtitle")}
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {t("hero.description")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-end pt-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="lg"
                    className="bg-gradient-primary hover:!bg-transparent hover:![background-image:linear-gradient(to_right,hsl(191_100%_50%/0.1),hsl(270_64%_58%/0.1),hsl(150_100%_50%/0.1))] hover:border hover:border-primary/50 hover:text-white transition-all duration-300 glow-effect hover:!shadow-none group"
                    onClick={() =>
                      document.querySelector("#knowyou")?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    {t("hero.ctaStudy")}
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px] bg-background/95 border-primary/30 text-center duration-300">
                  <p>{t("hero.ctaStudyTooltip")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="flex flex-col items-center">
              {/* Indicador "Comece por aqui" - animação sincronizada */}
              <div className="flex flex-col items-center gap-0 mb-1 animate-bounce">
                <span className="text-sm font-medium text-primary/80">
                  Comece por aqui
                </span>
                <ChevronDown className="w-5 h-5 text-primary" />
              </div>
              
              {/* Container exclusivo para botão + ondas */}
              <div className="relative">
                {/* Ondas expansivas - efeito apenas no botão */}
                <span className="absolute inset-0 rounded-md border-2 border-primary/50 animate-expanding-waves pointer-events-none" />
                <span className="absolute inset-0 rounded-md border-2 border-primary/30 animate-expanding-waves pointer-events-none" style={{ animationDelay: '0.5s' }} />
                <span className="absolute inset-0 rounded-md border-2 border-primary/20 animate-expanding-waves pointer-events-none" style={{ animationDelay: '1s' }} />
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="lg"
                        variant="outline"
                        className="relative border-primary/50 hover:border-transparent hover:bg-gradient-primary bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 backdrop-blur-sm overflow-hidden group transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]"
                        onClick={() => setIsHistoryOpen(true)}
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                        <span className="relative flex items-center gap-2">
                          <Sparkles className="w-4 h-4 animate-pulse" />
                          {t("hero.ctaHistory")}
                          <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[220px] bg-background/95 border-primary/30 text-center duration-300">
                      <p>{t("hero.ctaHistoryTooltip")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          {/* Citação Introdutória */}
          <blockquote className="mt-12 max-w-3xl mx-auto">
            <p className="text-xl md:text-2xl italic bg-gradient-to-r from-cyan-400 via-green-400 to-yellow-400 bg-clip-text text-transparent leading-relaxed">
              "{t("hero.quote")}"
            </p>
            <footer className="mt-4 text-sm text-muted-foreground">
              {t("hero.quoteAuthor")}
            </footer>
          </blockquote>
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />
      
      {isHistoryOpen && (
        <AIHistoryPanel 
          onClose={() => {
            window.dispatchEvent(new CustomEvent('stopAllAudio'));
            setIsHistoryOpen(false);
          }} 
        />
      )}
    </section>
  );
};

export default HeroSection;
