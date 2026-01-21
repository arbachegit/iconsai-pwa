/**
 * ============================================================
 * Unified Module Stories - Storybook Stories
 * ============================================================
 */

import type { Meta, StoryObj } from "@storybook/react";
import { UnifiedModule } from "./UnifiedModule";

const meta = {
  title: "Modules/UnifiedModule",
  component: UnifiedModule,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    moduleType: {
      control: { type: "select" },
      options: ["help", "world", "health", "ideas"],
    },
    onBack: { action: "back clicked" },
    onHistoryClick: { action: "history clicked" },
  },
  decorators: [
    (Story) => (
      <div style={{ height: "100vh", backgroundColor: "#0F172A" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UnifiedModule>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HelpModule: Story = {
  args: {
    moduleType: "help",
    onBack: () => console.log("Back clicked"),
    onHistoryClick: () => console.log("History clicked"),
  },
};

export const WorldModule: Story = {
  args: {
    moduleType: "world",
    onBack: () => console.log("Back clicked"),
    onHistoryClick: () => console.log("History clicked"),
  },
};

export const HealthModule: Story = {
  args: {
    moduleType: "health",
    onBack: () => console.log("Back clicked"),
    onHistoryClick: () => console.log("History clicked"),
  },
};

export const IdeasModule: Story = {
  args: {
    moduleType: "ideas",
    onBack: () => console.log("Back clicked"),
    onHistoryClick: () => console.log("History clicked"),
  },
};
