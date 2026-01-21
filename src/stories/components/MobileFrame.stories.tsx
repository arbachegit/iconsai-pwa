/**
 * ============================================================
 * MobileFrame.stories.tsx - Storybook Stories
 * ============================================================
 * Version: 1.0.0
 * Date: 2026-01-17
 *
 * Description: Interactive documentation for MobileFrame.
 * Container que simula iPhone 14 Pro Max para demos desktop.
 * ============================================================
 */

import type { Meta, StoryObj } from '@storybook/react';
import { MobileFrame } from '@/components/pwa/MobileFrame';

const meta = {
  title: 'Layout/MobileFrame',
  component: MobileFrame,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Container que simula iPhone 14 Pro Max (430×932px). Usado para exibir PWAs em desktop, criando visualização realista de dispositivo móvel. Inclui notch, bordas arredondadas e sombra.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: false,
      description: 'Conteúdo a ser exibido dentro do frame (geralmente um PWA completo)',
    },
  },
} satisfies Meta<typeof MobileFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Frame vazio - mostra apenas a estrutura
 */
export const Empty: Story = {
  args: {
    children: (
      <div className="w-full h-full bg-gradient-to-b from-purple-900 via-purple-800 to-purple-900 flex items-center justify-center">
        <p className="text-white text-xl">Conteúdo do PWA aqui</p>
      </div>
    ),
  },
};

/**
 * Com splash screen simulado
 */
export const WithSplash: Story = {
  args: {
    children: (
      <div className="w-full h-full bg-gradient-to-b from-purple-900 via-purple-800 to-purple-900 flex flex-col items-center justify-center gap-6">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
          <span className="text-4xl">🎤</span>
        </div>
        <h1 className="text-white text-3xl font-bold">KnowYOU</h1>
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  },
};

/**
 * Com interface de chat
 */
export const WithChat: Story = {
  args: {
    children: (
      <div className="w-full h-full bg-[#0a0a0a] flex flex-col">
        {/* Header */}
        <div className="bg-purple-900 p-4 flex items-center justify-between">
          <h1 className="text-white font-bold text-lg">PWA City</h1>
          <button className="text-white text-sm">Logout</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-purple-900/30 rounded-lg p-3 max-w-[80%]">
            <p className="text-white text-sm">Olá! Como posso ajudar?</p>
          </div>
          <div className="bg-blue-900/30 rounded-lg p-3 max-w-[80%] ml-auto">
            <p className="text-white text-sm">
              Me explique inteligência artificial
            </p>
          </div>
        </div>

        {/* Input */}
        <div className="p-4 bg-gray-900">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 text-sm"
            />
            <button className="bg-purple-600 text-white rounded-lg px-4 py-2 text-sm">
              Enviar
            </button>
          </div>
        </div>
      </div>
    ),
  },
};

/**
 * Com voice assistant
 */
export const WithVoiceAssistant: Story = {
  args: {
    children: (
      <div className="w-full h-full bg-gradient-to-b from-purple-900 via-purple-800 to-purple-900 flex flex-col items-center justify-center gap-8 p-8">
        {/* Botão de microfone grande */}
        <div className="relative">
          <div className="w-32 h-32 bg-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/50">
            <svg
              className="w-16 h-16 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
          {/* Pulse animation */}
          <div className="absolute inset-0 w-32 h-32 bg-purple-600 rounded-full animate-ping opacity-20" />
        </div>

        <p className="text-white text-lg">Listening...</p>

        {/* Spectrum analyzer simulado */}
        <div className="flex gap-1 items-end h-16">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="w-2 bg-purple-400 rounded-t"
              style={{
                height: `${Math.random() * 100}%`,
                animation: `pulse ${0.5 + Math.random() * 0.5}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
      </div>
    ),
  },
};

/**
 * Múltiplos frames - comparação
 */
export const Comparison: Story = {
  render: () => {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center gap-4">
            <h3 className="text-lg font-bold">PWA Principal</h3>
            <div style={{ transform: 'scale(0.5)', transformOrigin: 'top' }}>
              <MobileFrame>
                <div className="w-full h-full bg-gradient-to-b from-purple-900 to-purple-800 flex items-center justify-center">
                  <p className="text-white">KnowYOU</p>
                </div>
              </MobileFrame>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <h3 className="text-lg font-bold">PWA City</h3>
            <div style={{ transform: 'scale(0.5)', transformOrigin: 'top' }}>
              <MobileFrame>
                <div className="w-full h-full bg-gradient-to-b from-blue-900 to-blue-800 flex items-center justify-center">
                  <p className="text-white">Chat IA</p>
                </div>
              </MobileFrame>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <h3 className="text-lg font-bold">PWA Health</h3>
            <div style={{ transform: 'scale(0.5)', transformOrigin: 'top' }}>
              <MobileFrame>
                <div className="w-full h-full bg-gradient-to-b from-green-900 to-green-800 flex items-center justify-center">
                  <p className="text-white">Saúde</p>
                </div>
              </MobileFrame>
            </div>
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    backgrounds: { default: 'light' },
  },
};
