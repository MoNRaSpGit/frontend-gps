import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { computeRoute, GpsQuotaError } from "../gps.client";
import type { GpsRoute } from "../gps.types";

export type RoutePoint = { id: number; lat: number; lng: number; title: string; subtitle: string; tag?: string };

// Punto de partida: la distribuidora en Olimpia Pintos 86, Tacuarembo
// (22/10/2026, "por ahora"). El backend usa el mismo punto
// (gps-routing.service.ts).
const DEPOT = { name: "Distribuidora — Olimpia Pintos 86", lat: -31.714127, lng: -55.989548 };

function numberedIcon(label: string, color: string) {
  return L.divIcon({
    className: "gps-map-pin",
    html: `<span style="background:${color}">${label}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

type RouteState =
  | { kind: "loading" }
  | { kind: "ready"; route: GpsRoute }
  // Se paso del limite del servicio: cartel grande, sin ruta real.
  | { kind: "quota"; message: string }
  // Cualquier otra falla: se muestra igual el mapa con lineas rectas.
  | { kind: "error"; message: string }
  // Vista previa sin calcular (no gasta llamadas).
  | { kind: "preview" };

// Ruta optima REAL (22/10/2026): el backend calcula el orden de visita y
// el recorrido por calles con OpenRouteService. Abrir el mapa de nuevo con
// los mismos clientes no gasta llamadas (el backend guarda la ruta).
// calculate=false (vista previa de un repartidor): NO llama al servicio,
// solo muestra los pines -- pedido explicito: la llamada se hace una sola
// vez, para la ruta final.
export function RouteMapModal({
  title,
  points,
  token,
  calculate = true,
  keepOrder = false,
  onSaveOrder,
  onClose
}: {
  title: string;
  points: RoutePoint[];
  token: string;
  calculate?: boolean;
  // true = los puntos ya vienen en el orden elegido a mano.
  keepOrder?: boolean;
  // Si viene, se puede editar el orden y rehacer la ruta (ruta final).
  onSaveOrder?: (clientIds: number[]) => Promise<void>;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RouteState>(calculate ? { kind: "loading" } : { kind: "preview" });

  // Edicion del orden (23/10/2026, pedido explicito: p.ej. el cliente 2
  // todavia no abrio y se quiere pasar para despues). null = sin editar.
  const [editingIds, setEditingIds] = useState<number[] | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");

  const pointsKey = `${keepOrder ? "fijo" : "opt"}:${points.map((point) => point.id).join(",")}`;

  useEffect(() => {
    if (!calculate) return;
    let cancelled = false;
    setState({ kind: "loading" });
    computeRoute(
      token,
      points.map((point) => point.id),
      keepOrder
    )
      .then((route) => {
        if (!cancelled) setState({ kind: "ready", route });
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "No se pudo calcular la ruta.";
        setState(error instanceof GpsQuotaError ? { kind: "quota", message } : { kind: "error", message });
      });
    return () => {
      cancelled = true;
    };
    // pointsKey resume los clientes: volver a pedir solo si cambian.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, pointsKey, calculate]);

  // Orden de visita: el calculado si hay ruta real, si no el de la lista.
  const ordered =
    state.kind === "ready"
      ? state.route.orderedClientIds.map((id) => points.find((point) => point.id === id)).filter((point): point is RoutePoint => Boolean(point))
      : points;

  function moveEditing(index: number, delta: number) {
    setEditingIds((current) => {
      if (!current) return current;
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function sendToEnd(index: number) {
    setEditingIds((current) => {
      if (!current) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      return [...next, moved];
    });
  }

  // Rehacer ruta: guarda el orden y el mapa se vuelve a dibujar con ese
  // orden (1 llamada de recorrido por calles, ninguna de optimizacion).
  function handleRedo() {
    if (!editingIds || !onSaveOrder) return;
    setSavingOrder(true);
    setOrderError("");
    onSaveOrder(editingIds)
      .then(() => setEditingIds(null))
      .catch((error) => setOrderError(error instanceof Error ? error.message : "No se pudo guardar el orden."))
      .finally(() => setSavingOrder(false));
  }

  const canEdit = Boolean(onSaveOrder) && (state.kind === "ready" || state.kind === "error") && ordered.length > 1;
  const orderChanged = editingIds !== null && editingIds.join(",") !== ordered.map((point) => point.id).join(",");

  useEffect(() => {
    if (!containerRef.current || state.kind === "loading" || state.kind === "quota") return;

    const map = L.map(containerRef.current, { zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19
    }).addTo(map);

    L.marker([DEPOT.lat, DEPOT.lng], { icon: numberedIcon("D", "#0b5fff") }).addTo(map).bindPopup(DEPOT.name);
    ordered.forEach((point, index) => {
      L.marker([point.lat, point.lng], { icon: numberedIcon(String(index + 1), "#16a34a") })
        .addTo(map)
        .bindPopup(`${index + 1}. ${point.title}<br/>${point.subtitle}`);
    });

    const line: Array<[number, number]> =
      state.kind === "ready"
        ? state.route.geometry
        : [[DEPOT.lat, DEPOT.lng], ...ordered.map((point): [number, number] => [point.lat, point.lng])];
    // Recorrido real por calles: linea llena. Sin ruta real: punteada.
    L.polyline(line, state.kind === "ready" ? { color: "#0b5fff", weight: 5, opacity: 0.85 } : { color: "#0b5fff", weight: 4, dashArray: "8 6", opacity: 0.7 }).addTo(map);

    map.fitBounds(L.latLngBounds(line), { padding: [40, 40] });

    return () => {
      map.remove();
    };
    // ordered depende de state y points (ya cubiertos).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, pointsKey]);

  return (
    <div className="gps-modal-overlay" onClick={onClose}>
      <div className="gps-modal-card gps-modal-card--map" onClick={(event) => event.stopPropagation()}>
        <header className="gps-modal-header">
          <h2>{title}</h2>
          <button type="button" className="gps-modal-close" onClick={onClose}>
            ✕
          </button>
        </header>

        {state.kind === "quota" ? (
          // Corte por limite (pedido explicito 22/10/2026): cartel bien
          // visible, sin hacer mas llamadas.
          <div className="gps-quota-banner" role="alert">
            <strong>Se alcanzó el límite del servicio de rutas</strong>
            <p>Por hoy no se pueden calcular más rutas. Por favor, comunicarse con el proveedor:</p>
            <a className="gps-quota-phone" href="tel:092945696">
              092 945 696
            </a>
          </div>
        ) : (
          <>
            {state.kind === "loading" && <RouteLoader />}
            {state.kind === "preview" && (
              <p className="gps-muted gps-map-note">Vista previa de los clientes elegidos. El orden y el recorrido por calles se calculan en la ruta final.</p>
            )}
            {state.kind === "ready" && (
              <p className="gps-muted gps-map-note">
                {keepOrder ? "Ruta por calles en el orden elegido" : "Ruta óptima por calles"}: <strong>{state.route.distanceKm.toLocaleString("es-UY")} km</strong>, unos{" "}
                <strong>{state.route.durationMin} min</strong> de manejo (sin contar las paradas).
              </p>
            )}
            {state.kind === "error" && (
              <p className="gps-error gps-map-note">
                No se pudo calcular la ruta real ({state.message}). Se muestran los puntos unidos en línea recta.
              </p>
            )}
            {state.kind !== "loading" && <div ref={containerRef} className="gps-map-container" />}
            {/* El deposito va aparte de la lista numerada: asi el numero de
                cada cliente coincide con el del pin en el mapa. */}
            <p className="gps-muted gps-route-start">Salida: {DEPOT.name}</p>
            {editingIds ? (
              <>
                <p className="gps-muted">Cambiá el orden de las paradas y tocá “Rehacer ruta”.</p>
                <ol className="gps-route-order gps-route-order--editing">
                  {editingIds.map((id, index) => {
                    const point = points.find((candidate) => candidate.id === id);
                    if (!point) return null;
                    // Numero de parada visible al mover (pedido 22/10/2026):
                    // el nuevo y, si cambio, el que tenia en la ruta.
                    const before = ordered.findIndex((candidate) => candidate.id === id) + 1;
                    return (
                      <li key={id}>
                        <span className="gps-route-edit-number">{index + 1}</span>
                        <span className="gps-route-edit-text">
                          {point.tag ? <strong>[{point.tag}]</strong> : null} {point.title} — {point.subtitle}
                          {before !== index + 1 && <span className="gps-route-edit-before"> (antes {before})</span>}
                        </span>
                        <span className="gps-route-edit-actions">
                          <button type="button" className="gps-route-edit-btn" onClick={() => moveEditing(index, -1)} disabled={index === 0 || savingOrder} aria-label="Subir">
                            ↑
                          </button>
                          <button
                            type="button"
                            className="gps-route-edit-btn"
                            onClick={() => moveEditing(index, 1)}
                            disabled={index === editingIds.length - 1 || savingOrder}
                            aria-label="Bajar"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="gps-route-edit-btn gps-route-edit-btn--wide"
                            onClick={() => sendToEnd(index)}
                            disabled={index === editingIds.length - 1 || savingOrder}
                          >
                            Al final
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ol>
                {orderError && <p className="gps-error">{orderError}</p>}
                <div className="gps-confirm-actions">
                  <button type="button" className="gps-button-secondary" onClick={() => setEditingIds(null)} disabled={savingOrder}>
                    Cancelar
                  </button>
                  <button type="button" className="gps-button" onClick={handleRedo} disabled={!orderChanged || savingOrder}>
                    {savingOrder ? "Rehaciendo…" : "Rehacer ruta"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <ol className="gps-route-order">
                  {ordered.map((point) => (
                    <li key={point.id}>
                      {point.tag ? <strong>[{point.tag}]</strong> : null} {point.title} — {point.subtitle}
                    </li>
                  ))}
                </ol>
                {canEdit && (
                  <button type="button" className="gps-button-secondary" onClick={() => setEditingIds(ordered.map((point) => point.id))}>
                    Editar orden
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Mensajes que van rotando mientras se calcula la ruta.
const LOADING_STEPS = ["Buscando el mejor orden de las paradas…", "Trazando el recorrido por las calles…", "Calculando distancia y tiempo…"];

// Pantalla de espera mientras se calcula la ruta (22/10/2026, pedido
// explicito: "algo mas lindo para la espera de carga"). Ocupa el mismo
// lugar que el mapa: un "mapa" de fondo, un camino que se va dibujando y
// un puntito que lo recorre desde la distribuidora.
function RouteLoader() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => setStep((current) => (current + 1) % LOADING_STEPS.length), 1600);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="gps-route-loader" role="status" aria-live="polite">
      <svg className="gps-route-loader-art" viewBox="0 0 320 180" aria-hidden="true">
        <path
          id="gps-loader-path"
          className="gps-route-loader-path"
          d="M40 140 C 90 140, 80 60, 140 70 S 200 140, 240 100 S 270 40, 285 40"
        />
        <circle className="gps-route-loader-runner" r="6">
          <animateMotion dur="2.4s" repeatCount="indefinite" rotate="auto">
            <mpath href="#gps-loader-path" />
          </animateMotion>
        </circle>
        <g className="gps-route-loader-pin gps-route-loader-pin--start" transform="translate(40 140)">
          <circle r="11" />
          <text y="4">D</text>
        </g>
        <g className="gps-route-loader-pin gps-route-loader-pin--end" transform="translate(285 40)">
          <circle r="11" />
          <text y="4">?</text>
        </g>
      </svg>
      <strong>Calculando la mejor ruta</strong>
      <span className="gps-muted">{LOADING_STEPS[step]}</span>
    </div>
  );
}
