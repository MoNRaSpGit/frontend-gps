import { useEffect, useState } from "react";
import { assignClients, fetchAssignments, fetchPersonas } from "../gps.client";
import type { GpsClientAssignment, GpsPersona, GpsSession } from "../gps.types";

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Pestaña "Clientes" (22/10/2026, pedido explicito): se elige un
// repartidor y se le van tocando clientes; cada uno que se toca pasa a ser
// de ese repartidor y desaparece de "Sin asignar", asi la lista se achica
// y es mas facil encontrar los que faltan. Se puede devolver con "Quitar".
export function ClientAssignScreen({ session }: { session: GpsSession }) {
  const [personas, setPersonas] = useState<GpsPersona[]>([]);
  const [clients, setClients] = useState<GpsClientAssignment[] | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetchPersonas(session.token), fetchAssignments(session.token)])
      .then(([personaList, clientList]) => {
        setPersonas(personaList);
        setClients(clientList);
        setActiveKey((current) => current ?? personaList[0]?.key ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los clientes."));
  }, [session.token]);

  // Se mueve en pantalla al instante y despues se guarda; si falla, vuelve
  // a donde estaba.
  function moveClient(clientId: number, persona: string | null) {
    const previous = clients?.find((client) => client.id === clientId)?.assignedUsername ?? null;
    const setOwner = (owner: string | null) =>
      setClients((list) => list?.map((client) => (client.id === clientId ? { ...client, assignedUsername: owner } : client)) ?? list);
    setOwner(persona);
    setError("");
    assignClients(session.token, [clientId], persona).catch((err) => {
      setOwner(previous);
      setError(err instanceof Error ? err.message : "No se pudo guardar el cambio.");
    });
  }

  if (!clients || !activeKey) {
    return (
      <section className="gps-screen">
        {error ? <p className="gps-error">{error}</p> : <p className="gps-muted">Cargando clientes…</p>}
      </section>
    );
  }

  const activePersona = personas.find((persona) => persona.key === activeKey);
  const query = normalize(search.trim());
  const matches = (client: GpsClientAssignment) => !query || normalize(`${client.name} ${client.address}`).includes(query);
  const unassigned = clients.filter((client) => !client.assignedUsername && matches(client));
  const mine = clients.filter((client) => client.assignedUsername === activeKey && matches(client));
  const totalUnassigned = clients.filter((client) => !client.assignedUsername).length;
  const countFor = (key: string) => clients.filter((client) => client.assignedUsername === key).length;

  return (
    <section className="gps-screen gps-screen--wide">
      <div className="gps-screen-header">
        <h2 className="gps-section-title">Clientes</h2>
        <span className="gps-muted">
          {clients.length} clientes · {totalUnassigned} sin asignar
        </span>
      </div>
      <p className="gps-muted">Elegí un repartidor y tocá los clientes para dárselos. Los que ya tienen repartidor desaparecen de la lista.</p>

      <div className="gps-assign-personas">
        {personas.map((persona) => (
          <button
            key={persona.key}
            type="button"
            className={`gps-assign-persona ${persona.key === activeKey ? "is-active" : ""}`}
            onClick={() => setActiveKey(persona.key)}
          >
            {persona.fullName}
            <span className="gps-assign-count">{countFor(persona.key)}</span>
          </button>
        ))}
      </div>

      {error && <p className="gps-error">{error}</p>}

      <input
        className="gps-search-input"
        type="search"
        placeholder="Buscar cliente por nombre o dirección…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <div className="gps-assign-columns">
        <div>
          <h3 className="gps-assign-title">Sin asignar ({unassigned.length})</h3>
          <ul className="gps-list gps-assign-list">
            {unassigned.map((client) => (
              <li key={client.id}>
                <button type="button" className="gps-card gps-assign-row" onClick={() => moveClient(client.id, activeKey)}>
                  <span className="gps-assign-text">
                    <strong>{client.name}</strong>
                    <span className="gps-muted">
                      {client.address}
                      {client.geoQuality === "calle" && <em className="gps-assign-approx"> · ubicación aproximada</em>}
                    </span>
                  </span>
                  <span className="gps-assign-action">+ {activePersona?.fullName}</span>
                </button>
              </li>
            ))}
            {unassigned.length === 0 && (
              <p className="gps-muted">{query ? `Sin resultados para "${search}".` : "No quedan clientes sin asignar."}</p>
            )}
          </ul>
        </div>

        <div>
          <h3 className="gps-assign-title">
            Clientes de {activePersona?.fullName} ({mine.length})
          </h3>
          <ul className="gps-list gps-assign-list">
            {mine.map((client) => (
              <li key={client.id} className="gps-card gps-assign-row is-mine">
                <span className="gps-assign-text">
                  <strong>{client.name}</strong>
                  <span className="gps-muted">{client.address}</span>
                </span>
                <button type="button" className="gps-button-secondary gps-assign-remove" onClick={() => moveClient(client.id, null)}>
                  Quitar
                </button>
              </li>
            ))}
            {mine.length === 0 && <p className="gps-muted">Todavía no tiene clientes. Tocá uno de la lista para dárselo.</p>}
          </ul>
        </div>
      </div>
    </section>
  );
}
