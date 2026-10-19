import { useEffect, useState } from "react";
import { fetchPendingSales, markSaleDelivered } from "../gps.client";
import type { GpsSale, GpsSession } from "../gps.types";
import { RouteMapModal } from "./RouteMapModal";

function formatMoney(amount: number) {
  return `$${amount.toLocaleString("es-UY")}`;
}

export function RepartidorScreen({ session }: { session: GpsSession }) {
  const [sales, setSales] = useState<GpsSale[]>([]);
  const [error, setError] = useState("");
  const [showRoute, setShowRoute] = useState(false);

  function loadPending() {
    fetchPendingSales(session.token)
      .then(setSales)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las entregas."));
  }

  useEffect(() => {
    loadPending();
    const intervalId = window.setInterval(loadPending, 20000);
    return () => window.clearInterval(intervalId);
  }, [session.token]);

  function handleDeliver(saleId: number) {
    markSaleDelivered(session.token, saleId)
      .then(() => setSales((current) => current.filter((sale) => sale.id !== saleId)))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo marcar como entregado."));
  }

  return (
    <section className="gps-screen">
      <header className="gps-screen-header">
        <h1>Entregas pendientes</h1>
        <button type="button" className="gps-button" disabled={sales.length === 0} onClick={() => setShowRoute(true)}>
          Generar ruta
        </button>
      </header>

      {error && <p className="gps-error">{error}</p>}
      {sales.length === 0 && !error && <p className="gps-muted">No hay ventas pendientes de entrega.</p>}

      <ul className="gps-list">
        {sales.map((sale) => (
          <li key={sale.id} className="gps-card gps-delivery-card">
            <div>
              <strong>{sale.clientName}</strong>
              <span className="gps-muted">{sale.clientAddress}</span>
              <span className="gps-muted">
                {sale.items.map((item) => `${item.quantity}× ${item.productName}`).join(", ")} · {formatMoney(sale.total)}
              </span>
            </div>
            <button type="button" className="gps-button-secondary" onClick={() => handleDeliver(sale.id)}>
              Marcar entregado
            </button>
          </li>
        ))}
      </ul>

      {showRoute && <RouteMapModal sales={sales} onClose={() => setShowRoute(false)} />}
    </section>
  );
}
