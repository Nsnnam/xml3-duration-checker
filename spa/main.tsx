import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HomePage } from "../src/routes/index";
import "../src/styles.css";

const element = document.getElementById("root");
if (!element) throw new Error("Missing #root");
createRoot(element).render(
  <StrictMode>
    <HomePage />
  </StrictMode>,
);
