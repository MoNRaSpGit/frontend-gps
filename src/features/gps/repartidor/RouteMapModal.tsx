import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { computeRoute, GpsQuotaError } from "../gps.client";
import type { GpsRoute } from "../gps.types";

export type RoutePoint = { id: number; lat: number; lng: number; title: string; subtitle: string; tag?: string };

// Deposito/punto de partida ficticio (centro de Montevideo), para que la
// ruta siempre arranque del mismo lugar. El backend usa el mismo punto
// (gps-routing.service.ts).
const DEPOT = { name: "Depósito", lat: -34.9011, lng: -56.1645 };

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
  onClose
}: {
  title: string;
  points: RoutePoint[];
  token: string;
  calculate?: boolean;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RouteState>(calculate ? { kind: "loading" } : { kind: "preview" });

  const pointsKey = points.map((point) => point.id).join(",");

  useEffect(() => {
    if (!calculate) return;
    let cancelled = false;
    computeRoute(
      token,
      points.map((point) => point.id)
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
            {state.kind === "loading" && <p className="gps-muted gps-map-note">Calculando la mejor ruta…</p>}
            {state.kind === "preview" && (
              <p className="gps-muted gps-map-note">Vista previa de los clientes elegidos. El orden y el recorrido por calles se calculan en la ruta final.</p>
            )}
            {state.kind === "ready" && (
              <p className="gps-muted gps-map-note">
                Ruta óptima por calles: <strong>{state.route.distanceKm.toLocaleString("es-UY")} km</strong>, unos{" "}
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
            <p className="gps-muted gps-route-start">Salida: Depósito</p>
            <ol className="gps-route-order">
              {ordered.map((point) => (
                <li key={point.id}>
                  {point.tag ? <strong>[{point.tag}]</strong> : null} {point.title} — {point.subtitle}
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
