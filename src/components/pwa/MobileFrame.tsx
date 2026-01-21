/**
 * ============================================================
 * MobileFrame.tsx - v1.0.0
 * ============================================================
 * Container que simula um celular para visualização desktop
 * - Formato iPhone 14 Pro Max (430x932)
 * - Dynamic Island
 * - Notch realista
 * - Animação suave
 * ============================================================
 */

import React from "react";
import { motion } from "framer-motion";

interface MobileFrameProps {
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Phone container with animation */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        {/* Phone outer frame - iPhone style */}
        <div
          className="relative rounded-[55px] p-[14px] shadow-2xl"
          style={{
            background: 'linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 50%, #1a1a1a 100%)',
            boxShadow: `
              0 0 0 1px rgba(255,255,255,0.1),
              0 25px 50px -12px rgba(0,0,0,0.8),
              0 0 100px -20px rgba(99, 102, 241, 0.3),
              inset 0 1px 1px rgba(255,255,255,0.1)
            `
          }}
        >
          {/* Side buttons - Volume */}
          <div className="absolute -left-[3px] top-[120px] w-[3px] h-[30px] bg-[#1a1a1a] rounded-l-sm" />
          <div className="absolute -left-[3px] top-[160px] w-[3px] h-[60px] bg-[#1a1a1a] rounded-l-sm" />
          <div className="absolute -left-[3px] top-[230px] w-[3px] h-[60px] bg-[#1a1a1a] rounded-l-sm" />

          {/* Side button - Power */}
          <div className="absolute -right-[3px] top-[180px] w-[3px] h-[80px] bg-[#1a1a1a] rounded-r-sm" />

          {/* Phone inner bezel */}
          <div
            className="relative rounded-[45px] overflow-hidden"
            style={{
              width: '375px',
              height: '812px',
              background: '#000'
            }}
          >
            {/* Dynamic Island */}
            <div className="absolute top-[12px] left-1/2 -translate-x-1/2 z-50">
              <motion.div
                className="bg-black rounded-full flex items-center justify-center"
                style={{
                  width: '126px',
                  height: '37px',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)'
                }}
                animate={{
                  width: ['126px', '130px', '126px'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {/* Camera */}
                <div className="absolute right-[20px] w-[12px] h-[12px] rounded-full bg-[#1a1a2e]">
                  <div className="absolute inset-[2px] rounded-full bg-[#0a0a15]">
                    <div className="absolute inset-[1px] rounded-full" style={{
                      background: 'radial-gradient(circle at 30% 30%, #1e3a5f, #0a0a15)'
                    }} />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Status bar overlay */}
            <div className="absolute top-0 left-0 right-0 h-[50px] z-40 pointer-events-none">
              <div className="flex items-center justify-between px-8 pt-[14px] text-white text-xs font-medium">
                <span>9:41</span>
                <div className="flex items-center gap-1">
                  {/* Signal bars */}
                  <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor">
                    <rect x="0" y="8" width="3" height="4" rx="0.5" />
                    <rect x="4.5" y="5" width="3" height="7" rx="0.5" />
                    <rect x="9" y="2" width="3" height="10" rx="0.5" />
                    <rect x="13.5" y="0" width="3" height="12" rx="0.5" />
                  </svg>
                  {/* WiFi */}
                  <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
                    <path d="M8 3C11.3 3 14.2 4.3 16 6.5L14.5 8C13 6.2 10.6 5 8 5C5.4 5 3 6.2 1.5 8L0 6.5C1.8 4.3 4.7 3 8 3Z" opacity="0.3"/>
                    <path d="M8 6C10.2 6 12.2 6.9 13.5 8.5L12 10C11 8.8 9.6 8 8 8C6.4 8 5 8.8 4 10L2.5 8.5C3.8 6.9 5.8 6 8 6Z" opacity="0.6"/>
                    <path d="M8 9C9.1 9 10.1 9.4 10.8 10.2L8 13L5.2 10.2C5.9 9.4 6.9 9 8 9Z"/>
                  </svg>
                  {/* Battery */}
                  <div className="flex items-center">
                    <div className="w-[22px] h-[11px] border border-white/40 rounded-[3px] p-[1px]">
                      <div className="w-[85%] h-full bg-green-500 rounded-[1px]" />
                    </div>
                    <div className="w-[1px] h-[4px] bg-white/40 ml-[1px] rounded-r-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* PWA Content */}
            <div className="absolute inset-0 overflow-hidden rounded-[45px]">
              {children}
            </div>

            {/* Home indicator */}
            <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 z-50">
              <div className="w-[134px] h-[5px] bg-white/30 rounded-full" />
            </div>
          </div>
        </div>

        {/* Reflection effect */}
        <div
          className="absolute inset-0 rounded-[55px] pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
          }}
        />
      </motion.div>

      {/* Brand text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-6 text-center text-white/30 text-sm"
      >
        <p>KnowYOU Voice Assistant</p>
        <p className="text-xs mt-1">Versão Desktop Preview</p>
      </motion.div>
    </div>
  );
};

export default MobileFrame;
