import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Loader2, Volume2, RotateCcw } from "lucide-react";

export type PlayerState = "idle" | "loading" | "playing" | "waiting" | "processing" | "listening";

interface VoicePlayerBoxProps {
  state: PlayerState;
  onPlay?: () => void;
  onPause?: () => void;
  onPlayPause?: () => void;
  onReset?: () => void;
  onMicClick?: () => void;
  audioProgress?: number;
  frequencyData?: number[];
  showMic?: boolean;
  title?: string;
  subtitle?: string;
}

export const VoicePlayerBox: React.FC<VoicePlayerBoxProps> = ({
  state,
  onPlay,
  onPause,
  audioProgress = 0,
  frequencyData = [],
}) => {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [canReplay, setCanReplay] = useState(false);

  // Detect when audio finishes to allow replay
  useEffect(() => {
    if (hasPlayed && (state === "waiting" || state === "idle") && audioProgress >= 99) {
      setCanReplay(true);
    }
    // Reset canReplay when playing starts
    if (state === "playing") {
      setCanReplay(false);
    }
  }, [hasPlayed, state, audioProgress]);

  const rotationDuration = useMemo(() => {
    switch (state) {
      case "loading": case "processing": return 1.5;
      case "playing": return 3;
      case "waiting": return 4;
      case "listening": return 2;
      default: return 6;
    }
  }, [state]);

  const isAnimating = state === "loading" || state === "processing" || state === "playing" || state === "listening";
  const isWaiting = state === "waiting" || state === "idle";
  
  // Show arc when playing OR when replay is available
  const showProgressArc = state === "playing" || (canReplay && audioProgress > 0);
  
  // Calculate arc progress (use current progress when playing, 100 when replay ready)
  const arcProgress = canReplay ? 100 : audioProgress;

  // Arc calculation constants
  const radius = 68; // 45% of 150px (inner container is ~150px)
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - arcProgress / 100);
  

  const handleClick = () => {
    if (state === "playing" && onPause) {
      onPause();
    } else if ((state === "idle" || state === "waiting" || canReplay) && onPlay) {
      onPlay();
      setHasPlayed(true);
      setCanReplay(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center gap-6">
      <div className="relative w-40 h-40">
        {/* Rotating conic gradient */}
        <motion.div 
          className="absolute inset-0 rounded-full" 
          style={{ 
            background: `conic-gradient(from 0deg, transparent 0deg, hsl(191, 100%, 50%) 60deg, hsl(191, 100%, 50%, 0.5) 120deg, transparent 180deg, transparent 360deg)`, 
            opacity: isAnimating ? 1 : 0.3 
          }} 
          animate={{ rotate: 360 }} 
          transition={{ duration: rotationDuration, repeat: Infinity, ease: "linear" }} 
        />

        {/* Glow effect when animating */}
        <AnimatePresence>
          {isAnimating && (
            <motion.div 
              className="absolute inset-0 rounded-full blur-md" 
              style={{ background: `conic-gradient(from 0deg, transparent 0deg, hsl(191, 100%, 50%, 0.6) 40deg, transparent 100deg)` }} 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1, rotate: 360 }} 
              exit={{ opacity: 0 }} 
              transition={{ opacity: { duration: 0.3 }, rotate: { duration: rotationDuration * 0.8, repeat: Infinity, ease: "linear" } }} 
            />
          )}
        </AnimatePresence>

        {/* Pulse effect when waiting */}
        {isWaiting && (
          <motion.div 
            className="absolute inset-0 rounded-full" 
            style={{ background: "radial-gradient(circle, hsl(191, 100%, 50%, 0.2) 0%, transparent 70%)" }} 
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }} 
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} 
          />
        )}

        {/* Inner container */}
        <div 
          className="absolute inset-2 rounded-full flex items-center justify-center overflow-hidden" 
          style={{ background: "hsl(225, 54%, 8%)", border: "1px solid hsl(191, 100%, 50%, 0.2)" }}
        >
          {/* Ripple effect when waiting */}
          <AnimatePresence>
            {isWaiting && !canReplay && (
              <div className="absolute inset-0 flex items-center justify-center">
                {[1, 2, 3].map((i) => (
                  <motion.div 
                    key={i} 
                    className="absolute rounded-full border" 
                    style={{ 
                      width: `${40 + i * 20}%`, 
                      height: `${40 + i * 20}%`, 
                      borderColor: "hsl(191, 100%, 50%, 0.2)" 
                    }} 
                    initial={{ scale: 0.8, opacity: 0 }} 
                    animate={{ scale: [0.8, 1.2, 0.8], opacity: [0, 0.3, 0] }} 
                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }} 
                  />
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Main button */}
          <motion.button 
            className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center" 
            style={{ 
              background: canReplay 
                ? "linear-gradient(135deg, hsl(271, 76%, 53%) 0%, hsl(271, 76%, 43%) 100%)"
                : "linear-gradient(135deg, hsl(191, 100%, 50%) 0%, hsl(191, 100%, 40%) 100%)", 
              boxShadow: canReplay 
                ? "0 0 30px hsl(271, 76%, 53%, 0.4)"
                : "0 0 30px hsl(191, 100%, 50%, 0.4)" 
            }} 
            onClick={handleClick} 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
          >
            <AnimatePresence mode="wait">
              {state === "loading" || state === "processing" ? (
                <motion.div key="loader" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(225, 71%, 8%)" }} />
                </motion.div>
              ) : state === "playing" ? (
                <motion.div key="pause" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                  <Pause className="w-8 h-8" style={{ color: "hsl(225, 71%, 8%)" }} />
                </motion.div>
              ) : canReplay ? (
                <motion.div key="replay" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                  <RotateCcw className="w-8 h-8" style={{ color: "hsl(225, 71%, 8%)" }} />
                </motion.div>
              ) : (
                <motion.div key="play" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                  <Play className="w-8 h-8 ml-1" style={{ color: "hsl(225, 71%, 8%)" }} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Progress arc */}
          <AnimatePresence>
            {showProgressArc && (
              <motion.svg 
                className="absolute inset-0 w-full h-full -rotate-90" 
                viewBox="0 0 150 150"
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
              >
                {/* Track */}
                <circle 
                  cx="75" 
                  cy="75" 
                  r={radius} 
                  fill="none" 
                  stroke={canReplay ? "hsl(271, 76%, 53%, 0.2)" : "hsl(191, 100%, 50%, 0.2)"} 
                  strokeWidth="3" 
                />
                {/* Progress */}
                <circle 
                  cx="75" 
                  cy="75" 
                  r={radius} 
                  fill="none" 
                  stroke={canReplay ? "hsl(271, 76%, 53%)" : "hsl(191, 100%, 50%)"} 
                  strokeWidth="4" 
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: "stroke-dashoffset 0.1s linear" }}
                />
              </motion.svg>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Audio visualizer bars - now uses real frequency data */}
      <AnimatePresence>
        {state === "playing" && (
          <motion.div 
            className="flex items-end justify-center gap-1 h-8" 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 10 }}
          >
            {[...Array(9)].map((_, i) => {
              // Use real frequency data if available, otherwise fallback to animation
              const hasRealData = frequencyData.length > 0;
              const step = Math.max(1, Math.floor(frequencyData.length / 9));
              const realHeight = hasRealData 
                ? Math.max(8, (frequencyData[Math.min(i * step, frequencyData.length - 1)] / 255) * 32)
                : 8;
              
              const heights = [16, 24, 32, 20, 28, 18, 30, 22, 14];
              
              return hasRealData ? (
                <motion.div 
                  key={i} 
                  className="w-1 rounded-full" 
                  style={{ background: "hsl(191, 100%, 50%)" }} 
                  animate={{ height: realHeight }}
                  transition={{ duration: 0.1, ease: "easeOut" }} 
                />
              ) : (
                <motion.div 
                  key={i} 
                  className="w-1 rounded-full" 
                  style={{ background: "hsl(191, 100%, 50%)", height: 8 }} 
                  animate={{ height: [8, heights[i], 8] }} 
                  transition={{ duration: 0.6 + Math.random() * 0.4, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }} 
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
};

export default VoicePlayerBox;
