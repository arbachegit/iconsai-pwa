/**
 * ============================================================
 * ToggleMicrophoneButton.stories.tsx - Storybook Stories
 * ============================================================
 * Version: 1.0.0
 * Date: 2026-01-17
 *
 * Description: Interactive documentation for ToggleMicrophoneButton.
 * Shows different states (idle, listening, speaking).
 * ============================================================
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ToggleMicrophoneButton } from '@/components/pwa/voice/ToggleMicrophoneButton';

const meta = {
  title: 'Components/ToggleMicrophoneButton',
  component: ToggleMicrophoneButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Botão de microfone com 3 estados visuais: idle (roxo), listening (vermelho pulsando), speaking (azul pulsando). Usado para controlar gravação de voz.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isListening: {
      control: 'boolean',
      description: 'Estado de escuta (true = gravando, false = idle)',
    },
    isSpeaking: {
      control: 'boolean',
      description: 'Estado de fala da IA (true = IA falando, false = não falando)',
    },
    onClick: {
      action: 'clicked',
      description: 'Callback executado ao clicar no botão',
    },
    className: {
      control: 'text',
      description: 'Classes CSS adicionais (Tailwind)',
    },
  },
} satisfies Meta<typeof ToggleMicrophoneButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Estado padrão - Idle (roxo)
 */
export const Idle: Story = {
  args: {
    isListening: false,
    isSpeaking: false,
    onClick: () => console.log('Mic clicked'),
  },
};

/**
 * Estado Listening (vermelho pulsando)
 * Indica que o microfone está gravando
 */
export const Listening: Story = {
  args: {
    isListening: true,
    isSpeaking: false,
    onClick: () => console.log('Stop listening'),
  },
};

/**
 * Estado Speaking (azul pulsando)
 * Indica que a IA está falando
 */
export const Speaking: Story = {
  args: {
    isListening: false,
    isSpeaking: true,
    onClick: () => console.log('Stop speaking'),
  },
};

/**
 * Tamanho customizado
 */
export const CustomSize: Story = {
  args: {
    isListening: false,
    isSpeaking: false,
    onClick: () => console.log('Custom size clicked'),
    className: 'w-24 h-24',
  },
};

/**
 * Exemplo interativo - clique para alternar estados
 */
export const Interactive: Story = {
  render: () => {
    const [isListening, setIsListening] = React.useState(false);
    const [isSpeaking, setIsSpeaking] = React.useState(false);

    const handleClick = () => {
      if (isSpeaking) {
        // Se está falando, para
        setIsSpeaking(false);
      } else if (isListening) {
        // Se está ouvindo, simula que IA vai falar
        setIsListening(false);
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), 3000);
      } else {
        // Idle -> Listening
        setIsListening(true);
      }
    };

    return (
      <div className="flex flex-col items-center gap-4">
        <ToggleMicrophoneButton
          isListening={isListening}
          isSpeaking={isSpeaking}
          onClick={handleClick}
        />
        <p className="text-sm text-gray-400">
          Estado:{' '}
          {isSpeaking
            ? 'Speaking (IA falando)'
            : isListening
            ? 'Listening (Gravando)'
            : 'Idle (Aguardando)'}
        </p>
        <p className="text-xs text-gray-500">
          Clique para alternar entre estados
        </p>
      </div>
    );
  },
};

import React from 'react';
