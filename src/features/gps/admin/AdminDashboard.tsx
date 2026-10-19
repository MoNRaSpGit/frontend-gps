import { useEffect, useState } from "react";
import { fetchClients, fetchPendingSales, fetchProducts } from "../gps.client";
import type { GpsSale, GpsSession } from "../gps.types";

function formatMoney(amount: number) {
  return `$${amount.toLocaleString("es-UY")}`;
}

export function AdminDashboard({ session }: { session: GpsSession }) {
  const [clientCount, setClientCount] = useState<number | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [pendingSales, setPendingSales] = useState<GpsSale[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetchClients(session.token), fetchProducts(session.token), fetchPendingSales(session.token)])
      .then(([clients, products, sales]) => {
        setClientCount(clients.length);
        setProductCount(products.length);
        setPendingSales(sales);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el resumen."));
  }, [session.token]);

  const pendingTotal = pendingSales.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <section className="gps-screen">
      <h1>Resumen</h1>
      {error && <p className="gps-error">{error}</p>}

      <div className="gps-stat-grid">
        <div className="gps-stat-card">
          <span className="gps-muted">Clientes</span>
          <strong>{clientCount ?? "—"}</strong>
        </div>
        <div className="gps-stat-card">
          <span className="gps-muted">Productos</span>
          <strong>{productCount ?? "—"}</strong>
        </div>
        <div className="gps-stat-card">
          <span className="gps-muted">Ventas pendientes</span>
          <strong>{pendingSales.length}</strong>
        </div>
        <div className="gps-stat-card">
          <span className="gps-muted">Total pendiente</span>
          <strong>{formatMoney(pendingTotal)}</strong>
        </div>
      </div>

      <h2 className="gps-section-title">Pendientes de entrega</h2>
      <ul className="gps-list">
        {pendingSales.map((sale) => (
          <li key={sale.id} className="gps-card gps-card--row">
            <div>
              <strong>{sale.clientName}</strong>
              <span className="gps-muted">{sale.clientAddress}</span>
            </div>
            <span className="gps-muted">{formatMoney(sale.total)}</span>
          </li>
        ))}
        {pendingSales.length === 0 && <p className="gps-muted">No hay ventas pendientes.</p>}
      </ul>
    </section>
  );
}
