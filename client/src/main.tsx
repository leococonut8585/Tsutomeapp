import * as React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Replace the mock React with the real one
(window as any).__realReact = React;
(window as any).__realReactDOM = ReactDOM;
(window as any).React = React;
(window as any).ReactDOM = ReactDOM;

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
