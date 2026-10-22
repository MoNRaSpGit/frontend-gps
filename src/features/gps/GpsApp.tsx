import { useState } from "react";
import { AdminDashboard } from "./admin/AdminDashboard";
import { ClientAssignScreen } from "./clientes/ClientAssignScreen";
import { LoginScreen } from "./auth/LoginScreen";
import { useAuthSession } from "./auth/useAuthSession";
import { logout } from "./gps.client";
import { RepartidorTabsScreen } from "./repartidor/RepartidorTabsScreen";

const ROLE_LABELS = { admin: "Admin", repartidor: "Repartidor" } as const;

export function GpsApp() {
  const { session, saveSession, clearSession } = useAuthSession();
  const [adminTab, setAdminTab] = useState<"panel" | "clientes">("panel");

  if (!session) {
    return <LoginScreen onLogin={saveSession} />;
  }

  function handleLogout() {
    logout(session!.token).catch(() => {});
    clearSession();
  }

  return (
    <div className="gps-app">
      <header className="gps-topbar">
        <strong>GPS</strong>
        <div className="gps-topbar-right">
          <span className="gps-muted">
            {session.user.fullName ?? session.user.username} · {ROLE_LABELS[session.user.role]}
          </span>
          <button type="button" className="gps-button-secondary" onClick={handleLogout}>
            Salir
          </button>
        </div>
      </header>

      {session.user.role === "admin" && (
        <div className="gps-persona-tabs-wrap">
          <nav className="gps-persona-tabs">
            <button type="button" className={adminTab === "panel" ? "is-active" : ""} onClick={() => setAdminTab("panel")}>
              Panel
            </button>
            <button type="button" className={adminTab === "clientes" ? "is-active" : ""} onClick={() => setAdminTab("clientes")}>
              Clientes
            </button>
          </nav>
          {adminTab === "panel" ? <AdminDashboard session={session} /> : <ClientAssignScreen session={session} />}
        </div>
      )}
      {session.user.role === "repartidor" && <RepartidorTabsScreen session={session} />}
    </div>
  );
}
