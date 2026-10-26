import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient, geocodeAddress, updateClientLocation, type GpsGeocodeResult } from "../gps.client";
import type { GpsClientAssignment, GpsSession } from "../gps.types";

type Props = {
  session: GpsSession;
  // Con client: "Actualizar ubicacion" de ese cliente (no se cambia el
  // nombre). Sin client: alta de un cliente nuevo.
  client?: GpsClientAssignment;
  onClose: () => void;
  onCreated: (client: GpsClientAssignment) => void;
};

const QUALITY_LABELS = { puerta: "puerta exacta", esquina: "en la esquina", calle: "aproximada (sobre la calle)" } as const;

// "Agregar cliente" a mano (27/10/2026, pedido explicito): nombre y
// direccion; "Buscar direccion" la ubica en el mapa (geocodificador
// oficial, no gasta cupo de rutas) y se confirma viendo el pin antes de
// guardar. Queda sin asignar, como cualquier otro cliente.
//
// Si la direccion no se encuentra (ej. "Ruta 35"), en el alta se puede
// guardar igual "sin ubicacion" (pedido explicito 27/10/2026): queda
// marcado y no entra en las rutas hasta actualizarlo.
export function AddClientModal({ session, client, onClose, onCreated }: Props) {
  const isUpdate = Boolean(client);
  const [name, setName] = useState(client?.name ?? "");
  const [address, setAddress] = useState(client?.address ?? "");
  const [notFound, setNotFound] = useState(false);
  const [result, setResult] = useState<Extract<GpsGeocodeResult, { found: true }> | null>(null);
  const [searchedAddress, setSearchedAddress] = useState("");
  const [busy, setBusy] = useState<"search" | "save" | null>(null);
  const [error, setError] = useState("");
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!result || !mapRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([result.lat, result.lng], 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    L.circleMarker([result.lat, result.lng], { radius: 10, color: "#0b5fff", weight: 3, fillColor: "#0b5fff", fillOpacity: 0.35 }).addTo(map);
    return () => {
      map.remove();
    };
  }, [result]);

  function handleSearch(event?: FormEvent) {
    event?.preventDefault();
    if (address.trim().length < 2) return setError("Escribí la dirección (calle y número, o calle y esquina).");
    setBusy("search");
    setError("");
    setResult(null);
    setNotFound(false);
    geocodeAddress(session.token, address.trim())
      .then((found) => {
        if (found.found) {
          setResult(found);
          setSearchedAddress(address.trim());
        } else {
          setNotFound(true);
          setSearchedAddress(address.trim());
          setError("No encontramos esa dirección en Tacuarembó. Probá escribirla de otra forma (ej: \"Catalina 294\" o \"18 de Julio esquina Figueroa\").");
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo buscar la dirección."))
      .finally(() => setBusy(null));
  }

  function handleSave() {
    if (!result) return;
    if (!name.trim()) return setError("Poné el nombre del cliente.");
    setBusy("save");
    setError("");
    const data = { address: searchedAddress, lat: result.lat, lng: result.lng, geoQuality: result.quality };
    (client ? updateClientLocation(session.token, client.id, data) : createClient(session.token, { name: name.trim(), ...data }))
      .then(onCreated)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo guardar el cliente."))
      .finally(() => setBusy(null));
  }

  // Alta "sin ubicacion": la direccion no se encontro pero el cliente se
  // guarda igual (no va a poder entrar en una ruta).
  function handleSaveWithoutLocation() {
    if (!name.trim()) return setError("Poné el nombre del cliente.");
    setBusy("save");
    setError("");
    createClient(session.token, { name: name.trim(), address: searchedAddress || address.trim(), geoQuality: "ninguna" })
      .then(onCreated)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo guardar el cliente."))
      .finally(() => setBusy(null));
  }

  return (
    <div className="gps-modal-overlay" onClick={busy ? undefined : onClose}>
      <div className="gps-modal-card gps-add-client" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header className="gps-modal-header">
          <h2>{isUpdate ? `Actualizar ubicación · ${client?.name}` : "Agregar cliente"}</h2>
          <button type="button" className="gps-modal-close" onClick={onClose} disabled={busy !== null}>
            ✕
          </button>
        </header>

        <form className="gps-add-client-form" onSubmit={handleSearch}>
          {!isUpdate && (
            <label className="gps-field">
              <span>Nombre</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej: Almacén Don Pepe" autoFocus />
            </label>
          )}
          <label className="gps-field">
            <span>Dirección (Tacuarembó)</span>
            <input
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
                setResult(null);
                setNotFound(false);
              }}
              placeholder="Ej: Catalina 294 · o · 18 de Julio esquina Figueroa"
            />
          </label>
          <button type="submit" className="gps-button-secondary" disabled={busy !== null}>
            {busy === "search" ? "Buscando…" : "Buscar dirección"}
          </button>
        </form>

        {result && (
          <div className="gps-add-client-result">
            <p>
              <strong>Encontrada:</strong> {result.matched} <span className="gps-muted">· {QUALITY_LABELS[result.quality]}</span>
            </p>
            <div ref={mapRef} className="gps-add-client-map" />
            <p className="gps-muted">Si el punto no es el lugar correcto, cambiá la dirección y buscá de nuevo.</p>
          </div>
        )}

        {error && <p className="gps-error">{error}</p>}

        <div className="gps-confirm-actions">
          <button type="button" className="gps-button-secondary" onClick={onClose} disabled={busy !== null}>
            Cancelar
          </button>
          {notFound && !isUpdate && (
            <button type="button" className="gps-button-warning" onClick={handleSaveWithoutLocation} disabled={busy !== null}>
              Guardar sin ubicación
            </button>
          )}
          <button type="button" className="gps-button" onClick={handleSave} disabled={!result || busy !== null}>
            {busy === "save" ? "Guardando…" : isUpdate ? "Guardar ubicación" : "Guardar cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}
