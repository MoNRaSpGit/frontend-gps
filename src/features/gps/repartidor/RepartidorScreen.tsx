import { useEffect, useMemo, useRef, useState } from "react";
import { fetchClients, fetchLastFinalRoute, fetchMyPicks, fetchStatus, generateFinalRoute, resetAllPicks, resetPicks, saveFinalRouteOrder, submitPicks } from "../gps.client";
import { formatGeneratedAt, generatedRouteMap } from "../finalRoutePoints";
import type { GpsClient, GpsGeneratedFinalRoute, GpsPersona, GpsRepartidorStatus, GpsSession } from "../gps.types";
import { RouteMapModal } from "./RouteMapModal";
import type { RoutePoint } from "./RouteMapModal";
import { GpsConfirmModal } from "../GpsConfirmModal";

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
  // Ultima ruta final generada (queda guardada aunque se reinicien las rutas).
  const [finalRoute, setFinalRoute] = useState<GpsGeneratedFinalRoute | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewPoints, setPreviewPoints] = useState<RoutePoint[] | null>(null);
  const [showFinalRoute, setShowFinalRoute] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resettingAll, setResettingAll] = useState(false);
  // Faltan repartidores por guardar: se pregunta antes de generar igual.
  const [confirmingFinal, setConfirmingFinal] = useState(false);
  const [loadingFinal, setLoadingFinal] = useState(false);

  // Bug 22/10/2026 ("le doy a editar y se me desmarcan todos los
  // clientes"): la recarga automatica cada 15 s pisaba lo tildado en
  // pantalla con lo guardado en el servidor -- y al tocar "Editar
  // selección" lo guardado queda vacio, asi que desmarcaba todo. Ahora lo
  // del servidor solo se aplica al entrar a la pestaña o cuando la ruta
  // esta guardada; mientras se edita, manda lo que esta en pantalla.
  const selectionLoadedRef = useRef(false);
  // Si la ruta estaba guardada y de golpe el servidor ya no la tiene, es
  // porque alguien genero la ruta final (o reinicio): se arranca de cero.
  const confirmedRef = useRef(false);

  function loadAll() {
    Promise.all([
      fetchClients(session.token, persona.key),
      fetchMyPicks(session.token, persona.key),
      fetchStatus(session.token),
      fetchLastFinalRoute(session.token)
    ])
      .then(([clientsResult, myPicks, statusResult, lastFinal]) => {
        setClients(clientsResult);
        const serverConfirmed =
          myPicks.clientIds.length > 0 && statusResult.some((entry) => entry.username === persona.key && entry.confirmed);
        if (!selectionLoadedRef.current || myPicks.clientIds.length > 0 || (confirmedRef.current && !serverConfirmed)) {
          setSelectedIds(new Set(myPicks.clientIds));
          selectionLoadedRef.current = true;
        }
        confirmedRef.current = serverConfirmed;
        setConfirmed(serverConfirmed);
        setStatus(statusResult);
        setFinalRoute(lastFinal.route);
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
        confirmedRef.current = true;
        setConfirmed(true);
        setPreviewPoints(
          clients
            .filter((client) => selectedIds.has(client.id))
            .map((client) => ({ id: client.id, lat: client.lat, lng: client.lng, title: client.name, subtitle: client.address }))
        );
        loadAll();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo guardar la ruta."))
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
        confirmedRef.current = false;
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
        // Reiniciar si limpia lo tildado (es lo que se pidio).
        setSelectedIds(new Set());
        setPreviewPoints(null);
        setShowFinalRoute(false);
        loadAll();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron reiniciar las rutas."))
      .finally(() => setResettingAll(false));
  }

  // Ruta final (pedido explicito 22/10/2026): se puede generar apenas UN
  // repartidor guardo su ruta. Si faltan otros, primero se pregunta.
  function handleVerRutaFinal() {
    if (missing.length > 0) {
      setConfirmingFinal(true);
      return;
    }
    openFinalRoute();
  }

  // Genera la ruta final, la guarda y reinicia las rutas de todos (pedido
  // explicito 22/10/2026: "que arranque de 0"). La ruta generada se sigue
  // pudiendo ver con "Ver última ruta final".
  function openFinalRoute() {
    setLoadingFinal(true);
    generateFinalRoute(session.token)
      .then((route) => {
        setFinalRoute(route);
        setConfirmingFinal(false);
        setShowFinalRoute(true);
        confirmedRef.current = false;
        setConfirmed(false);
        setSelectedIds(new Set());
        setPreviewPoints(null);
        loadAll();
      })
      .catch((err) => {
        setConfirmingFinal(false);
        setError(err instanceof Error ? err.message : "No se pudo generar la ruta final.");
      })
      .finally(() => setLoadingFinal(false));
  }

  const anyConfirmed = status.some((entry) => entry.confirmed);
  const missing = status.filter((entry) => !entry.confirmed).map((entry) => entry.fullName ?? entry.username);

  return (
    <section className="gps-screen">
      <header className="gps-screen-header">
        <h1>Clientes de {persona.fullName}</h1>
        {confirmed && previewPoints && (
          <button type="button" className="gps-button-secondary" onClick={() => setPreviewPoints(previewPoints)}>
            Ver en el mapa
          </button>
        )}
      </header>

      {error && <p className="gps-error">{error}</p>}

      <p className="gps-muted">
        {confirmed
          ? `Ya confirmó su selección (${selectedIds.size} cliente(s)). Tocá "Editar selección" si se equivocó.`
          : "Buscá y tildá a los clientes a los que le vendió hoy, y guardá la ruta."}
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
            {confirmed ? "Ruta guardada" : isSubmitting ? "Guardando…" : "Guardar mi ruta"}
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

      {anyConfirmed ? (
        <button type="button" className="gps-button" onClick={handleVerRutaFinal} disabled={loadingFinal}>
          {loadingFinal ? "Cargando…" : "Generar ruta final"}
        </button>
      ) : (
        <p className="gps-muted">La ruta final se habilita apenas un repartidor guarde su ruta.</p>
      )}

      {finalRoute && (
        <div className="gps-last-final">
          <span className="gps-muted">
            Última ruta final: {formatGeneratedAt(finalRoute.createdAt)} · {finalRoute.items.length} cliente(s)
          </span>
          <button type="button" className="gps-button-secondary" onClick={() => setShowFinalRoute(true)}>
            Ver última ruta final
          </button>
        </div>
      )}

      {confirmingFinal && (
        <GpsConfirmModal
          title="Faltan rutas"
          message={`Todavía no guardaron su ruta: ${missing.join(", ")}. ¿Generar igual la ruta final con las que ya están? Después de generarla, las rutas de todos arrancan de cero.`}
          confirmLabel="Sí, generar"
          busy={loadingFinal}
          onConfirm={openFinalRoute}
          onCancel={() => setConfirmingFinal(false)}
        />
      )}

      {previewPoints && !showFinalRoute && (
        <RouteMapModal
          title={`Clientes de ${persona.fullName}`}
          points={previewPoints}
          token={session.token}
          calculate={false}
          onClose={() => setPreviewPoints(null)}
        />
      )}

      {showFinalRoute && finalRoute && (
        <RouteMapModal
          title={`Ruta final · ${formatGeneratedAt(finalRoute.createdAt)}`}
          token={session.token}
          {...generatedRouteMap(finalRoute)}
          onSaveOrder={(clientIds) => saveFinalRouteOrder(session.token, finalRoute.id, clientIds).then(setFinalRoute)}
          onClose={() => setShowFinalRoute(false)}
        />
      )}
    </section>
  );
}
