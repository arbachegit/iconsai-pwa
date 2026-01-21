/**
 * ============================================================
 * index.ts - Exports dos Componentes PWA Voice
 * ============================================================
 * Versão: 3.0.0 - 2026-01-15
 * LIMPEZA: Componentes legados movidos para _legacy/
 * ============================================================
 */

// ============================================================
// COMPONENTES ATIVOS - MICROSERVIÇOS REUTILIZÁVEIS
// ============================================================

// Layout Unificado
export { UnifiedHeader } from "./UnifiedHeader";
export { UnifiedFooter } from "./UnifiedFooter";

// Visualização de Áudio (Microserviços)
export { SpectrumAnalyzer } from "./SpectrumAnalyzer";
export { PlayButton } from "./PlayButton";

// Microfone (Microserviço)
export { ToggleMicrophoneButton } from "./ToggleMicrophoneButton";
export { SlidingMicrophone } from "./SlidingMicrophone";

// Histórico
export { AudioMessageCard } from "./AudioMessageCard";
export { HistoryScreen } from "./HistoryScreen";

// Componentes Principais
export { PWAVoiceAssistant } from "./PWAVoiceAssistant";
export { ModuleSelector } from "./ModuleSelector";
export { SplashScreen } from "./SplashScreen";
export { ConversationDrawer } from "./ConversationDrawer";

// Player (ainda usado em alguns lugares)
export { VoicePlayerBox } from "./VoicePlayerBox";

// ============================================================
// TYPES
// ============================================================
export type { VisualizerState } from "./SpectrumAnalyzer";
export type { PlayButtonState } from "./PlayButton";
export type { MicrophoneState } from "./SlidingMicrophone";

// ============================================================
// COMPONENTES LEGADOS - MOVIDOS PARA _legacy/
// ============================================================
// Os seguintes componentes foram movidos para ./voice/_legacy/
// Se precisar usar temporariamente, importe diretamente:
// import { FooterModules } from "./_legacy/FooterModules";
//
// Lista de componentes movidos:
// - FooterModules → Use UnifiedFooter
// - HeaderActions → Use UnifiedHeader
// - PushToTalkButton → Use ToggleMicrophoneButton
// - MicrophoneButton → Use ToggleMicrophoneButton
// - MicrophoneOrb → Use ToggleMicrophoneButton
// - MicrophoneOverlay → Removido
// - ModuleHeader → Use UnifiedHeader
// - TranscriptArea → Não usado (interface 100% voz)
// - WaveformVisualizer → Use SpectrumAnalyzer
// - StatusIndicator → Use SpectrumAnalyzer
// - ConversationModal → Use HistoryScreen
// - CometBorder → Efeito visual removido
// - ReproduceLabel → Não usado
// ============================================================
