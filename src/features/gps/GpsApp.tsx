import { AdminDashboard } from "./admin/AdminDashboard";
import { LoginScreen } from "./auth/LoginScreen";
import { useAuthSession } from "./auth/useAuthSession";
import { logout } from "./gps.client";
import { RepartidorScreen } from "./repartidor/RepartidorScreen";

const ROLE_LABELS = { admin: "Admin", repartidor: "Repartidor" } as const;

export function GpsApp() {
  const { session, saveSession, clearSession } = useAuthSession();

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

      {session.user.role === "admin" && <AdminDashboard session={session} />}
      {session.user.role === "repartidor" && <RepartidorScreen session={session} />}
    </div>
  );
}
