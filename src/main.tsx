import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

const container = document.getElementById("root");

if (container) {
  createRoot(container).render(<App />);
} else {
  console.error("Root element not found");
}
