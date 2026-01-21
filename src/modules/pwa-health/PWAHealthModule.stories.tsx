/**
 * ============================================================
 * PWA Health Module Stories - Storybook Stories
 * ============================================================
 */

import type { Meta, StoryObj } from "@storybook/react";
import { PWAHealthModule } from "./PWAHealthModule";

const meta = {
  title: "Modules/PWAHealthModule",
  component: PWAHealthModule,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    onLogout: { action: "logout clicked" },
  },
  decorators: [
    (Story) => (
      <div style={{ height: "100vh", backgroundColor: "#0F172A" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PWAHealthModule>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    userName: "Fernando",
    sessionId: "session-123",
  },
};

export const WithoutUser: Story = {
  args: {
    sessionId: "session-123",
  },
};

export const WithLogout: Story = {
  args: {
    userName: "João Silva",
    sessionId: "session-456",
    onLogout: () => console.log("Logout clicked"),
  },
};
