/**
 * ============================================================
 * HomePlayButton.stories.tsx - Storybook Stories
 * ============================================================
 * Version: 1.0.0
 * Date: 2026-01-17
 *
 * Description: Interactive documentation for HomePlayButton.
 * Botão principal do HOME com 6 estados e efeitos visuais avançados.
 * ============================================================
 */

import type { Meta, StoryObj } from '@storybook/react';
import { HomePlayButton, HomePlayerState } from '@/components/pwa/microservices/HomePlayButton';
import React from 'react';

const meta = {
  title: 'Components/HomePlayButton',
  component: HomePlayButton,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        component: `Botão de play/pause exclusivo da tela HOME do PWA. Design baseado no VoicePlayerBox com efeitos visuais avançados:

- **6 Estados:** idle, loading, playing, waiting, processing, listening
- **Efeitos Visuais:** Rotating conic gradient, glow, pulse, ripple
- **Progress Arc:** Mostra progresso de reprodução de áudio
- **Replay Mode:** Permite repetir áudio com visual roxo
- **Animações:** Framer Motion com transições suaves

**Diferente do PlayButton.tsx** usado nos módulos - este é exclusivo para HOME.`,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    state: {
      control: 'select',
      options: ['idle', 'loading', 'playing', 'waiting', 'processing', 'listening'],
      description: 'Estado atual do botão',
    },
    audioProgress: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Progresso do áudio (0-100%)',
    },
    canReplay: {
      control: 'boolean',
      description: 'Se true, mostra ícone de replay (roxo)',
    },
    disabled: {
      control: 'boolean',
      description: 'Se true, desabilita interação',
    },
    onPlay: {
      action: 'play clicked',
      description: 'Callback quando play/replay é clicado',
    },
    onPause: {
      action: 'pause clicked',
      description: 'Callback quando pause é clicado',
    },
  },
} satisfies Meta<typeof HomePlayButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Estado Idle - Aguardando interação
 * Gradiente ciano suave, pulso lento
 */
export const Idle: Story = {
  args: {
    state: 'idle',
    audioProgress: 0,
    canReplay: false,
    disabled: false,
  },
};

/**
 * Estado Loading - Carregando áudio
 * Spinner girando rápido, glow intenso
 */
export const Loading: Story = {
  args: {
    state: 'loading',
    audioProgress: 0,
    canReplay: false,
    disabled: false,
  },
};

/**
 * Estado Playing - Reproduzindo áudio
 * Ícone pause, rotação média, glow ativo
 */
export const Playing: Story = {
  args: {
    state: 'playing',
    audioProgress: 45,
    canReplay: false,
    disabled: false,
  },
};

/**
 * Estado Waiting - Aguardando resposta da IA
 * Pulso suave, ondas expandindo (ripple)
 */
export const Waiting: Story = {
  args: {
    state: 'waiting',
    audioProgress: 0,
    canReplay: false,
    disabled: false,
  },
};

/**
 * Estado Processing - Processando input
 * Spinner rápido, glow ativo
 */
export const Processing: Story = {
  args: {
    state: 'processing',
    audioProgress: 0,
    canReplay: false,
    disabled: false,
  },
};

/**
 * Estado Listening - Ouvindo usuário (gravando)
 * Rotação rápida, glow intenso
 */
export const Listening: Story = {
  args: {
    state: 'listening',
    audioProgress: 0,
    canReplay: false,
    disabled: false,
  },
};

/**
 * Can Replay - Modo replay ativado
 * Gradiente roxo, ícone de replay (RotateCcw)
 */
export const CanReplay: Story = {
  args: {
    state: 'idle',
    audioProgress: 0,
    canReplay: true,
    disabled: false,
  },
};

/**
 * Com Progresso - Mostrando arco de progresso
 * Progress arc em ciano acompanhando reprodução
 */
export const WithProgress: Story = {
  args: {
    state: 'playing',
    audioProgress: 65,
    canReplay: false,
    disabled: false,
  },
};

/**
 * Disabled - Botão desabilitado
 * Não responde a hover/click
 */
export const Disabled: Story = {
  args: {
    state: 'idle',
    audioProgress: 0,
    canReplay: false,
    disabled: true,
  },
};

/**
 * Exemplo interativo - Simula fluxo completo
 * Clique para avançar pelos estados:
 * Idle → Loading → Playing (com progresso) → Waiting → Idle (replay mode)
 */
