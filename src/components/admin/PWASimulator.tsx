import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Smartphone, Volume2, Wifi, ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw, RotateCw,
  HelpCircle, X, MonitorSmartphone, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PWAVoiceAssistant } from "@/components/pwa/voice/PWAVoiceAssistant";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PWASimulatorProps {
  showFrame?: boolean;
  frameless?: boolean;
  scale?: number;
  onScaleChange?: (scale: number) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  showControls?: boolean;
  isLandscape?: boolean;
  onToggleLandscape?: () => void;
  onReset?: () => void;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 1.5;
const SCALE_STEP = 0.1;
const DEFAULT_SCALE = 0.9;

export const PWASimulator: React.FC<PWASimulatorProps> = ({ 
  showFrame = true,
  frameless = false,
  scale = DEFAULT_SCALE,
  onScaleChange,
  isFullscreen = false,
  onToggleFullscreen,
  showControls = false,
  isLandscape = false,
  onToggleLandscape,
  onReset
}) => {
  // Se frameless, renderizar PWA diretamente sem nenhum wrapper de frame
  if (frameless) {
    return (
      <div className="w-full h-full bg-black">
        <PWAVoiceAssistant embedded />
      </div>
    );
  }
  // iPhone 14/15 dimensions - swap for landscape
  const baseWidth = 390;
  const baseHeight = 844;
  const phoneWidth = isLandscape ? baseHeight : baseWidth;
  const phoneHeight = isLandscape ? baseWidth : baseHeight;

  const handleZoomIn = () => {
    if (onScaleChange && scale < MAX_SCALE) {
      onScaleChange(Math.min(scale + SCALE_STEP, MAX_SCALE));
    }
  };

  const handleZoomOut = () => {
    if (onScaleChange && scale > MIN_SCALE) {
      onScaleChange(Math.max(scale - SCALE_STEP, MIN_SCALE));
    }
  };

  const handleResetZoom = () => {
    if (onScaleChange) {
      onScaleChange(DEFAULT_SCALE);
    }
  };

  if (!showFrame) {
    return (
      <div className="w-full h-full overflow-hidden">
        <PWAVoiceAssistant embedded />
      </div>
    );
  }

  const zoomPercentage = Math.round(scale * 100);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Control Bar */}
      {showControls && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border/50">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={scale <= MIN_SCALE}
                className="h-8 w-8 p-0"
                title="Zoom out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-mono min-w-[50px] text-center">
                {zoomPercentage}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={scale >= MAX_SCALE}
                className="h-8 w-8 p-0"
                title="Zoom in (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>

            <div className="w-px h-6 bg-border" />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetZoom}
              className="h-8 px-2"
              title="Resetar zoom (R)"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            <div className="w-px h-6 bg-border" />

            <Button
              variant={isLandscape ? "secondary" : "ghost"}
              size="sm"
              onClick={onToggleLandscape}
              className="h-8 px-2"
              title="Alternar paisagem (L)"
            >
              <RotateCw className="w-4 h-4" />
            </Button>

            <div className="w-px h-6 bg-border" />

            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFullscreen}
              className="h-8 px-2"
              title={isFullscreen ? "Sair da tela cheia (F)" : "Tela cheia (F)"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>

            {/* Separador e Botão Reset */}
            {onReset && (
              <>
                <div className="w-px h-6 bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReset}
                  className="h-8 px-2 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                  title="Reiniciar PWA (0)"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              </>
            )}

            <div className="w-px h-6 bg-border" />

            {/* Orientation Indicator */}
            <AnimatePresence mode="wait">
              <motion.div
                key={isLandscape ? "landscape" : "portrait"}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/50 border border-border/50"
              >
                <motion.div
                  animate={{ rotate: isLandscape ? 90 : 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Smartphone className="w-3.5 h-3.5 text-primary" />
                </motion.div>
                <span className="text-xs font-medium text-foreground/80">
                  {isLandscape ? "Paisagem" : "Retrato"}
                </span>
              </motion.div>
            </AnimatePresence>

            <div className="w-px h-6 bg-border" />

            {/* Help Panel */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Atalhos de teclado"
                >
                  <HelpCircle className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-64 p-0" 
                align="end"
                sideOffset={8}
              >
                <div className="p-3 border-b border-border bg-muted/30">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <MonitorSmartphone className="w-4 h-4 text-primary" />
                    Atalhos de Teclado
                  </h4>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Aumentar zoom</span>
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">+</kbd>
                      <span className="text-muted-foreground text-xs">ou</span>
                      <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">=</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Diminuir zoom</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">-</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Resetar zoom</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">R</kbd>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Alternar paisagem</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">L</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tela cheia</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">F</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Sair tela cheia</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">ESC</kbd>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Reiniciar PWA</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">0</kbd>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* Title (only when not in fullscreen) */}
      {!isFullscreen && !showControls && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Smartphone className="w-4 h-4" />
          <span className="text-sm font-medium">Simulador PWA (Preview)</span>
        </div>
      )}

      {/* Phone Frame */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative"
        style={{ 
          width: phoneWidth * scale, 
          height: phoneHeight * scale,
        }}
      >
        {/* Outer frame with gradient */}
        <div 
          className="absolute inset-0 rounded-[40px] p-[3px]"
          style={{
            background: "linear-gradient(145deg, hsl(var(--border)) 0%, hsl(var(--muted)) 50%, hsl(var(--border)) 100%)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255,255,255,0.1)"
          }}
        >
          {/* Inner black frame */}
          <div 
            className="w-full h-full rounded-[37px] overflow-hidden relative"
            style={{ 
              background: "hsl(225, 54%, 6%)",
              border: "1px solid hsl(var(--border)/0.3)"
            }}
          >
            {/* Status bar - adjusted for landscape */}
            <div 
              className={`absolute z-20 flex items-center justify-between ${
                isLandscape 
                  ? "top-0 left-0 bottom-0 w-7 flex-col py-6 px-1" 
                  : "top-0 left-0 right-0 h-7 px-6"
              }`}
              style={{ 
                background: isLandscape 
                  ? "linear-gradient(90deg, hsl(225, 54%, 8%) 0%, transparent 100%)"
                  : "linear-gradient(180deg, hsl(225, 54%, 8%) 0%, transparent 100%)" 
              }}
            >
              <span className={`text-[10px] text-muted-foreground/60 ${isLandscape ? "rotate-90" : ""}`}>9:41</span>
              <div className={`flex items-center gap-1 ${isLandscape ? "flex-col rotate-90" : ""}`}>
                <Wifi className="w-3 h-3 text-muted-foreground/60" />
                <Volume2 className="w-3 h-3 text-muted-foreground/60" />
                <div className="w-5 h-2 rounded-sm border border-muted-foreground/40 flex items-center justify-end p-px">
                  <div className="w-3 h-1 rounded-sm bg-green-500" />
                </div>
              </div>
            </div>

            {/* Dynamic Island / Notch - adjusted for landscape */}
            <div 
              className={`absolute z-30 ${
                isLandscape 
                  ? "left-2 top-1/2 -translate-y-1/2 h-24 w-6 rounded-full" 
                  : "top-2 left-1/2 -translate-x-1/2 w-24 h-6 rounded-full"
              }`}
              style={{ background: "hsl(0, 0%, 0%)" }}
            >
              {/* Camera dot */}
              <div 
                className={`absolute w-2 h-2 rounded-full ${
                  isLandscape 
                    ? "bottom-4 left-1/2 -translate-x-1/2" 
                    : "right-4 top-1/2 -translate-y-1/2"
                }`}
                style={{ 
                  background: "radial-gradient(circle, hsl(210, 100%, 30%) 0%, hsl(210, 100%, 10%) 100%)",
                  boxShadow: "0 0 3px hsl(210, 100%, 50%, 0.3)"
                }}
              />
            </div>

            {/* Screen content - PWA App */}
            <div className={`absolute inset-0 overflow-hidden ${
              isLandscape ? "pl-8 pr-4 py-4" : "pt-8 pb-4"
            }`}>
              <div className="w-full h-full overflow-hidden relative">
                <PWAVoiceAssistant embedded />
              </div>
            </div>

            {/* Home indicator - adjusted for landscape */}
            <div className={`absolute z-20 ${
              isLandscape 
                ? "right-2 top-1/2 -translate-y-1/2" 
                : "bottom-2 left-1/2 -translate-x-1/2"
            }`}>
              <div 
                className={`rounded-full ${isLandscape ? "w-1 h-28" : "w-28 h-1"}`}
                style={{ background: "hsl(var(--muted-foreground)/0.4)" }}
              />
            </div>
          </div>
        </div>

        {/* Reflection effect */}
        <div 
          className="absolute inset-0 rounded-[40px] pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)",
          }}
        />
      </motion.div>

      {/* Instructions (only when not in fullscreen) */}
      {!isFullscreen && (
        <p className="text-xs text-muted-foreground/60 text-center max-w-xs">
          Interaja com o simulador acima. Para testar funcionalidades de voz, 
          acesse <span className="text-primary">/pwa</span> em um dispositivo móvel.
        </p>
      )}
    </div>
  );
};

export default PWASimulator;
