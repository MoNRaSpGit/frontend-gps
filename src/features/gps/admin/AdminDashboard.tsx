import { useEffect, useMemo, useState } from "react";
import { fetchAllSales, fetchClients, fetchProducts } from "../gps.client";
import type { GpsSale, GpsSession } from "../gps.types";

function formatMoney(amount: number) {
  return `$${amount.toLocaleString("es-UY")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-UY", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

type StatusFilter = "todas" | "pendiente" | "entregado";

export function AdminDashboard({ session }: { session: GpsSession }) {
  const [sales, setSales] = useState<GpsSale[] | null>(null);
  const [clientCount, setClientCount] = useState<number | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todas");
  const [courierFilter, setCourierFilter] = useState<string>("todos");

  useEffect(() => {
    Promise.all([fetchAllSales(session.token), fetchClients(session.token), fetchProducts(session.token)])
      .then(([salesResult, clients, products]) => {
        setSales(salesResult);
        setClientCount(clients.length);
        setProductCount(products.length);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el resumen."));
  }, [session.token]);

  const couriers = useMemo(() => {
    const names = new Set<string>();
    (sales ?? []).forEach((sale) => {
      if (sale.courierName) names.add(sale.courierName);
    });
    return Array.from(names).sort();
  }, [sales]);

  const filteredSales = useMemo(() => {
    return (sales ?? []).filter((sale) => {
      if (statusFilter !== "todas" && sale.status !== statusFilter) return false;
      if (courierFilter !== "todos" && sale.courierName !== courierFilter) return false;
      return true;
    });
  }, [sales, statusFilter, courierFilter]);

  const pendingCount = sales?.filter((sale) => sale.status === "pendiente").length ?? 0;
  const deliveredCount = sales?.filter((sale) => sale.status === "entregado").length ?? 0;
  const totalRevenue = sales?.reduce((sum, sale) => sum + sale.total, 0) ?? 0;

  return (
    <section className="gps-screen gps-screen--wide">
      <h1>Panel de control</h1>
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
          <span className="gps-muted">Pendientes</span>
          <strong>{pendingCount}</strong>
        </div>
        <div className="gps-stat-card">
          <span className="gps-muted">Entregadas</span>
          <strong>{deliveredCount}</strong>
        </div>
        <div className="gps-stat-card">
          <span className="gps-muted">Facturado total</span>
          <strong>{formatMoney(totalRevenue)}</strong>
        </div>
      </div>

      <div className="gps-table-toolbar">
        <h2 className="gps-section-title">Ventas</h2>
        <div className="gps-table-filters">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
            <option value="todas">Todas</option>
            <option value="pendiente">Pendientes</option>
            <option value="entregado">Entregadas</option>
          </select>
          <select value={courierFilter} onChange={(event) => setCourierFilter(event.target.value)}>
            <option value="todos">Todos los repartidores</option>
            {couriers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {sales === null && !error && <p className="gps-muted">Cargando…</p>}

      {sales !== null && (
        <div className="gps-table-wrap">
          <table className="gps-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Dirección</th>
                <th>Productos</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Repartidor</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <tr key={sale.id}>
                  <td>{formatDate(sale.createdAt)}</td>
                  <td>{sale.clientName}</td>
                  <td className="gps-table-address">{sale.clientAddress}</td>
                  <td className="gps-table-items">{sale.items.map((item) => `${item.quantity}× ${item.productName}`).join(", ")}</td>
                  <td>{formatMoney(sale.total)}</td>
                  <td>
                    <span className={`gps-badge gps-badge--${sale.status}`}>
                      {sale.status === "pendiente" ? "Pendiente" : "Entregado"}
                    </span>
                  </td>
                  <td>{sale.courierName ?? <span className="gps-muted">—</span>}</td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="gps-muted gps-table-empty">
                    No hay ventas que coincidan con el filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
