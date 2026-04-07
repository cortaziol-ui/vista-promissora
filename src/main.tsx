import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
} else {
  // Fallback: create root element if missing (extension interference)
  const fallback = document.createElement("div");
  fallback.id = "root";
  document.body.appendChild(fallback);
  createRoot(fallback).render(<App />);
}
