import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import { RotateHint } from "./ui/RotateHint";
import "./styles/index.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root がありません");
createRoot(root).render(
  <StrictMode>
    <App />
    <RotateHint />
  </StrictMode>,
);
