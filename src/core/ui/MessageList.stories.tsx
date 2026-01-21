/**
 * ============================================================
 * MessageList Stories - Storybook Stories para o componente MessageList
 * ============================================================
 */

import type { Meta, StoryObj } from "@storybook/react";
import { MessageList } from "./MessageList";
import { EmptyState } from "./EmptyState";
import { HeartPulse } from "lucide-react";
import type { Message } from "../types";

const meta = {
  title: "Core/MessageList",
  component: MessageList,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ height: "500px", backgroundColor: "#0F172A" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MessageList>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleMessages: Message[] = [
  {
    id: "1",
    content: "Olá! Como está a taxa de mortalidade infantil em São Paulo?",
    role: "user",
    timestamp: new Date("2026-01-20T10:00:00"),
  },
  {
    id: "2",
    content: "A taxa de mortalidade infantil em São Paulo é de aproximadamente 10,5 por mil nascidos vivos, segundo dados do IBGE 2024. Isso representa uma melhora de 15% em relação à década anterior.\n\n**Fatores que contribuíram:**\n- Melhor acesso a pré-natal\n- Vacinação em dia\n- Programas de saúde da família",
    role: "assistant",
    timestamp: new Date("2026-01-20T10:00:05"),
    metadata: { apiProvider: "perplexity" },
  },
  {
    id: "3",
    content: "E em comparação com outras capitais?",
    role: "user",
    timestamp: new Date("2026-01-20T10:01:00"),
  },
];

export const WithMessages: Story = {
  args: {
    messages: sampleMessages,
    theme: {
      primaryColor: "#10B981",
      bgColor: "bg-slate-950",
      borderColor: "border-emerald-500/20",
      textColor: "text-white",
    },
  },
};

export const Loading: Story = {
  args: {
    messages: sampleMessages,
    isLoading: true,
    loadingText: "Consultando dados de saúde...",
    theme: {
      primaryColor: "#10B981",
      bgColor: "bg-slate-950",
      borderColor: "border-emerald-500/20",
      textColor: "text-white",
    },
  },
};

export const Empty: Story = {
  args: {
    messages: [],
    emptyState: (
      <EmptyState
        icon={HeartPulse}
        title="PWA Health - Gestão de Saúde"
        description="Compare o IDH da sua cidade com municípios do mesmo porte. Consulte doenças, hospitais e ações para melhorar a saúde pública."
        theme={{
          primaryColor: "#10B981",
          bgColor: "bg-transparent",
          borderColor: "border-emerald-500/20",
          textColor: "text-white",
        }}
      />
    ),
    theme: {
      primaryColor: "#10B981",
      bgColor: "bg-slate-950",
      borderColor: "border-emerald-500/20",
      textColor: "text-white",
    },
  },
};

export const WithError: Story = {
  args: {
    messages: [
      ...sampleMessages,
      {
        id: "4",
        content: "Erro ao processar sua mensagem. Tente novamente.",
        role: "error",
        timestamp: new Date("2026-01-20T10:01:05"),
      },
    ],
    theme: {
      primaryColor: "#10B981",
      bgColor: "bg-slate-950",
      borderColor: "border-emerald-500/20",
      textColor: "text-white",
    },
  },
};
