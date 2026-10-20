import { useEffect, useMemo, useState } from "react";
import { fetchClients, fetchFinalRoute, fetchMyPicks, fetchStatus, resetAllPicks, resetPicks, submitPicks } from "../gps.client";
import type { GpsClient, GpsFinalRoute, GpsPersona, GpsRepartidorStatus, GpsSession } from "../gps.types";
import { RouteMapModal } from "./RouteMapModal";
import type { RoutePoint } from "./RouteMapModal";

// Pedido explicito (20/10/2026): ya no hay una cuenta por persona -- el
// login es generico y esta pantalla se renderiza una vez por pestaña
// (Martín/Ana/Juan/Pedro), recibiendo cual le toca por prop en vez de
// sacarlo de la sesion.
export function RepartidorScreen({ session, persona }: { session: GpsSession; persona: GpsPersona }) {
  const [clients, setClients] = useState<GpsClient[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState<GpsRepartidorStatus[]>([]);
  const [finalRoute, setFinalRoute] = useState<GpsFinalRoute | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewPoints, setPreviewPoints] = useState<RoutePoint[] | null>(null);
  const [showFinalRoute, setShowFinalRoute] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resettingAll, setResettingAll] = useState(false);

  function loadAll() {
    Promise.all([fetchClients(session.token, persona.key), fetchMyPicks(session.token, persona.key), fetchStatus(session.token)])
      .then(([clientsResult, myPicks, statusResult]) => {
        setClients(clientsResult);
        setSelectedIds(new Set(myPicks.clientIds));
        setConfirmed(myPicks.clientIds.length > 0 && statusResult.some((entry) => entry.username === persona.key && entry.confirmed));
        setStatus(statusResult);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los datos."));
  }

  useEffect(() => {
    loadAll();
    const intervalId = window.setInterval(loadAll, 15000);
    return () => window.clearInterval(intervalId);
  }, [session.token, persona.key]);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) => client.name.toLowerCase().includes(term) || client.address.toLowerCase().includes(term));
  }, [clients, search]);

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
    submitPicks(session.token, persona.key, Array.from(selectedIds))
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

  // Pedido explicito (14/11/2026): "me equivoqué, dejame editar la ruta" --
  // deshace la confirmación en el backend, pero deja los checkboxes tal
  // cual estaban (no reinicia la seleccion), asi solo tiene que corregir
  // el error puntual y volver a generar.
  function handleEditar() {
    if (isEditing) return;
    setIsEditing(true);
    setError("");
    resetPicks(session.token, persona.key)
      .then(() => {
        setConfirmed(false);
        setPreviewPoints(null);
        loadAll();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo habilitar la edición."))
      .finally(() => setIsEditing(false));
  }

  // Pedido explicito: cualquiera (no solo el admin) puede reiniciar la
  // ruta de las 4 pestañas, es una demo.
  function handleResetAll() {
    setResettingAll(true);
    setError("");
    resetAllPicks(session.token)
      .then(() => {
        setConfirmingReset(false);
        setPreviewPoints(null);
        setShowFinalRoute(false);
        loadAll();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron reiniciar las rutas."))
      .finally(() => setResettingAll(false));
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
        <h1>Clientes de {persona.fullName}</h1>
        {confirmed && previewPoints && (
          <button type="button" className="gps-button-secondary" onClick={() => setPreviewPoints(previewPoints)}>
            Ver ruta preliminar
          </button>
        )}
      </header>

      {error && <p className="gps-error">{error}</p>}

      <p className="gps-muted">
        {confirmed
          ? `Ya confirmó su selección (${selectedIds.size} cliente(s)). Tocá "Editar selección" si se equivocó.`
          : "Buscá y tildá a los clientes a los que le vendió hoy, y generá la ruta."}
      </p>

      <input
        className="gps-search-input"
        type="search"
        placeholder="Buscar cliente por nombre o dirección…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <ul className="gps-list gps-client-pick-list">
        {filteredClients.map((client) => (
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
        {filteredClients.length === 0 && <p className="gps-muted">Sin resultados para "{search}".</p>}
      </ul>

      <div className="gps-bottom-bar">
        <div>
          <span className="gps-muted">{selectedIds.size} cliente(s) tildado(s)</span>
        </div>
        <div className="gps-bottom-bar-actions">
          {confirmed && (
            <button type="button" className="gps-button-secondary" onClick={handleEditar} disabled={isEditing}>
              {isEditing ? "Editando…" : "Editar selección"}
            </button>
          )}
          <button type="button" className="gps-button" onClick={handleGenerarRuta} disabled={confirmed || isSubmitting || selectedIds.size === 0}>
            {confirmed ? "Ruta generada" : isSubmitting ? "Generando…" : "Generar ruta"}
          </button>
        </div>
      </div>

      <div className="gps-screen-header">
        <h2 className="gps-section-title">Estado del equipo</h2>
        {!confirmingReset ? (
          <button type="button" className="gps-button-warning" onClick={() => setConfirmingReset(true)}>
            Reiniciar rutas
          </button>
        ) : (
          <div className="gps-reset-confirm">
            <span className="gps-muted">¿Reiniciar la selección de las 4 pestañas?</span>
            <button type="button" className="gps-button-secondary" onClick={() => setConfirmingReset(false)} disabled={resettingAll}>
              Cancelar
            </button>
            <button type="button" className="gps-button" onClick={handleResetAll} disabled={resettingAll}>
              {resettingAll ? "Reiniciando…" : "Sí, reiniciar"}
            </button>
          </div>
        )}
      </div>
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
        <p className="gps-muted">La ruta final se habilita cuando las 4 confirmaron su selección.</p>
      )}

      {previewPoints && !showFinalRoute && (
        <RouteMapModal title={`Ruta preliminar de ${persona.fullName} (demo)`} points={previewPoints} onClose={() => setPreviewPoints(null)} />
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
