import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

export type RoutePoint = { id: number; lat: number; lng: number; title: string; subtitle: string; tag?: string };

// Deposito/punto de partida ficticio (centro de Montevideo), para que la
// ruta siempre arranque del mismo lugar.
const DEPOT = { name: "Depósito", lat: -34.9011, lng: -56.1645 };

function numberedIcon(label: string, color: string) {
  return L.divIcon({
    className: "gps-map-pin",
    html: `<span style="background:${color}">${label}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

export function RouteMapModal({ title, points, onClose }: { title: string; points: RoutePoint[]; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: true });
    const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19
    });
    tileLayer.addTo(map);

    const latLngs: Array<[number, number]> = [[DEPOT.lat, DEPOT.lng], ...points.map((point): [number, number] => [point.lat, point.lng])];

    L.marker([DEPOT.lat, DEPOT.lng], { icon: numberedIcon("D", "#0b5fff") }).addTo(map).bindPopup(DEPOT.name);
    points.forEach((point, index) => {
      L.marker([point.lat, point.lng], { icon: numberedIcon(String(index + 1), "#16a34a") })
        .addTo(map)
        .bindPopup(`${index + 1}. ${point.title}<br/>${point.subtitle}`);
    });

    // Ruta ficticia: solo une los puntos en linea recta, en el orden en que
    // llegaron -- NO es una ruta real calculada por calles. Es una demo
    // visual, no reemplaza el calculo real con Google/OR-Tools.
    L.polyline(latLngs, { color: "#0b5fff", weight: 4, dashArray: "8 6", opacity: 0.8 }).addTo(map);

    map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });

    return () => {
      map.remove();
    };
  }, [points]);

  return (
    <div className="gps-modal-overlay" onClick={onClose}>
      <div className="gps-modal-card gps-modal-card--map" onClick={(event) => event.stopPropagation()}>
        <header className="gps-modal-header">
          <h2>{title}</h2>
          <button type="button" className="gps-modal-close" onClick={onClose}>
            ✕
          </button>
        </header>
        <p className="gps-muted gps-map-note">
          Orden ficticio solo para mostrar el circuito — todavía no calcula la ruta óptima real.
        </p>
        <div ref={containerRef} className="gps-map-container" />
        <ol className="gps-route-order">
          <li>Depósito (salida)</li>
          {points.map((point) => (
            <li key={point.id}>
              {point.tag ? <strong>[{point.tag}]</strong> : null} {point.title} — {point.subtitle}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
