import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic } from "lucide-react";

export type MicState = "hidden" | "emerging" | "listening" | "timeout" | "captured";

interface MicrophoneOrbProps {
  isVisible: boolean;
  onCapture: (transcript: string) => void;
  onTimeout: () => void;
  onStateChange?: (state: MicState) => void;
  autoStart?: boolean;
  maxDuration?: number;
  hideCountdown?: boolean;
}

interface BitParticle {
  id: number;
  x: number;
  y: number;
  delay: number;
}

export const MicrophoneOrb: React.FC<MicrophoneOrbProps> = ({
  isVisible,
  onCapture,
  onTimeout,
  onStateChange,
  autoStart = true,
  maxDuration = 10,
  hideCountdown = false,
}) => {
  const [state, setState] = useState<MicState>("hidden");
  const [timeRemaining, setTimeRemaining] = useState(maxDuration);
  const [pulseSpeed, setPulseSpeed] = useState(1.5);
  const [wavesIntensity, setWavesIntensity] = useState(1);
  const [bits, setBits] = useState<BitParticle[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const bitIdRef = useRef(0);

  // Generate random bits for countdown effect
  const generateBit = useCallback(() => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 60 + Math.random() * 40;
    return {
      id: bitIdRef.current++,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      delay: Math.random() * 0.3,
    };
  }, []);

  // Update state and notify parent
  const updateState = useCallback((newState: MicState) => {
    setState(newState);
    onStateChange?.(newState);
  }, [onStateChange]);

  // Handle visibility changes
  useEffect(() => {
    if (isVisible && state === "hidden") {
      updateState("emerging");
      
      // Transition to listening after emergence animation
      const emergenceTimer = setTimeout(() => {
        updateState("listening");
      }, 800);
      
      return () => clearTimeout(emergenceTimer);
    } else if (!isVisible && state !== "hidden") {
      updateState("hidden");
      setTimeRemaining(maxDuration);
      setPulseSpeed(1.5);
      setWavesIntensity(1);
      setBits([]);
    }
  }, [isVisible, state, updateState, maxDuration]);

  // Timer logic
  useEffect(() => {
    if (state !== "listening") return;

    const startTime = Date.now();
    const totalTime = maxDuration * 1000;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, totalTime - elapsed);
      const remainingSeconds = Math.ceil(remaining / 1000);
      
      setTimeRemaining(remainingSeconds);

      // First 5 seconds: pulse faster and faster
      if (remaining > 5000) {
        const progress = (5000 - (remaining - 5000)) / 5000;
        setPulseSpeed(1.5 - progress * 1); // 1.5s -> 0.5s
        setWavesIntensity(1 + progress * 2); // 1 -> 3
      }
      // Last 5 seconds: countdown with bits
      else if (remaining > 0) {
        setPulseSpeed(0.3);
        setWavesIntensity(4);
        
        // Add bits for visual effect
        if (remainingSeconds <= 5 && remainingSeconds > 0) {
          const newBits = Array.from({ length: remainingSeconds }, () => generateBit());
          setBits((prev) => [...prev.slice(-20), ...newBits]);
        }
      }
      // Timeout
      else {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        updateState("timeout");
        onTimeout();
      }
    }, 100);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state, maxDuration, onTimeout, generateBit, updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleCapture = useCallback((transcript: string) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    updateState("captured");
    onCapture(transcript);
  }, [onCapture, updateState]);

  return (
    <AnimatePresence>
      {isVisible && state !== "hidden" && (
        <motion.div
          className="relative flex items-center justify-center"
          initial={{ scale: 0, y: -50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0, y: 50, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25,
          }}
        >
          {/* Expanding red waves */}
          {state === "listening" && (
            <>
              {[...Array(Math.ceil(wavesIntensity))].map((_, i) => (
                <motion.div
                  key={`wave-${i}`}
                  className="absolute rounded-full border-2"
                  style={{
                    width: 80,
                    height: 80,
                    borderColor: "hsl(0, 84%, 60%)",
                  }}
                  animate={{
                    scale: [1, 3],
                    opacity: [0.5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * (2 / Math.ceil(wavesIntensity)),
                    ease: "easeOut",
                  }}
                />
              ))}
            </>
          )}

          {/* Bits emanating (last 5 seconds) */}
          {state === "listening" && timeRemaining <= 5 && (
            <>
              {bits.slice(-15).map((bit) => (
                <motion.div
                  key={bit.id}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    background: "hsl(0, 84%, 60%)",
                    boxShadow: "0 0 6px hsl(0, 84%, 60%)",
                  }}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{
                    x: bit.x,
                    y: bit.y,
                    scale: [0, 1, 0.5],
                    opacity: [1, 0.8, 0],
                  }}
                  transition={{
                    duration: 0.8,
                    delay: bit.delay,
                    ease: "easeOut",
                  }}
                />
              ))}
            </>
          )}

          {/* Main Orb */}
          <motion.button
            className="relative w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(0, 84%, 55%) 0%, hsl(0, 84%, 45%) 100%)",
              boxShadow: `0 0 ${30 + wavesIntensity * 10}px hsl(0, 84%, 60%, ${0.4 + wavesIntensity * 0.1})`,
            }}
            animate={{
              scale: state === "listening" ? [1, 1 + wavesIntensity * 0.02, 1] : 1,
            }}
            transition={{
              duration: pulseSpeed,
              repeat: state === "listening" ? Infinity : 0,
              ease: "easeInOut",
            }}
            whileTap={{ scale: 0.95 }}
          >
            <Mic className="w-8 h-8" style={{ color: "white" }} />
          </motion.button>

          {/* Countdown display (last 5 seconds) */}
          <AnimatePresence>
            {!hideCountdown && state === "listening" && timeRemaining <= 5 && timeRemaining > 0 && (
              <motion.div
                className="absolute -top-10 flex items-center justify-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <motion.span
                  key={timeRemaining}
                  className="text-2xl font-bold"
                  style={{ color: "hsl(0, 84%, 60%)" }}
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {timeRemaining}
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Listening indicator */}
          {state === "listening" && timeRemaining > 5 && (
            <motion.div
              className="absolute -bottom-8 text-xs font-medium"
              style={{ color: "hsl(0, 84%, 60%)" }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Ouvindo...
            </motion.div>
          )}

          {/* Progress ring */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 80 80"
          >
            <circle
              cx="40"
              cy="40"
              r="38"
              fill="none"
              stroke="hsl(0, 84%, 60%, 0.2)"
              strokeWidth="2"
            />
            <motion.circle
              cx="40"
              cy="40"
              r="38"
              fill="none"
              stroke="hsl(0, 84%, 60%)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 38}
              strokeDashoffset={2 * Math.PI * 38 * (timeRemaining / maxDuration)}
              style={{ transition: "stroke-dashoffset 0.1s linear" }}
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MicrophoneOrb;
