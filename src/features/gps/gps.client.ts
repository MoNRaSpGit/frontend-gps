import { API_BASE_URL } from "../../shared/config/api";
import type { GpsClient, GpsProduct, GpsSale, GpsSession, GpsUser } from "./gps.types";

function buildUrl(path: string) {
  return `${API_BASE_URL}/api/v1/gps${path}`;
}

async function request<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || "No se pudo completar la operación.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function login(username: string, password: string) {
  return request<GpsSession>("/auth/login", undefined, { method: "POST", body: JSON.stringify({ username, password }) });
}

export function logout(token: string) {
  return request<{ ok: true }>("/auth/logout", token, { method: "POST" });
}

export function fetchMe(token: string) {
  return request<GpsUser>("/auth/me", token, { method: "POST" });
}

export function fetchClients(token: string) {
  return request<GpsClient[]>("/clients", token);
}

export function fetchProducts(token: string) {
  return request<GpsProduct[]>("/products", token);
}

export function createSale(token: string, clientId: number, items: Array<{ productId: number; quantity: number }>) {
  return request<GpsSale>("/sales", token, { method: "POST", body: JSON.stringify({ clientId, items }) });
}

export function fetchPendingSales(token: string) {
  return request<GpsSale[]>("/sales/pending", token);
}

export function fetchAllSales(token: string) {
  return request<GpsSale[]>("/sales", token);
}

export function markSaleDelivered(token: string, saleId: number, courierName: string) {
  return request<{ ok: true }>(`/sales/${saleId}/deliver`, token, { method: "POST", body: JSON.stringify({ courierName }) });
}
