import type { Preview } from "@storybook/react-vite";
import "../src/index.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "dark",
      values: [
        {
          name: "dark",
          value: "#0F172A", // slate-900
        },
        {
          name: "light",
          value: "#F8FAFC", // slate-50
        },
      ],
    },
  },
};

export default preview;