export const Interactive: Story = {
  render: () => {
    const [state, setState] = React.useState<HomePlayerState>('idle');
    const [progress, setProgress] = React.useState(0);
    const [canReplay, setCanReplay] = React.useState(false);

    const handlePlay = () => {
      if (canReplay) {
        // Replay: resetar tudo
        setCanReplay(false);
        setProgress(0);
        setState('idle');
        return;
      }

      // Idle → Loading
      setState('loading');

      // Loading → Playing (após 1.5s)
      setTimeout(() => {
        setState('playing');

        // Simular progresso do áudio
        const interval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 100) {
              clearInterval(interval);
              setState('waiting');

              // Waiting → Idle (replay mode) após 2s
              setTimeout(() => {
                setState('idle');
                setCanReplay(true);
                setProgress(0);
              }, 2000);

              return 100;
            }
            return prev + 2;
          });
        }, 100);
      }, 1500);
    };

    const handlePause = () => {
      setState('idle');
      setProgress(0);
    };

    return (
      <div className="flex flex-col items-center gap-8">
        <HomePlayButton
          state={state}
          audioProgress={progress}
          canReplay={canReplay}
          onPlay={handlePlay}
          onPause={handlePause}
          disabled={false}
        />

        <div className="text-center space-y-2">
          <p className="text-white text-lg font-semibold">
            Estado: <span className="text-cyan-400">{state}</span>
          </p>

          {progress > 0 && (
            <p className="text-gray-400 text-sm">
              Progresso: {progress.toFixed(0)}%
            </p>
          )}

          {canReplay && (
            <p className="text-purple-400 text-sm">
              ✨ Modo Replay Ativado
            </p>
          )}

          <p className="text-gray-500 text-xs max-w-xs">
            Clique no botão para simular o fluxo completo:<br/>
            Idle → Loading → Playing → Waiting → Replay
          </p>
        </div>
      </div>
    );
  },
};

/**
 * Comparação de todos os estados lado a lado
 */
export const AllStates: Story = {
  render: () => {
    const states: { state: HomePlayerState; label: string; progress?: number; canReplay?: boolean }[] = [
      { state: 'idle', label: 'Idle' },
      { state: 'loading', label: 'Loading' },
      { state: 'playing', label: 'Playing', progress: 50 },
      { state: 'waiting', label: 'Waiting' },
      { state: 'processing', label: 'Processing' },
      { state: 'listening', label: 'Listening' },
      { state: 'idle', label: 'Replay', canReplay: true },
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 p-8">
        {states.map(({ state, label, progress, canReplay }) => (
          <div key={`${state}-${label}`} className="flex flex-col items-center gap-4">
            <HomePlayButton
              state={state}
              audioProgress={progress || 0}
              canReplay={canReplay || false}
              disabled={false}
            />
            <p className="text-white text-sm font-medium">{label}</p>
            {progress && <p className="text-gray-400 text-xs">{progress}%</p>}
          </div>
        ))}
      </div>
    );
  },
  parameters: {
    layout: 'centered',
  },
};

/**
 * Em contexto real - Tela HOME
 */
export const InHomeContext: Story = {
  render: () => {
    const [state, setState] = React.useState<HomePlayerState>('idle');

    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-purple-900 flex flex-col items-center justify-center gap-8 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-white text-4xl font-bold mb-2">KnowYOU</h1>
          <p className="text-white/70 text-lg">Seu assistente pessoal de voz</p>
        </div>

        {/* HomePlayButton */}
        <HomePlayButton
          state={state}
          audioProgress={0}
          canReplay={false}
          onPlay={() => setState('loading')}
          onPause={() => setState('idle')}
          disabled={false}
        />

        {/* Status text */}
        <div className="text-center">
          <p className="text-white/90 text-lg">
            {state === 'idle' && 'Toque para começar'}
            {state === 'loading' && 'Carregando...'}
            {state === 'playing' && 'Reproduzindo áudio'}
            {state === 'waiting' && 'Aguardando resposta...'}
            {state === 'processing' && 'Processando...'}
            {state === 'listening' && 'Ouvindo...'}
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => setState('idle')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
          >
            Reset
          </button>
          <button
            onClick={() => {
              const states: HomePlayerState[] = ['idle', 'loading', 'playing', 'waiting', 'processing', 'listening'];
              const currentIndex = states.indexOf(state);
              setState(states[(currentIndex + 1) % states.length]);
            }}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm transition-colors"
          >
            Próximo Estado
          </button>
        </div>
      </div>
    );
  },
  parameters: {
    layout: 'fullscreen',
  },
};
