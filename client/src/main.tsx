import React from "react";
import ReactDOM from "react-dom/client";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Fix for Replit's runtime-error-modal plugin in development
// The plugin expects window.React to exist for rendering error overlays
if (import.meta.env.DEV) {
  (window as any).React = React;
  (window as any).ReactDOM = ReactDOM;
}

createRoot(document.getElementById("root")!).render(<App />);
