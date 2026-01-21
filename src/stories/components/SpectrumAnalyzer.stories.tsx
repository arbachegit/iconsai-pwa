/**
 * ============================================================
 * SpectrumAnalyzer.stories.tsx - Storybook Stories
 * ============================================================
 * Version: 1.0.0
 * Date: 2026-01-17
 *
 * Description: Interactive documentation for SpectrumAnalyzer.
 * Visualizador de espectro de áudio com barras animadas.
 * ============================================================
 */

import type { Meta, StoryObj } from '@storybook/react';
import { SpectrumAnalyzer } from '@/components/pwa/voice/SpectrumAnalyzer';

const meta = {
  title: 'Components/SpectrumAnalyzer',
  component: SpectrumAnalyzer,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Visualizador de espectro de áudio com barras verticais animadas. Usado para mostrar análise de frequência de áudio em tempo real. Conecta-se ao Web Audio API.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    analyser: {
      control: false,
      description: 'AnalyserNode do Web Audio API (null = simulação)',
    },
    className: {
      control: 'text',
      description: 'Classes CSS adicionais (Tailwind)',
    },
  },
} satisfies Meta<typeof SpectrumAnalyzer>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Estado padrão - Sem áudio (simulação)
 */
export const Default: Story = {
  args: {
    analyser: null,
  },
};

/**
 * Com áudio simulado
 * Mostra animação de barras mesmo sem Web Audio API
 */
export const SimulatedAudio: Story = {
  render: () => {
    return (
      <div className="flex flex-col items-center gap-4 p-8 bg-black rounded-lg">
        <SpectrumAnalyzer analyser={null} />
        <p className="text-sm text-gray-400">
          Spectrum Analyzer (modo simulação)
        </p>
      </div>
    );
  },
};

/**
 * Tamanho customizado
 */
export const CustomSize: Story = {
  args: {
    analyser: null,
    className: 'h-32',
  },
};

/**
 * Múltiplos analyzers lado a lado
 */
export const Multiple: Story = {
  render: () => {
    return (
      <div className="flex gap-8 p-8 bg-black rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <SpectrumAnalyzer analyser={null} />
          <p className="text-xs text-gray-500">Analyzer 1</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <SpectrumAnalyzer analyser={null} className="h-32" />
          <p className="text-xs text-gray-500">Analyzer 2</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <SpectrumAnalyzer analyser={null} className="h-16" />
          <p className="text-xs text-gray-500">Analyzer 3</p>
        </div>
      </div>
    );
  },
};

/**
 * Dentro de container escuro (uso real)
 */
export const DarkContainer: Story = {
  render: () => {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-white text-xl font-bold">Audio Player</h2>
          <SpectrumAnalyzer analyser={null} />
          <p className="text-gray-400 text-sm">Playing audio...</p>
        </div>
      </div>
    );
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};
