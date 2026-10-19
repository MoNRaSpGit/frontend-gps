import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GpsApp } from "./features/gps/GpsApp";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GpsApp />
  </StrictMode>
);
