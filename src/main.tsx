import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Use AppSecure for production-ready secure implementation
// Use App for the original demo (API keys exposed - NOT recommended for production)
import AppSecure from "./AppSecure.tsx";
// import App from "./App.tsx"; // Original demo - uncomment to use
import "./index.css";
import { Web3Provider } from "./providers/Web3Provider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Web3Provider>
      <AppSecure />
    </Web3Provider>
  </StrictMode>
);
