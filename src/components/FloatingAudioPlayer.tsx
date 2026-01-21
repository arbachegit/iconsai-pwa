import { X, Play, Pause, Headphones, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

export function FloatingAudioPlayer() {
  const { floatingPlayerState, togglePlayPause, closePlayer } = useAudioPlayer();

  if (!floatingPlayerState) return null;

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = floatingPlayerState.duration > 0 
    ? (floatingPlayerState.currentTime / floatingPlayerState.duration) * 100 
    : 0;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card/95 backdrop-blur-md border border-primary/30 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-4 flex items-center gap-4 animate-fade-in min-w-[320px] max-w-[90vw]">
      {/* Icon */}
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
        <Headphones className="h-5 w-5 text-primary" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate mb-2" title={floatingPlayerState.title}>
          {floatingPlayerState.title}
        </p>
        <div className="flex items-center gap-2">
          <Progress value={progress} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatTime(floatingPlayerState.currentTime)} / {formatTime(floatingPlayerState.duration)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Play/Pause */}
        <Button
          size="icon"
          variant="ghost"
          onClick={togglePlayPause}
          className="h-9 w-9"
          disabled={floatingPlayerState.isLoading}
        >
          {floatingPlayerState.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : floatingPlayerState.isPlaying ? (
            <Pause className="h-5 w-5 text-primary" />
          ) : (
            <Play className="h-5 w-5 text-primary" />
          )}
        </Button>

        {/* Close */}
        <Button
          size="icon"
          variant="ghost"
          onClick={closePlayer}
          className="h-9 w-9"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}