import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GpsApp } from "./features/gps/GpsApp";
import { AppUpdateNotice } from "./shared/components/AppUpdateNotice";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GpsApp />
    <AppUpdateNotice />
  </StrictMode>
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
