import { useEffect, useMemo, useState } from "react";
import { createSale, fetchClients, fetchProducts } from "../gps.client";
import type { GpsClient, GpsProduct, GpsSale, GpsSession } from "../gps.types";

type CartLine = { product: GpsProduct; quantity: number };

function formatMoney(amount: number) {
  return `$${amount.toLocaleString("es-UY")}`;
}

export function VendedorScreen({ session }: { session: GpsSession }) {
  const [clients, setClients] = useState<GpsClient[]>([]);
  const [products, setProducts] = useState<GpsProduct[]>([]);
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<GpsClient | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sentSale, setSentSale] = useState<GpsSale | null>(null);

  useEffect(() => {
    Promise.all([fetchClients(session.token), fetchProducts(session.token)])
      .then(([clientsResult, productsResult]) => {
        setClients(clientsResult);
        setProducts(productsResult);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los datos."));
  }, [session.token]);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) => client.name.toLowerCase().includes(term) || client.address.toLowerCase().includes(term));
  }, [clients, search]);

  const total = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  function setQuantity(product: GpsProduct, quantity: number) {
    setCart((current) => {
      if (quantity <= 0) return current.filter((line) => line.product.id !== product.id);
      const exists = current.some((line) => line.product.id === product.id);
      return exists
        ? current.map((line) => (line.product.id === product.id ? { ...line, quantity } : line))
        : [...current, { product, quantity }];
    });
  }

  function resetAll() {
    setSelectedClient(null);
    setCart([]);
    setSearch("");
    setSentSale(null);
    setError("");
  }

  function handleSend() {
    if (!selectedClient || cart.length === 0 || sending) return;
    setSending(true);
    setError("");
    createSale(
      session.token,
      selectedClient.id,
      cart.map((line) => ({ productId: line.product.id, quantity: line.quantity }))
    )
      .then((sale) => setSentSale(sale))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo registrar la venta."))
      .finally(() => setSending(false));
  }

  if (sentSale) {
    return (
      <section className="gps-sent">
        <div className="gps-sent-check">✓</div>
        <h1>Venta registrada</h1>
        <p>
          {sentSale.clientName} · {sentSale.items.length} producto(s) · <strong>{formatMoney(sentSale.total)}</strong>
        </p>
        <p className="gps-muted">Ya le llegó al repartidor para armar la ruta.</p>
        <button type="button" className="gps-button" onClick={resetAll}>
          Nueva venta
        </button>
      </section>
    );
  }

  if (!selectedClient) {
    return (
      <section className="gps-screen">
        <h1>Buscar cliente</h1>
        <input
          autoFocus
          className="gps-search-input"
          placeholder="Nombre o dirección…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {error && <p className="gps-error">{error}</p>}
        <ul className="gps-list">
          {filteredClients.map((client) => (
            <li key={client.id} className="gps-card gps-card--row" onClick={() => setSelectedClient(client)}>
              <div>
                <strong>{client.name}</strong>
                <span className="gps-muted">{client.address}</span>
              </div>
              <span className="gps-chevron">›</span>
            </li>
          ))}
          {filteredClients.length === 0 && <p className="gps-muted">Sin resultados.</p>}
        </ul>
      </section>
    );
  }

  return (
    <section className="gps-screen">
      <div className="gps-card gps-card--selected-client">
        <div>
          <span className="gps-muted">Venta para</span>
          <strong>{selectedClient.name}</strong>
          <span className="gps-muted">{selectedClient.address}</span>
        </div>
        <button type="button" className="gps-button-secondary" onClick={() => setSelectedClient(null)}>
          Cambiar
        </button>
      </div>

      <h2 className="gps-section-title">Productos</h2>
      <ul className="gps-list">
        {products.map((product) => {
          const line = cart.find((item) => item.product.id === product.id);
          return (
            <li key={product.id} className="gps-card gps-card--row">
              <div>
                <strong>{product.name}</strong>
                <span className="gps-muted">{formatMoney(product.price)}</span>
              </div>
              <div className="gps-stepper">
                <button type="button" onClick={() => setQuantity(product, (line?.quantity ?? 0) - 1)} disabled={!line}>
                  −
                </button>
                <span>{line?.quantity ?? 0}</span>
                <button type="button" onClick={() => setQuantity(product, (line?.quantity ?? 0) + 1)}>
                  +
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {error && <p className="gps-error">{error}</p>}

      <div className="gps-bottom-bar">
        <div>
          <span className="gps-muted">{cart.reduce((sum, line) => sum + line.quantity, 0)} unidad(es)</span>
          <strong className="gps-bottom-bar-total">{formatMoney(total)}</strong>
        </div>
        <button type="button" className="gps-button" onClick={handleSend} disabled={cart.length === 0 || sending}>
          {sending ? "Enviando…" : "Confirmar venta"}
        </button>
      </div>
    </section>
  );
}
