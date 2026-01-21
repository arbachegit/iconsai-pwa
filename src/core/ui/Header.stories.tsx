/**
 * ============================================================
 * Header Stories - Storybook Stories para o componente Header
 * ============================================================
 */

import type { Meta, StoryObj } from "@storybook/react";
import { Header } from "./Header";
import { HeartPulse, Globe, HelpCircle, Lightbulb, LogOut } from "lucide-react";

const meta = {
  title: "Core/Header",
  component: Header,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    onBack: { action: "back clicked" },
    onAction: { action: "action clicked" },
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "PWA Health",
    subtitle: "Fernando",
    icon: HeartPulse,
    theme: {
      primaryColor: "#10B981",
      bgColor: "bg-slate-900/80",
      borderColor: "border-emerald-500/20",
      textColor: "text-white",
    },
  },
};

export const WithBack: Story = {
  args: {
    title: "Módulo Ajuda",
    icon: HelpCircle,
    onBack: () => console.log("Back clicked"),
    theme: {
      primaryColor: "#3B82F6",
      bgColor: "bg-slate-900/80",
      borderColor: "border-blue-500/20",
      textColor: "text-white",
    },
  },
};

export const WithAction: Story = {
  args: {
    title: "PWA Health",
    subtitle: "João Silva",
    icon: HeartPulse,
    onAction: () => console.log("Logout clicked"),
    actionIcon: LogOut,
    actionLabel: "Sair",
    theme: {
      primaryColor: "#10B981",
      bgColor: "bg-slate-900/80",
      borderColor: "border-emerald-500/20",
      textColor: "text-white",
    },
  },
};

export const WorldModule: Story = {
  args: {
    title: "Mundo",
    icon: Globe,
    onBack: () => console.log("Back clicked"),
    theme: {
      primaryColor: "#10B981",
      bgColor: "bg-slate-900/80",
      borderColor: "border-emerald-500/20",
      textColor: "text-white",
    },
  },
};

export const IdeasModule: Story = {
  args: {
    title: "Ideias",
    icon: Lightbulb,
    onBack: () => console.log("Back clicked"),
    theme: {
      primaryColor: "#F59E0B",
      bgColor: "bg-slate-900/80",
      borderColor: "border-amber-500/20",
      textColor: "text-white",
    },
  },
};
