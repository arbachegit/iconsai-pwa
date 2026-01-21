import { Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface ChatFloatingAudioPlayerProps {
  isVisible: boolean;
  currentTime: number;
  duration: number;
  onStop: () => void;
  onClose: () => void;
}

export function ChatFloatingAudioPlayer({
  isVisible,
  currentTime,
  duration,
  onStop,
  onClose,
}: ChatFloatingAudioPlayerProps) {
  if (!isVisible) return null;

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-4 flex items-center gap-3 animate-fade-in min-w-[300px]">
      <div className="flex-1 flex flex-col gap-2">
        <Progress value={progress} className="h-1" />
        <span className="text-xs text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={onStop}
        className="h-8 w-8 p-0"
        title="Parar"
      >
        <Square className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onClose}
        className="h-8 w-8 p-0"
        title="Fechar"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}