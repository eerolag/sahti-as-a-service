import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { HapticsProvider } from "./hooks/useHaptics";
import { I18nProvider } from "./i18n/i18nContext";
import "./styles/tokens.css";
import "./styles/app.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <I18nProvider>
      <HapticsProvider>
        <App />
      </HapticsProvider>
    </I18nProvider>
  </React.StrictMode>,
);
