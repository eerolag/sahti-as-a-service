import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { HapticsProvider } from "./hooks/useHaptics";
import "./styles/tokens.css";
import "./styles/app.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <HapticsProvider>
      <App />
    </HapticsProvider>
  </React.StrictMode>,
);
