/**
 * ============================================================
 * utils/safari-audio.ts
 * ============================================================
 * Versão: 1.0.0 - 2026-01-10
 * Utilitários de áudio para Safari
 * ============================================================
 */

import { getBrowserInfo } from './safari-detect';

// Estado global de unlock de áudio
let audioUnlocked = false;
let audioContext: AudioContext | null = null;

/**
 * Obter AudioContext compatível com Safari
 */
export function getAudioContext(): AudioContext {
  if (audioContext && audioContext.state !== 'closed') {
    return audioContext;
  }
  
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  audioContext = new AudioContextClass();
  return audioContext;
}

/**
 * Desbloquear áudio no Safari (chamar após user gesture)
 */
export async function unlockAudio(): Promise<boolean> {
  if (audioUnlocked) return true;
  
  const { isSafari, isIOS } = getBrowserInfo();
  
  // Em outros browsers, marcar como desbloqueado diretamente
  if (!isSafari && !isIOS) {
    audioUnlocked = true;
    return true;
  }
  
  try {
    // Criar contexto de áudio se não existir
    const ctx = getAudioContext();
    
    // Resumir se suspenso
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    // Criar e tocar áudio silencioso via oscillator
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.001; // Quase silencioso
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(0);
    oscillator.stop(ctx.currentTime + 0.001);
    
    // Criar HTMLAudioElement e tocar áudio silencioso
    const silentAudio = new Audio();
    silentAudio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAgAAAbAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAbD/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//M4xAANCAJQIUAAABBDf/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8=';
    silentAudio.volume = 0.01;
    await silentAudio.play().catch(() => {});
    silentAudio.pause();
    
    audioUnlocked = true;
    console.log('[Safari Audio] Audio unlocked successfully');
    return true;
  } catch (e) {
    console.warn('[Safari Audio] Failed to unlock audio:', e);
    return false;
  }
}

/**
 * Verificar se áudio está desbloqueado
 */
export function isAudioUnlocked(): boolean {
  return audioUnlocked;
}

/**
 * Forçar estado de desbloqueio (útil para testes)
 */
export function setAudioUnlocked(value: boolean): void {
  audioUnlocked = value;
}

/**
 * Obter mimeType suportado para gravação
 */
export function getSupportedRecordingMimeType(): string {
  const { isSafari, isIOS } = getBrowserInfo();
  
  // Lista de preferência baseada na plataforma
  const types = isSafari || isIOS
    ? ['audio/mp4', 'audio/aac', 'audio/webm', 'audio/webm;codecs=opus']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  
  for (const type of types) {
    try {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('[Safari Audio] Using mimeType:', type);
        return type;
      }
    } catch {
      // Ignorar erro
    }
  }
  
  console.warn('[Safari Audio] No supported mimeType found, using default');
  return '';
}

/**
 * Obter constraints de áudio otimizadas para plataforma
 */
export function getOptimizedAudioConstraints(): MediaTrackConstraints {
  const { isSafari, isIOS } = getBrowserInfo();
  
  // Safari/iOS: constraints simplificadas funcionam melhor
  if (isSafari || isIOS) {
    return {
      echoCancellation: true,
      noiseSuppression: true,
    };
  }
  
  // Outros browsers: constraints completas
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 44100,
  };
}

/**
 * Criar elemento de áudio otimizado para Safari
 */
export function createOptimizedAudioElement(): HTMLAudioElement {
  const audio = new Audio();
  
  // Atributos essenciais para Safari/iOS
  audio.setAttribute('playsinline', 'true');
  audio.setAttribute('webkit-playsinline', 'true');
  audio.preload = 'auto';
  
  return audio;
}

/**
 * Tocar áudio com tratamento de erros Safari
 */
export async function playAudioSafely(audio: HTMLAudioElement): Promise<void> {
  const { isSafari, isIOS } = getBrowserInfo();
  
  // Desbloquear áudio primeiro se necessário
  if ((isSafari || isIOS) && !audioUnlocked) {
    await unlockAudio();
  }
  
  // Carregar antes de tocar (importante para Safari)
  audio.load();
  
  // Pequeno delay para Safari processar
  await new Promise(resolve => setTimeout(resolve, 50));
  
  try {
    await audio.play();
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotAllowedError') {
      console.warn('[Safari Audio] Autoplay blocked, waiting for user gesture');
      throw new Error('Toque na tela para ativar o áudio');
    }
    throw e;
  }
}

/**
 * Resumir AudioContext se suspenso (chamar após user gesture)
 */
export async function resumeAudioContext(): Promise<void> {
  if (audioContext && audioContext.state === 'suspended') {
    await audioContext.resume();
  }
}
