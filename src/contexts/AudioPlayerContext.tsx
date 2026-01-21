import { createContext, useContext, useState, useRef, ReactNode, useCallback, useMemo, useEffect } from "react";

interface AudioPlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  title: string;
  audioUrl: string;
}

interface AudioPlayerContextType {
  floatingPlayerState: AudioPlayerState | null;
  playAudio: (title: string, audioUrl: string) => void;
  togglePlayPause: () => void;
  stopPlayback: () => void;
  closePlayer: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [floatingPlayerState, setFloatingPlayerState] = useState<AudioPlayerState | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Stable refs to avoid recreating callbacks
  const currentAudioUrlRef = useRef<string | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  
  // CRITICAL: Flag to block progress updates after STOP
  const isStoppedRef = useRef<boolean>(false);
  
  // Sync refs with state changes
  useEffect(() => {
    currentAudioUrlRef.current = floatingPlayerState?.audioUrl ?? null;
    isPlayingRef.current = floatingPlayerState?.isPlaying ?? false;
  }, [floatingPlayerState?.audioUrl, floatingPlayerState?.isPlaying]);

  const startProgressTracking = useCallback(() => {
    // Allow progress updates
    isStoppedRef.current = false;
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    progressInterval.current = setInterval(() => {
      // CRITICAL: Check flag before updating to prevent race condition
      if (audioRef.current && !isStoppedRef.current) {
        setFloatingPlayerState(prev => prev ? {
          ...prev,
          currentTime: audioRef.current?.currentTime || 0,
          duration: audioRef.current?.duration || 0,
        } : null);
      }
    }, 100);
  }, []);

  const stopProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  // Main function to start playing audio
  const playAudio = useCallback((title: string, audioUrl: string) => {
    // Use refs for comparison
    if (currentAudioUrlRef.current === audioUrl && audioRef.current) {
      if (isPlayingRef.current) {
        audioRef.current.pause();
        stopProgressTracking();
        setFloatingPlayerState(prev => prev ? {
          ...prev,
          isPlaying: false,
          isPaused: true,
        } : null);
      } else {
        isStoppedRef.current = false; // Allow progress tracking
        audioRef.current.play();
        startProgressTracking();
        setFloatingPlayerState(prev => prev ? {
          ...prev,
          isPlaying: true,
          isPaused: false,
        } : null);
      }
      return;
    }

    // Stop any existing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.oncanplaythrough = null;
      audioRef.current = null;
    }
    stopProgressTracking();

    // Create new audio element
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    setFloatingPlayerState({
      isPlaying: false,
      isPaused: false,
      isLoading: true,
      currentTime: 0,
      duration: 0,
      title,
      audioUrl,
    });

    audio.oncanplaythrough = () => {
      isStoppedRef.current = false; // Allow progress tracking
      setFloatingPlayerState(prev => prev ? {
        ...prev,
        isLoading: false,
        isPlaying: true,
        duration: audio.duration,
      } : null);
      audio.play();
      startProgressTracking();
    };

    audio.onended = () => {
      setFloatingPlayerState(prev => prev ? {
        ...prev,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
      } : null);
      stopProgressTracking();
    };

    audio.load();
  }, [startProgressTracking, stopProgressTracking]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || !floatingPlayerState) return;

    // Detect STOPPED state: not playing, not paused, time at 0
    const isStopped = !floatingPlayerState.isPlaying && 
                      !floatingPlayerState.isPaused && 
                      floatingPlayerState.currentTime === 0;

    if (floatingPlayerState.isPlaying) {
      // Currently playing -> pause
      audioRef.current.pause();
      stopProgressTracking();
      setFloatingPlayerState(prev => prev ? {
        ...prev,
        isPlaying: false,
        isPaused: true,
      } : null);
    } else if (isStopped) {
      // STOPPED state -> Play from beginning
      isStoppedRef.current = false; // Allow progress tracking
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      startProgressTracking();
      setFloatingPlayerState(prev => prev ? {
        ...prev,
        isPlaying: true,
        isPaused: false,
        currentTime: 0,
      } : null);
    } else {
      // Currently paused -> resume
      isStoppedRef.current = false; // Allow progress tracking
      audioRef.current.play();
      startProgressTracking();
      setFloatingPlayerState(prev => prev ? {
        ...prev,
        isPlaying: true,
        isPaused: false,
      } : null);
    }
  }, [floatingPlayerState, startProgressTracking, stopProgressTracking]);

  // NUCLEAR STOP - Completely autonomous, no dependencies
  const stopPlayback = useCallback(() => {
    // 1. BLOCK progress updates IMMEDIATELY - this is the nuclear flag
    isStoppedRef.current = true;
    
    // 2. Clear interval inline (no dependency on stopProgressTracking)
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    
    // 3. Pause and reset the audio element
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // 4. Update ref immediately
    isPlayingRef.current = false;
    
    // 5. Use requestAnimationFrame to ensure state update happens AFTER browser processes pause
    requestAnimationFrame(() => {
      setFloatingPlayerState(prev => prev ? {
        ...prev,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
      } : null);
    });
  }, []); // NO DEPENDENCIES - fully autonomous

  const closePlayer = useCallback(() => {
    // Block progress updates
    isStoppedRef.current = true;
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.oncanplaythrough = null;
      audioRef.current = null;
    }
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    
    setFloatingPlayerState(null);
  }, []);

  // Memoize context value
  const contextValue = useMemo(() => ({
    floatingPlayerState,
    playAudio,
    togglePlayPause,
    stopPlayback,
    closePlayer,
  }), [floatingPlayerState, playAudio, togglePlayPause, stopPlayback, closePlayer]);

  return (
    <AudioPlayerContext.Provider value={contextValue}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  }
  return context;
}
