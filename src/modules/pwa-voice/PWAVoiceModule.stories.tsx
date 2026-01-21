/**
 * ============================================================
 * PWA Voice Module Stories - Storybook Stories
 * ============================================================
 */

import type { Meta, StoryObj } from "@storybook/react";
import { VoiceSpectrum } from "./components/VoiceSpectrum";
import { MicrophoneButton } from "./components/MicrophoneButton";
import { VoicePlayButton } from "./components/VoicePlayButton";
import { VOICE_THEME, SPECTRUM_CONFIG } from "./config";

// VoiceSpectrum Stories
const spectrumMeta = {
  title: "Modules/PWAVoice/VoiceSpectrum",
  component: VoiceSpectrum,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ padding: "40px", backgroundColor: "#0F172A" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VoiceSpectrum>;

export default spectrumMeta;
type SpectrumStory = StoryObj<typeof spectrumMeta>;

export const Idle: SpectrumStory = {
  args: {
    state: "idle",
    theme: VOICE_THEME,
    height: 120,
    width: 280,
  },
};

export const Loading: SpectrumStory = {
  args: {
    state: "loading",
    theme: VOICE_THEME,
    height: 120,
    width: 280,
  },
};

export const Playing: SpectrumStory = {
  args: {
    state: "playing",
    theme: VOICE_THEME,
    height: 120,
    width: 280,
    frequencyData: Array(32).fill(0).map(() => Math.random() * 255),
  },
};

export const Recording: SpectrumStory = {
  args: {
    state: "recording",
    theme: VOICE_THEME,
    height: 120,
    width: 280,
    frequencyData: Array(32).fill(0).map(() => Math.random() * 200),
  },
};

export const HealthTheme: SpectrumStory = {
  args: {
    state: "playing",
    theme: {
      primaryColor: "#F43F5E",
      secondaryColor: "#FB7185",
      bgColor: "bg-slate-950",
      borderColor: "border-rose-500/20",
      textColor: "text-white",
    },
    height: 120,
    width: 280,
    frequencyData: Array(32).fill(0).map(() => Math.random() * 255),
  },
};

export const IdeasTheme: SpectrumStory = {
  args: {
    state: "playing",
    theme: {
      primaryColor: "#F59E0B",
      secondaryColor: "#FBBF24",
      bgColor: "bg-slate-950",
      borderColor: "border-amber-500/20",
      textColor: "text-white",
    },
    height: 120,
    width: 280,
    frequencyData: Array(32).fill(0).map(() => Math.random() * 255),
  },
};
