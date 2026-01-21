/**
 * ============================================================
 * PlayButton.stories.tsx - Storybook Stories for PlayButton
 * ============================================================
 * Version: 1.0.0
 * Date: 2026-01-17
 *
 * Description: Interactive documentation for PlayButton component.
 * Shows different states and configurations.
 * ============================================================
 */

import type { Meta, StoryObj } from '@storybook/react';
import { PlayButton, PlayButtonState } from '@/components/pwa/voice/PlayButton';

const meta = {
  title: 'Components/PlayButton',
  component: PlayButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Botão de play/pause circular usado nos módulos dos PWAs. Suporta 4 estados: idle, loading, playing, paused. Inclui animações e anel de progresso.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    state: {
      control: 'select',
      options: ['idle', 'loading', 'playing', 'paused'],
      description: 'Estado atual do botão',
    },
    onClick: {
      action: 'clicked',
      description: 'Callback executado ao clicar no botão',
    },
    progress: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Progresso da reprodução (0-100%)',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'Tamanho do botão',
    },
    primaryColor: {
      control: 'color',
      description: 'Cor primária do botão (hex)',
    },
    disabled: {
      control: 'boolean',
      description: 'Se o botão está desabilitado',
    },
    label: {
      control: 'text',
      description: 'Texto abaixo do botão',
    },
    className: {
      control: 'text',
      description: 'Classes CSS adicionais (Tailwind)',
    },
  },
} satisfies Meta<typeof PlayButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Estado padrão do botão (idle/pausado)
 */
export const Default: Story = {
  args: {
    state: 'idle',
    onClick: () => console.log('Play clicked'),
    size: 'lg',
    primaryColor: '#3B82F6',
  },
};

/**
 * Botão no estado "playing" (mostra Pause)
 */
export const Playing: Story = {
  args: {
    state: 'playing',
    onClick: () => console.log('Pause clicked'),
    size: 'lg',
    primaryColor: '#3B82F6',
  },
};

/**
 * Botão no estado "loading"
 */
export const Loading: Story = {
  args: {
    state: 'loading',
    onClick: () => console.log('Loading...'),
    size: 'lg',
    primaryColor: '#3B82F6',
  },
};

/**
 * Botão com tamanho pequeno
 */
export const SmallSize: Story = {
  args: {
    state: 'idle',
    onClick: () => console.log('Small clicked'),
    size: 'sm',
    primaryColor: '#3B82F6',
  },
};

/**
 * Botão com tamanho extra grande
 */
export const ExtraLargeSize: Story = {
  args: {
    state: 'idle',
    onClick: () => console.log('XL clicked'),
    size: 'xl',
    primaryColor: '#3B82F6',
  },
};

/**
 * Botão com cor customizada (verde)
 */
export const CustomColor: Story = {
  args: {
    state: 'idle',
    onClick: () => console.log('Green clicked'),
    size: 'lg',
    primaryColor: '#10B981',
  },
};

/**
 * Botão com progresso de reprodução
 */
export const WithProgress: Story = {
  args: {
    state: 'playing',
    onClick: () => console.log('Pause clicked'),
    size: 'lg',
    primaryColor: '#3B82F6',
    progress: 65,
  },
};

/**
 * Botão com label
 */
export const WithLabel: Story = {
  args: {
    state: 'idle',
    onClick: () => console.log('Play clicked'),
    size: 'lg',
    primaryColor: '#8B5CF6',
    label: 'Reproduzir Áudio',
  },
};

/**
 * Botão desabilitado
 */
export const Disabled: Story = {
  args: {
    state: 'idle',
    onClick: () => console.log('Should not fire'),
    size: 'lg',
    primaryColor: '#3B82F6',
    disabled: true,
  },
};

/**
 * Exemplo interativo - clique para alternar estado
 */
export const Interactive: Story = {
  render: () => {
    const [state, setState] = React.useState<PlayButtonState>('idle');
    const [progress, setProgress] = React.useState(0);

    const handleClick = () => {
      if (state === 'playing') {
        // Playing -> Paused
        setState('paused');
      } else if (state === 'paused') {
        // Paused -> Playing (continua progresso)
        setState('playing');
      } else {
        // Idle -> Loading -> Playing
        setState('loading');
        setTimeout(() => {
          setState('playing');
          setProgress(0);

          // Simular progresso
          const interval = setInterval(() => {
            setProgress(prev => {
              if (prev >= 100) {
                clearInterval(interval);
                setState('idle');
                return 0;
              }
              return prev + 2;
            });
          }, 100);
        }, 1000);
      }
    };

    return (
      <div className="flex flex-col items-center gap-4">
        <PlayButton
          state={state}
          onClick={handleClick}
          size="lg"
          primaryColor="#3B82F6"
          progress={progress}
        />
        <div className="text-center">
          <p className="text-sm text-gray-400">
            Estado: <span className="text-cyan-400">{state}</span>
          </p>
          {progress > 0 && (
            <p className="text-xs text-gray-500">
              Progresso: {progress.toFixed(0)}%
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Clique para alternar: Idle → Loading → Playing → Paused
          </p>
        </div>
      </div>
    );
  },
};

import React from 'react';
