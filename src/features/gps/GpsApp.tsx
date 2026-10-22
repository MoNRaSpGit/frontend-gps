import { useState } from "react";
import { AdminDashboard } from "./admin/AdminDashboard";
import { LoginScreen } from "./auth/LoginScreen";
import { useAuthSession } from "./auth/useAuthSession";
import { ClientAssignScreen } from "./clientes/ClientAssignScreen";
import { logout } from "./gps.client";
import { RepartidorTabsScreen } from "./repartidor/RepartidorTabsScreen";
import { UserMenu } from "./UserMenu";

// Navegacion del encabezado (22/10/2026, pedido explicito): cada seccion
// es aparte -- "Operarios" (Martín/Ana/Juan/Pedro y su seleccion del dia) y
// "Clientes" (repartir clientes entre operarios). El admin tiene "Panel"
// en lugar de "Operarios".
type View = "panel" | "operarios" | "clientes";

const NAV: Record<"admin" | "repartidor", Array<{ view: View; label: string }>> = {
  admin: [
    { view: "panel", label: "Panel" },
    { view: "clientes", label: "Clientes" }
  ],
  repartidor: [
    { view: "operarios", label: "Operarios" },
    { view: "clientes", label: "Clientes" }
  ]
};

export function GpsApp() {
  const { session, saveSession, clearSession } = useAuthSession();
  const [view, setView] = useState<View | null>(null);

  if (!session) {
    return <LoginScreen onLogin={saveSession} />;
  }

  function handleLogout() {
    logout(session!.token).catch(() => {});
    setView(null);
    clearSession();
  }

  const nav = NAV[session.user.role];
  const activeView = view && nav.some((item) => item.view === view) ? view : nav[0].view;

  return (
    <div className="gps-app">
      <header className="gps-topbar">
        <strong className="gps-topbar-brand">GPS</strong>
        <nav className="gps-topnav">
          {nav.map((item) => (
            <button
              key={item.view}
              type="button"
              className={item.view === activeView ? "is-active" : ""}
              onClick={() => setView(item.view)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <UserMenu user={session.user} onLogout={handleLogout} />
      </header>

      {activeView === "panel" && <AdminDashboard session={session} />}
      {activeView === "operarios" && <RepartidorTabsScreen session={session} />}
      {activeView === "clientes" && <ClientAssignScreen session={session} />}
    </div>
  );
}
