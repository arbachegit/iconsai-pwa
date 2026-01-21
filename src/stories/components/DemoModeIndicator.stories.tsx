/**
 * ============================================================
 * DemoModeIndicator.stories.tsx - Storybook Stories
 * ============================================================
 * Version: 1.0.0
 * Date: 2026-01-17
 *
 * Description: Badge que indica quando a aplicação está em modo demo.
 * Mostra se é demo "limpo" ou "com histórico".
 * ============================================================
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '@/components/ui/badge';

// Componente auxiliar para demonstração
const DemoModeIndicator = ({
  isDemoMode,
  demoType,
}: {
  isDemoMode: boolean;
  demoType: 'clean' | 'seeded' | null;
}) => {
  if (!isDemoMode) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <Badge
        variant="outline"
        className="bg-yellow-500/20 border-yellow-500 text-yellow-700 font-semibold px-4 py-2"
      >
        🎭 MODO DEMONSTRAÇÃO
        {demoType === 'clean' && ' (Limpo)'}
        {demoType === 'seeded' && ' (Com Histórico)'}
      </Badge>
    </div>
  );
};

const meta = {
  title: 'Components/DemoModeIndicator',
  component: DemoModeIndicator,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Badge flutuante que aparece no canto superior direito quando a aplicação está em modo demonstração. Indica se é demo limpo (sem histórico) ou seeded (com histórico pré-carregado).',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isDemoMode: {
      control: 'boolean',
      description: 'Se true, exibe o badge. Se false, não exibe nada.',
    },
    demoType: {
      control: 'select',
      options: ['clean', 'seeded', null],
      description: 'Tipo de demo: clean (limpo) ou seeded (com histórico)',
    },
  },
} satisfies Meta<typeof DemoModeIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Modo normal - Não exibe badge
 */
export const Normal: Story = {
  args: {
    isDemoMode: false,
    demoType: null,
  },
  render: (args) => {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-purple-800 flex items-center justify-center">
        <DemoModeIndicator {...args} />
        <p className="text-white text-xl">Modo Normal - Sem badge</p>
      </div>
    );
  },
};

/**
 * Demo Limpo
 */
export const DemoClean: Story = {
  args: {
    isDemoMode: true,
    demoType: 'clean',
  },
  render: (args) => {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-purple-800 flex items-center justify-center">
        <DemoModeIndicator {...args} />
        <div className="text-center">
          <h1 className="text-white text-3xl font-bold mb-4">PWA Demo</h1>
          <p className="text-white/80">Histórico vazio - Será limpo ao fechar</p>
        </div>
      </div>
    );
  },
};

/**
 * Demo Seeded (Com Histórico)
 */
export const DemoSeeded: Story = {
  args: {
    isDemoMode: true,
    demoType: 'seeded',
  },
  render: (args) => {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-800 flex items-center justify-center">
        <DemoModeIndicator {...args} />
        <div className="text-center">
          <h1 className="text-white text-3xl font-bold mb-4">PWA City Demo</h1>
          <p className="text-white/80">
            Com histórico pré-carregado - Mantém ao fechar
          </p>
        </div>
      </div>
    );
  },
};

/**
 * Em contexto real - PWA Health
 */
export const InContext: Story = {
  args: {
    isDemoMode: true,
    demoType: 'seeded',
  },
  render: (args) => {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <DemoModeIndicator {...args} />

        {/* Header */}
        <div className="bg-green-900 p-4">
          <h1 className="text-white font-bold text-lg">PWA Health - Demo</h1>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="bg-green-900/30 rounded-lg p-4">
            <p className="text-white text-sm">Estou com dor de cabeça há 2 dias</p>
          </div>
          <div className="bg-blue-900/30 rounded-lg p-4">
            <p className="text-white text-sm">
              Vou fazer algumas perguntas para avaliar melhor...
            </p>
          </div>
        </div>

        {/* Note */}
        <div className="fixed bottom-4 left-4 right-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">
            💡 Este é um ambiente de demonstração. Nenhum dado será salvo no banco.
          </p>
        </div>
      </div>
    );
  },
};

/**
 * Múltiplas PWAs lado a lado
 */
export const MultipleApps: Story = {
  render: () => {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* PWA Principal - Clean */}
          <div className="relative bg-gradient-to-b from-purple-900 to-purple-800 rounded-lg h-96 flex items-center justify-center">
            <div className="absolute top-2 right-2">
              <Badge
                variant="outline"
                className="bg-yellow-500/20 border-yellow-500 text-yellow-700 text-xs"
              >
                🎭 DEMO (Limpo)
              </Badge>
            </div>
            <p className="text-white">PWA Principal</p>
          </div>

          {/* PWA City - Seeded */}
          <div className="relative bg-gradient-to-b from-blue-900 to-blue-800 rounded-lg h-96 flex items-center justify-center">
            <div className="absolute top-2 right-2">
              <Badge
                variant="outline"
                className="bg-yellow-500/20 border-yellow-500 text-yellow-700 text-xs"
              >
                🎭 DEMO (Com Histórico)
              </Badge>
            </div>
            <p className="text-white">PWA City</p>
          </div>

          {/* PWA Health - Normal */}
          <div className="relative bg-gradient-to-b from-green-900 to-green-800 rounded-lg h-96 flex items-center justify-center">
            <p className="text-white">PWA Health (Normal)</p>
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    backgrounds: { default: 'light' },
  },
};
