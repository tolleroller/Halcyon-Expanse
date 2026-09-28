import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Reader } from "./components/reader";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Reader />
  </StrictMode>,
);
