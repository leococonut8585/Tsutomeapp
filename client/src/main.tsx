import * as React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Fix for Replit's runtime-error-modal plugin in development
// The plugin expects window.React to exist for rendering error overlays
// Set it immediately before any other code runs
if (typeof window !== 'undefined') {
  (window as any).React = React;
  (window as any).ReactDOM = ReactDOM;
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
