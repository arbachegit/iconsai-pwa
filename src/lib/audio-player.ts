import { logger } from '@/lib/logger';

export class AudioStreamPlayer {
  private audioContext: AudioContext | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private resolvePlayback: (() => void) | null = null;
  private startTime: number = 0;
  private audioDuration: number = 0;
  private onProgressCallback: ((currentTime: number, duration: number) => void) | null = null;
  private progressInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize on user interaction
    if (typeof window !== "undefined") {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  setOnProgress(callback: (currentTime: number, duration: number) => void) {
    this.onProgressCallback = callback;
  }

  getCurrentTime(): number {
    if (!this.audioContext || !this.isPlaying) return 0;
    return this.audioContext.currentTime - this.startTime;
  }

  getDuration(): number {
    return this.audioDuration;
  }

  async playAudioFromUrl(url: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      this.resolvePlayback = resolve;
      
      try {
        // Resume AudioContext if suspended
        if (this.audioContext?.state === 'suspended') {
          await this.audioContext.resume();
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error("Falha ao carregar áudio");

        const arrayBuffer = await response.arrayBuffer();
        await this.playAudioBuffer(arrayBuffer);
      } catch (error) {
        console.error("Erro ao reproduzir áudio:", error);
        this.stopProgressTracking();
        this.resolvePlayback = null;
        reject(error);
      }
    });
  }

  private async playAudioBuffer(arrayBuffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      throw new Error("AudioContext não inicializado");
    }

    this.audioQueue.push(arrayBuffer);
    
    if (!this.isPlaying) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      if (this.resolvePlayback) {
        this.resolvePlayback();
        this.resolvePlayback = null;
      }
      return;
    }

    this.isPlaying = true;
    const arrayBuffer = this.audioQueue.shift()!;

    try {
      if (!this.audioContext) return;

      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Store duration and start time
      this.audioDuration = audioBuffer.duration;
      this.startTime = this.audioContext.currentTime;
      
      // Start progress tracking
      this.startProgressTracking();
      
      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(this.audioContext.destination);
      
      this.currentSource.onended = () => {
        this.stopProgressTracking();
        this.currentSource = null;
        this.processQueue();
      };
      
      this.currentSource.start(0);
    } catch (error) {
      console.error("Erro ao decodificar áudio:", error);
      this.stopProgressTracking();
      this.processQueue(); // Continue com próximo na fila
    }
  }

  private startProgressTracking(): void {
    this.stopProgressTracking();
    this.progressInterval = setInterval(() => {
      if (this.onProgressCallback && this.isPlaying) {
        const currentTime = this.getCurrentTime();
        this.onProgressCallback(currentTime, this.audioDuration);
      }
    }, 100); // Update every 100ms
  }

  private stopProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  stop(): void {
    this.stopProgressTracking();
    try {
      if (this.currentSource) {
        this.currentSource.stop();
        this.currentSource.disconnect();
        this.currentSource = null;
      }
    } catch (e) {
      // Ignorar erros se o áudio já estava parado
      logger.debug('Audio already stopped:', e);
    }
    this.audioQueue = [];
    this.isPlaying = false;
    
    if (this.resolvePlayback) {
      this.resolvePlayback();
      this.resolvePlayback = null;
    }
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }
}

export async function generateAudioUrl(text: string, chatType?: "study" | "health"): Promise<string> {
  const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`;
  
  const response = await fetch(TTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ text, chatType }),
  });

  if (!response.ok) {
    throw new Error("Falha ao gerar áudio");
  }

  // Convert stream to blob and create URL
  const audioBlob = await response.blob();
  return URL.createObjectURL(audioBlob);
}
