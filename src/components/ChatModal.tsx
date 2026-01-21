import { GripHorizontal } from "lucide-react";
import { AgentChat } from "@/components/chat/AgentChat";
import { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentSlug?: string;
}

export const ChatModal = ({ isOpen, onClose, agentSlug = "company" }: ChatModalProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const handleClose = useCallback(() => {
    // Stop any audio playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    // Broadcast stop audio event FIRST
    window.dispatchEvent(new CustomEvent('stopAllAudio'));
    
    // Small delay to ensure event is processed before unmounting
    requestAnimationFrame(() => {
      onClose();
    });
  }, [onClose]);

  // Reset position when modal opens
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Esc key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, handleClose]);

  // Drag start
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragStart.current = {
      x: clientX,
      y: clientY,
      posX: position.x,
      posY: position.y
    };
  }, [position]);

  // Drag move and end handlers
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const deltaX = clientX - dragStart.current.x;
      const deltaY = clientY - dragStart.current.y;
      
      setPosition({
        x: dragStart.current.posX + deltaX,
        y: dragStart.current.posY + deltaY
      });
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    // Mouse events
    document.addEventListener('mousemove', handleMove, { passive: true });
    document.addEventListener('mouseup', handleEnd);
    // Touch events
    document.addEventListener('touchmove', handleMove, { passive: true });
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-300"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
        <div
          ref={modalRef}
          className="w-full max-w-[1085px] bg-card/95 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)] border-t-2 border-l-2 border-t-white/20 border-l-white/20 border-r border-b border-r-black/30 border-b-black/30 pointer-events-auto animate-in zoom-in-95 duration-300"
          style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            willChange: isDragging ? 'transform' : 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag Handle - Larger clickable area */}
          <div
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            className={`flex items-center justify-center py-2 cursor-grab rounded-t-2xl bg-gradient-to-b from-white/5 to-transparent select-none ${
              isDragging ? 'cursor-grabbing bg-white/10' : 'hover:from-white/10'
            } transition-colors`}
          >
            <div className="flex items-center gap-2 px-4">
              <GripHorizontal className="h-5 w-5 text-muted-foreground/60" />
              <span className="text-xs text-muted-foreground/40 font-medium">Arraste para mover</span>
              <GripHorizontal className="h-5 w-5 text-muted-foreground/60" />
            </div>
          </div>

          {/* Chat Content */}
          <div className="px-3 pt-3 h-[785px] overflow-hidden rounded-b-2xl">
            <AgentChat agentSlug={agentSlug} onClose={handleClose} />
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};
