/**
 * ============================================================
 * InputArea Stories - Storybook Stories para o componente InputArea
 * ============================================================
 */

import type { Meta, StoryObj } from "@storybook/react";
import { InputArea } from "./InputArea";

const meta = {
  title: "Core/InputArea",
  component: InputArea,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    onSubmit: { action: "submitted" },
  },
} satisfies Meta<typeof InputArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Digite sua mensagem...",
  },
};

export const Loading: Story = {
  args: {
    placeholder: "Digite sua mensagem...",
    isLoading: true,
  },
};

export const Disabled: Story = {
  args: {
    placeholder: "Input desabilitado",
    disabled: true,
  },
};

export const HealthTheme: Story = {
  args: {
    placeholder: "Pergunte sobre saúde...",
    theme: {
      primaryColor: "#10B981",
      bgColor: "bg-slate-900/80",
      borderColor: "border-emerald-500/20",
      textColor: "text-white",
    },
  },
};

export const WorldTheme: Story = {
  args: {
    placeholder: "Pergunte sobre economia...",
    theme: {
      primaryColor: "#10B981",
      bgColor: "bg-slate-900/80",
      borderColor: "border-emerald-500/20",
      textColor: "text-white",
    },
  },
};

export const IdeasTheme: Story = {
  args: {
    placeholder: "Compartilhe suas ideias...",
    theme: {
      primaryColor: "#F59E0B",
      bgColor: "bg-slate-900/80",
      borderColor: "border-amber-500/20",
      textColor: "text-white",
    },
  },
};
