import { useEffect, useState } from "react";
import { fetchPersonas } from "../gps.client";
import type { GpsPersona, GpsSession } from "../gps.types";
import { ClientAssignScreen } from "../clientes/ClientAssignScreen";
import { RepartidorScreen } from "./RepartidorScreen";

// Pestaña extra para repartir los clientes entre los repartidores.
const CLIENTS_TAB = "__clientes";

// Pedido explicito (20/10/2026): un solo login de repartidor, con 4
// pestañas adentro (Martín/Ana/Juan/Pedro) -- cada una con sus propios
// clientes, buscador y "generar ruta".
export function RepartidorTabsScreen({ session }: { session: GpsSession }) {
  const [personas, setPersonas] = useState<GpsPersona[] | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPersonas(session.token)
      .then((list) => {
        setPersonas(list);
        setActiveKey((current) => current ?? list[0]?.key ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las pestañas."));
  }, [session.token]);

  if (error) {
    return (
      <section className="gps-screen">
        <p className="gps-error">{error}</p>
      </section>
    );
  }

  if (!personas || !activeKey) {
    return (
      <section className="gps-screen">
        <p className="gps-muted">Cargando…</p>
      </section>
    );
  }

  const activePersona = personas.find((persona) => persona.key === activeKey) ?? personas[0];

  return (
    <div className="gps-persona-tabs-wrap">
      <nav className="gps-persona-tabs">
        {personas.map((persona) => (
          <button
            key={persona.key}
            type="button"
            className={persona.key === activeKey ? "is-active" : ""}
            onClick={() => setActiveKey(persona.key)}
          >
            {persona.fullName}
          </button>
        ))}
        <button type="button" className={activeKey === CLIENTS_TAB ? "is-active" : ""} onClick={() => setActiveKey(CLIENTS_TAB)}>
          Clientes
        </button>
      </nav>
      {activeKey === CLIENTS_TAB ? (
        <ClientAssignScreen session={session} />
      ) : (
        <RepartidorScreen key={activePersona.key} session={session} persona={activePersona} />
      )}
    </div>
  );
}
