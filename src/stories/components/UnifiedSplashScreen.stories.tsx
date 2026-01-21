/**
 * ============================================================
 * UnifiedSplashScreen.stories.tsx - Storybook Stories
 * ============================================================
 * Version: 1.0.0
 * Date: 2026-01-17
 *
 * Description: Interactive documentation for UnifiedSplashScreen.
 * Splash screen unificado usado por todos os PWAs.
 * ============================================================
 */

import type { Meta, StoryObj } from '@storybook/react';
import { UnifiedSplashScreen } from '@/components/pwa/UnifiedSplashScreen';
import { Heart, MessageSquare, Sparkles } from 'lucide-react';
import React from 'react';

const meta = {
  title: 'Layout/UnifiedSplashScreen',
  component: UnifiedSplashScreen,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `Splash screen unificado reutilizável para todos os PWAs. Design baseado no HOME do PWA Principal com gradiente personalizável.

**Características:**
- Gradiente de fundo customizável
- Logo/ícone com animação de escala
- Nome do app centralizado
- Spinner duplo (rotação/contra-rotação)
- Fade-out automático após duração configurável
- Callback onComplete quando terminar

**Usado por:**
- PWA Principal (KnowYOU)
- PWA City (Chat IA)
- PWA Health (Saúde)`,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    appName: {
      control: 'text',
      description: 'Nome do aplicativo',
    },
    icon: {
      control: false,
      description: 'Ícone/Logo do app (React element)',
    },
    primaryColor: {
      control: 'color',
      description: 'Cor primária do gradiente (hex)',
    },
    secondaryColor: {
      control: 'color',
      description: 'Cor secundária do gradiente (hex)',
    },
    duration: {
      control: { type: 'range', min: 1000, max: 5000, step: 100 },
      description: 'Duração do splash em ms',
    },
    show: {
      control: 'boolean',
      description: 'Mostrar ou não o splash (controlled)',
    },
    onComplete: {
      action: 'completed',
      description: 'Callback quando splash completar',
    },
  },
} satisfies Meta<typeof UnifiedSplashScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Splash padrão - PWA Principal (KnowYOU)
 * Gradiente roxo, ícone de estrela
 */
export const PWAPrincipal: Story = {
  args: {
    appName: 'KnowYOU',
    icon: <Sparkles className="w-12 h-12 text-white" />,
    primaryColor: '#7C3AED',
    secondaryColor: '#9333EA',
    duration: 2500,
    show: true,
  },
};

/**
 * PWA City (Chat IA)
 * Gradiente ciano/azul, ícone de chat
 */
export const PWACity: Story = {
  args: {
    appName: 'PWA City',
    icon: <MessageSquare className="w-12 h-12 text-white" />,
    primaryColor: '#06B6D4',
    secondaryColor: '#3B82F6',
    duration: 2500,
    show: true,
  },
};

/**
 * PWA Health (Saúde)
 * Gradiente rosa/vermelho, ícone de coração
 */
export const PWAHealth: Story = {
  args: {
    appName: 'Saúde',
    icon: <Heart className="w-12 h-12 text-white" />,
    primaryColor: '#F43F5E',
    secondaryColor: '#EC4899',
    duration: 2500,
    show: true,
  },
};

/**
 * Splash rápido (1 segundo)
 */
export const FastDuration: Story = {
  args: {
    appName: 'KnowYOU',
    icon: <Sparkles className="w-12 h-12 text-white" />,
    primaryColor: '#7C3AED',
    secondaryColor: '#9333EA',
    duration: 1000,
    show: true,
  },
};

/**
 * Splash longo (4 segundos)
 */
export const LongDuration: Story = {
  args: {
    appName: 'KnowYOU',
    icon: <Sparkles className="w-12 h-12 text-white" />,
    primaryColor: '#7C3AED',
    secondaryColor: '#9333EA',
    duration: 4000,
    show: true,
  },
};

/**
 * Cores customizadas (verde/amarelo)
 */
export const CustomColors: Story = {
  args: {
    appName: 'Custom App',
    icon: '🚀',
    primaryColor: '#10B981',
    secondaryColor: '#FBBF24',
    duration: 2500,
    show: true,
  },
};

/**
 * Com emoji como ícone
 */
export const WithEmoji: Story = {
  args: {
    appName: 'KnowYOU',
    icon: '🎙️',
    primaryColor: '#7C3AED',
    secondaryColor: '#9333EA',
    duration: 2500,
    show: true,
  },
};

/**
 * Exemplo interativo - Reiniciar splash
 */
export const Interactive: Story = {
  render: () => {
    const [show, setShow] = React.useState(true);

    const handleComplete = () => {
      console.log('Splash completed!');
      setTimeout(() => {
        setShow(false);
      }, 500);
    };

    const handleRestart = () => {
      setShow(true);
    };

    return (
      <div className="relative min-h-screen">
        <UnifiedSplashScreen
          appName="KnowYOU"
          icon={<Sparkles className="w-12 h-12 text-white" />}
          primaryColor="#7C3AED"
          secondaryColor="#9333EA"
          duration={2500}
          show={show}
          onComplete={handleComplete}
        />

        {!show && (
          <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-white text-3xl font-bold mb-4">
                App Carregado!
              </h1>
              <p className="text-slate-400 mb-8">
                O splash screen foi exibido e completou.
              </p>
              <button
                onClick={handleRestart}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
              >
                Reiniciar Splash
              </button>
            </div>
          </div>
        )}
      </div>
    );
  },
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * Comparação dos 3 PWAs lado a lado
 */
export const Comparison: Story = {
  render: () => {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <h1 className="text-2xl font-bold text-center mb-8">
          Splash Screens dos PWAs
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* PWA Principal */}
          <div className="flex flex-col items-center gap-4">
            <h3 className="text-lg font-semibold">PWA Principal</h3>
            <div
              className="w-full aspect-[9/19] rounded-3xl overflow-hidden shadow-2xl relative"
              style={{ maxWidth: '300px' }}
            >
              <UnifiedSplashScreen
                appName="KnowYOU"
                icon={<Sparkles className="w-8 h-8 text-white" />}
                primaryColor="#7C3AED"
                secondaryColor="#9333EA"
                duration={10000}
                show={true}
              />
            </div>
          </div>

          {/* PWA City */}
          <div className="flex flex-col items-center gap-4">
            <h3 className="text-lg font-semibold">PWA City</h3>
            <div
              className="w-full aspect-[9/19] rounded-3xl overflow-hidden shadow-2xl relative"
              style={{ maxWidth: '300px' }}
            >
              <UnifiedSplashScreen
                appName="PWA City"
                icon={<MessageSquare className="w-8 h-8 text-white" />}
                primaryColor="#06B6D4"
                secondaryColor="#3B82F6"
                duration={10000}
                show={true}
              />
            </div>
          </div>

          {/* PWA Health */}
          <div className="flex flex-col items-center gap-4">
            <h3 className="text-lg font-semibold">PWA Health</h3>
            <div
              className="w-full aspect-[9/19] rounded-3xl overflow-hidden shadow-2xl relative"
              style={{ maxWidth: '300px' }}
            >
              <UnifiedSplashScreen
                appName="Saúde"
                icon={<Heart className="w-8 h-8 text-white" />}
                primaryColor="#F43F5E"
                secondaryColor="#EC4899"
                duration={10000}
                show={true}
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'light' },
  },
};
