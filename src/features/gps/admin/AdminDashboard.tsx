import { useEffect, useState } from "react";
import { fetchClients, fetchFinalRoute, fetchStatus } from "../gps.client";
import type { GpsClient, GpsFinalRoute, GpsRepartidorStatus, GpsSession } from "../gps.types";
import { RouteMapModal } from "../repartidor/RouteMapModal";

export function AdminDashboard({ session }: { session: GpsSession }) {
  const [clients, setClients] = useState<GpsClient[] | null>(null);
  const [status, setStatus] = useState<GpsRepartidorStatus[] | null>(null);
  const [finalRoute, setFinalRoute] = useState<GpsFinalRoute | null>(null);
  const [error, setError] = useState("");
  const [showFinalRoute, setShowFinalRoute] = useState(false);

  function loadAll() {
    Promise.all([fetchClients(session.token), fetchStatus(session.token), fetchFinalRoute(session.token)])
      .then(([clientsResult, statusResult, routeResult]) => {
        setClients(clientsResult);
        setStatus(statusResult);
        setFinalRoute(routeResult);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el resumen."));
  }

  useEffect(() => {
    loadAll();
    const intervalId = window.setInterval(loadAll, 15000);
    return () => window.clearInterval(intervalId);
  }, [session.token]);

  const confirmedCount = status?.filter((entry) => entry.confirmed).length ?? 0;
  const totalPicks = status?.reduce((sum, entry) => sum + entry.pickCount, 0) ?? 0;

  return (
    <section className="gps-screen gps-screen--wide">
      <h1>Panel de control</h1>
      {error && <p className="gps-error">{error}</p>}

      <div className="gps-stat-grid">
        <div className="gps-stat-card">
          <span className="gps-muted">Clientes totales</span>
          <strong>{clients?.length ?? "—"}</strong>
        </div>
        <div className="gps-stat-card">
          <span className="gps-muted">Repartidores confirmados</span>
          <strong>{status ? `${confirmedCount}/${status.length}` : "—"}</strong>
        </div>
        <div className="gps-stat-card">
          <span className="gps-muted">Clientes seleccionados hoy</span>
          <strong>{totalPicks}</strong>
        </div>
        <div className="gps-stat-card">
          <span className="gps-muted">Ruta final</span>
          <strong>{finalRoute?.ready ? "Lista" : "En espera"}</strong>
        </div>
      </div>

      <h2 className="gps-section-title">Estado de hoy</h2>
      <ul className="gps-list">
        {status?.map((entry) => (
          <li key={entry.username} className="gps-card gps-card--row">
            <strong>{entry.fullName ?? entry.username}</strong>
            <span className={`gps-badge ${entry.confirmed ? "gps-badge--entregado" : "gps-badge--pendiente"}`}>
              {entry.confirmed ? `Confirmado (${entry.pickCount} clientes)` : "Pendiente"}
            </span>
          </li>
        ))}
        {status === null && !error && <p className="gps-muted">Cargando…</p>}
      </ul>

      {finalRoute?.ready && (
        <>
          <h2 className="gps-section-title">Ruta final combinada</h2>
          <div className="gps-table-wrap">
            <table className="gps-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Dirección</th>
                  <th>Repartidor</th>
                </tr>
              </thead>
              <tbody>
                {finalRoute.items.map((item) => (
                  <tr key={`${item.repartidorUsername}-${item.client.id}`}>
                    <td>{item.client.name}</td>
                    <td className="gps-table-address">{item.client.address}</td>
                    <td>{item.repartidorName ?? item.repartidorUsername}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="gps-button" onClick={() => setShowFinalRoute(true)}>
            Ver en el mapa
          </button>
        </>
      )}

      {showFinalRoute && finalRoute?.ready && (
        <RouteMapModal
          title="Ruta final combinada (demo)"
          points={finalRoute.items.map((item) => ({
            id: item.client.id,
            lat: item.client.lat,
            lng: item.client.lng,
            title: item.client.name,
            subtitle: item.client.address,
            tag: item.repartidorName ?? item.repartidorUsername
          }))}
          onClose={() => setShowFinalRoute(false)}
        />
      )}
    </section>
  );
}
