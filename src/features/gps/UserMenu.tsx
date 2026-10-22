import { useEffect, useRef, useState } from "react";
import type { GpsUser } from "./gps.types";

const ROLE_LABELS = { admin: "Admin", repartidor: "Repartidor" } as const;

// Icono de usuario del encabezado (22/10/2026, pedido explicito): reemplaza
// el texto "usuario · rol" y el boton "Salir" sueltos; al tocarlo se abre
// un menu con quien esta conectado y "Salir".
export function UserMenu({ user, onLogout }: { user: GpsUser; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="gps-user-menu" ref={wrapRef}>
      <button
        type="button"
        className="gps-user-button"
        aria-label="Usuario"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="gps-user-dropdown" role="menu">
          <div className="gps-user-info">
            <strong>{user.fullName ?? user.username}</strong>
            <span className="gps-muted">{ROLE_LABELS[user.role]}</span>
          </div>
          <button type="button" className="gps-user-logout" role="menuitem" onClick={onLogout}>
            Salir
          </button>
        </div>
      )}
    </div>
  );
}
