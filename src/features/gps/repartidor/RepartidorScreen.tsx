import { useEffect, useState } from "react";
import { fetchClients, fetchFinalRoute, fetchMyPicks, fetchStatus, submitPicks } from "../gps.client";
import type { GpsClient, GpsFinalRoute, GpsRepartidorStatus, GpsSession } from "../gps.types";
import { RouteMapModal } from "./RouteMapModal";
import type { RoutePoint } from "./RouteMapModal";

export function RepartidorScreen({ session }: { session: GpsSession }) {
  const [clients, setClients] = useState<GpsClient[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState<GpsRepartidorStatus[]>([]);
  const [finalRoute, setFinalRoute] = useState<GpsFinalRoute | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewPoints, setPreviewPoints] = useState<RoutePoint[] | null>(null);
  const [showFinalRoute, setShowFinalRoute] = useState(false);

  function loadAll() {
    Promise.all([fetchClients(session.token), fetchMyPicks(session.token), fetchStatus(session.token)])
      .then(([clientsResult, myPicks, statusResult]) => {
        setClients(clientsResult);
        setSelectedIds(new Set(myPicks.clientIds));
        setConfirmed(myPicks.clientIds.length > 0 && statusResult.some((entry) => entry.username === session.user.username && entry.confirmed));
        setStatus(statusResult);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los datos."));
  }

  useEffect(() => {
    loadAll();
    const intervalId = window.setInterval(loadAll, 15000);
    return () => window.clearInterval(intervalId);
  }, [session.token]);

  function toggleClient(clientId: number) {
    if (confirmed) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }

  function handleGenerarRuta() {
    if (confirmed || isSubmitting || selectedIds.size === 0) return;
    setIsSubmitting(true);
    setError("");
    submitPicks(session.token, Array.from(selectedIds))
      .then(() => {
        setConfirmed(true);
        setPreviewPoints(
          clients
            .filter((client) => selectedIds.has(client.id))
            .map((client) => ({ id: client.id, lat: client.lat, lng: client.lng, title: client.name, subtitle: client.address }))
        );
        loadAll();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo generar la ruta."))
      .finally(() => setIsSubmitting(false));
  }

  function handleVerRutaFinal() {
    fetchFinalRoute(session.token)
      .then((route) => {
        setFinalRoute(route);
        if (route.ready) setShowFinalRoute(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la ruta final."));
  }

  const allConfirmed = status.length > 0 && status.every((entry) => entry.confirmed);

  return (
    <section className="gps-screen">
      <header className="gps-screen-header">
        <h1>Mis clientes de hoy</h1>
        {confirmed && previewPoints && (
          <button type="button" className="gps-button-secondary" onClick={() => setPreviewPoints(previewPoints)}>
            Ver mi ruta preliminar
          </button>
        )}
      </header>

      {error && <p className="gps-error">{error}</p>}

      <p className="gps-muted">
        {confirmed
          ? `Ya confirmaste tu selección (${selectedIds.size} cliente(s)). No se puede modificar.`
          : "Tildá a los clientes a los que le vendiste hoy y generá tu ruta."}
      </p>

      <ul className="gps-list gps-client-pick-list">
        {clients.map((client) => (
          <li key={client.id} className={`gps-card gps-card--row gps-pick-row ${selectedIds.has(client.id) ? "is-picked" : ""}`}>
            <label className="gps-pick-label">
              <input
                type="checkbox"
                checked={selectedIds.has(client.id)}
                disabled={confirmed}
                onChange={() => toggleClient(client.id)}
              />
              <div>
                <strong>{client.name}</strong>
                <span className="gps-muted">{client.address}</span>
              </div>
            </label>
          </li>
        ))}
      </ul>

      <div className="gps-bottom-bar">
        <div>
          <span className="gps-muted">{selectedIds.size} cliente(s) tildado(s)</span>
        </div>
        <button type="button" className="gps-button" onClick={handleGenerarRuta} disabled={confirmed || isSubmitting || selectedIds.size === 0}>
          {confirmed ? "Ruta generada" : isSubmitting ? "Generando…" : "Generar ruta"}
        </button>
      </div>

      <h2 className="gps-section-title">Estado del equipo</h2>
      <ul className="gps-list">
        {status.map((entry) => (
          <li key={entry.username} className="gps-card gps-card--row">
            <strong>{entry.fullName ?? entry.username}</strong>
            <span className={`gps-badge ${entry.confirmed ? "gps-badge--entregado" : "gps-badge--pendiente"}`}>
              {entry.confirmed ? `Confirmado (${entry.pickCount})` : "Pendiente"}
            </span>
          </li>
        ))}
      </ul>

      {allConfirmed ? (
        <button type="button" className="gps-button" onClick={handleVerRutaFinal}>
          Ver ruta final
        </button>
      ) : (
        <p className="gps-muted">La ruta final se habilita cuando los 3 confirmaron su selección.</p>
      )}

      {previewPoints && !showFinalRoute && (
        <RouteMapModal title="Mi ruta preliminar (demo)" points={previewPoints} onClose={() => setPreviewPoints(null)} />
      )}

      {showFinalRoute && finalRoute && (
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
