import { useEffect, useState } from "react";
import { fetchClients, fetchFinalRoute, fetchLastFinalRoute, fetchStatus, fetchUsage, generateFinalRoute, resetAllPicks, saveFinalRouteOrder } from "../gps.client";
import { formatGeneratedAt, generatedRouteMap } from "../finalRoutePoints";
import type { GpsClient, GpsFinalRoute, GpsGeneratedFinalRoute, GpsRepartidorStatus, GpsSession, GpsUsage } from "../gps.types";
import { RouteMapModal } from "../repartidor/RouteMapModal";
import { GpsConfirmModal } from "../GpsConfirmModal";

export function AdminDashboard({ session }: { session: GpsSession }) {
  const [clients, setClients] = useState<GpsClient[] | null>(null);
  const [status, setStatus] = useState<GpsRepartidorStatus[] | null>(null);
  const [finalRoute, setFinalRoute] = useState<GpsFinalRoute | null>(null);
  const [error, setError] = useState("");
  const [showFinalRoute, setShowFinalRoute] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [usage, setUsage] = useState<GpsUsage | null>(null);
  const [confirmingFinal, setConfirmingFinal] = useState(false);
  // Ultima ruta final generada (lo que se dibuja en el mapa).
  const [lastFinal, setLastFinal] = useState<GpsGeneratedFinalRoute | null>(null);
  const [generating, setGenerating] = useState(false);

  function loadAll() {
    Promise.all([fetchClients(session.token), fetchStatus(session.token), fetchFinalRoute(session.token)])
      .then(([clientsResult, statusResult, routeResult]) => {
        setClients(clientsResult);
        setStatus(statusResult);
        setFinalRoute(routeResult);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el resumen."));
    // Aparte: si falla el contador, el resto del panel igual se ve.
    fetchUsage(session.token)
      .then(setUsage)
      .catch(() => setUsage(null));
    fetchLastFinalRoute(session.token)
      .then((result) => setLastFinal(result.route))
      .catch(() => undefined);
  }

  useEffect(() => {
    loadAll();
    const intervalId = window.setInterval(loadAll, 15000);
    return () => window.clearInterval(intervalId);
  }, [session.token]);

  const confirmedCount = status?.filter((entry) => entry.confirmed).length ?? 0;
  const missing = status?.filter((entry) => !entry.confirmed).map((entry) => entry.fullName ?? entry.username) ?? [];
  // Hay algo para la ruta final apenas un repartidor guardo la suya
  // (pedido explicito 22/10/2026), aunque falten otros.
  const hasFinalItems = (finalRoute?.items.length ?? 0) > 0;

  function handleOpenFinalRoute() {
    if (missing.length > 0) setConfirmingFinal(true);
    else handleGenerate();
  }

  // Genera la ruta final, la guarda y reinicia las rutas de todos (pedido
  // explicito 22/10/2026: "que arranque de 0").
  function handleGenerate() {
    setGenerating(true);
    setError("");
    generateFinalRoute(session.token)
      .then((route) => {
        setLastFinal(route);
        setConfirmingFinal(false);
        setShowFinalRoute(true);
        loadAll();
      })
      .catch((err) => {
        setConfirmingFinal(false);
        setError(err instanceof Error ? err.message : "No se pudo generar la ruta final.");
      })
      .finally(() => setGenerating(false));
  }
  const totalPicks = status?.reduce((sum, entry) => sum + entry.pickCount, 0) ?? 0;

  function handleResetAll() {
    setResetting(true);
    setError("");
    resetAllPicks(session.token)
      .then(() => {
        setConfirmingReset(false);
        setShowFinalRoute(false);
        loadAll();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron reiniciar las rutas."))
      .finally(() => setResetting(false));
  }

  return (
    <section className="gps-screen gps-screen--wide">
      <header className="gps-screen-header">
        <h1>Panel de control</h1>
        {!confirmingReset ? (
          <button type="button" className="gps-button-warning" onClick={() => setConfirmingReset(true)}>
            Reiniciar rutas
          </button>
        ) : (
          <div className="gps-reset-confirm">
            <span className="gps-muted">¿Reiniciar la selección de los 3 repartidores?</span>
            <button type="button" className="gps-button-secondary" onClick={() => setConfirmingReset(false)} disabled={resetting}>
              Cancelar
            </button>
            <button type="button" className="gps-button" onClick={handleResetAll} disabled={resetting}>
              {resetting ? "Reiniciando…" : "Sí, reiniciar"}
            </button>
          </div>
        )}
      </header>
      {error && <p className="gps-error">{error}</p>}

      {/* Aviso al administrador (pedido explicito 22/10/2026): a la mitad
          del limite diario de un servicio de rutas aparece este cartel; al
          90% el servicio se corta solo hasta el dia siguiente. */}
      {usage?.services.some((entry) => entry.status !== "ok") && (
        <div className={`gps-usage-alert${usage.services.some((entry) => entry.status === "cortado") ? " gps-usage-alert--cut" : ""}`} role="alert">
          {usage.services
            .filter((entry) => entry.status !== "ok")
            .map((entry) => (
              <p key={entry.service}>
                <strong>{entry.label}:</strong> {entry.todayCalls} de {entry.dailyLimit} llamadas hoy.{" "}
                {entry.status === "cortado"
                  ? "Servicio CORTADO por hoy: las pantallas muestran el aviso de comunicarse con el proveedor."
                  : `Ya se pasó la mitad del límite diario; se corta a las ${entry.cutAt}.`}
              </p>
            ))}
        </div>
      )}

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
          <strong>{finalRoute?.ready ? "Lista" : hasFinalItems ? "Parcial" : "En espera"}</strong>
        </div>
      </div>

      <h2 className="gps-section-title">Servicio de rutas (hoy)</h2>
      <div className="gps-stat-grid">
        {usage?.services.map((entry) => (
          <div key={entry.service} className={`gps-stat-card gps-usage-card gps-usage-card--${entry.status}`}>
            <span className="gps-muted">{entry.label}</span>
            <strong>
              {entry.todayCalls} / {entry.dailyLimit}
            </strong>
            <span className="gps-muted">
              Aviso a {entry.alertAt} · corte a {entry.cutAt} · este mes {entry.monthCalls}
            </span>
          </div>
        ))}
        {!usage && <p className="gps-muted">Cargando el consumo…</p>}
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

      {hasFinalItems && finalRoute && (
        <>
          <h2 className="gps-section-title">Ruta final combinada{finalRoute.ready ? "" : " (parcial)"}</h2>
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
          <button type="button" className="gps-button" onClick={handleOpenFinalRoute} disabled={generating}>
            {generating ? "Generando…" : "Generar ruta final"}
          </button>
          <p className="gps-muted">Al generarla, las rutas de todos los repartidores arrancan de cero.</p>
        </>
      )}

      {confirmingFinal && (
        <GpsConfirmModal
          title="Faltan rutas"
          message={`Todavía no guardaron su ruta: ${missing.join(", ")}. ¿Generar igual la ruta final con las que ya están? Después de generarla, las rutas de todos arrancan de cero.`}
          confirmLabel="Sí, generar"
          busy={generating}
          onConfirm={handleGenerate}
          onCancel={() => setConfirmingFinal(false)}
        />
      )}

      {lastFinal && (
        <div className="gps-last-final">
          <span className="gps-muted">
            Última ruta final: {formatGeneratedAt(lastFinal.createdAt)} · {lastFinal.items.length} cliente(s)
            {lastFinal.missing.length > 0 ? ` · sin: ${lastFinal.missing.join(", ")}` : ""}
          </span>
          <button type="button" className="gps-button-secondary" onClick={() => setShowFinalRoute(true)}>
            Ver última ruta final
          </button>
        </div>
      )}

      {showFinalRoute && lastFinal && (
        <RouteMapModal
          title={`Ruta final · ${formatGeneratedAt(lastFinal.createdAt)}`}
          token={session.token}
          {...generatedRouteMap(lastFinal)}
          onSaveOrder={(clientIds) => saveFinalRouteOrder(session.token, lastFinal.id, clientIds).then(setLastFinal)}
          onClose={() => setShowFinalRoute(false)}
        />
      )}
    </section>
  );
}
