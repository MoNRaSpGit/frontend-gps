import { API_BASE_URL } from "../../shared/config/api";
import type { GpsClient, GpsClientAssignment, GpsFinalRoute, GpsGeneratedFinalRoute, GpsPersona, GpsRepartidorStatus, GpsRoute, GpsSession, GpsUsage, GpsUser } from "./gps.types";

// El backend corto el servicio de rutas por llegar al limite (429): la
// pantalla muestra el cartel de "comunicarse con el proveedor".
export class GpsQuotaError extends Error {}

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
    const message = body?.message || "No se pudo completar la operación.";
    if (response.status === 429) throw new GpsQuotaError(message);
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function login(username: string, password: string) {
  return request<GpsSession>("/auth/login", undefined, { method: "POST", body: JSON.stringify({ username, password }) });
}

export function loginByPassword(password: string) {
  return request<GpsSession>("/auth/login-password", undefined, { method: "POST", body: JSON.stringify({ password }) });
}

export function logout(token: string) {
  return request<{ ok: true }>("/auth/logout", token, { method: "POST" });
}

export function fetchMe(token: string) {
  return request<GpsUser>("/auth/me", token, { method: "POST" });
}

export function fetchPersonas(token: string) {
  return request<GpsPersona[]>("/personas", token);
}

export function fetchClients(token: string, persona?: string) {
  const query = persona ? `?persona=${encodeURIComponent(persona)}` : "";
  return request<GpsClient[]>(`/clients${query}`, token);
}

export function fetchAssignments(token: string) {
  return request<GpsClientAssignment[]>("/clients/assignments", token);
}

// persona null = devolver a "sin asignar".
export function assignClients(token: string, clientIds: number[], persona: string | null) {
  return request<{ updated: number }>("/clients/assign", token, { method: "POST", body: JSON.stringify({ clientIds, persona }) });
}

// "Agregar cliente" a mano (27/10/2026): ubicar la direccion y guardar.
export type GpsGeocodeResult =
  | { found: true; lat: number; lng: number; quality: "puerta" | "esquina" | "calle"; matched: string }
  | { found: false };

export function geocodeAddress(token: string, address: string) {
  return request<GpsGeocodeResult>("/clients/geocode", token, { method: "POST", body: JSON.stringify({ address }) });
}

// Sin lat/lng y geoQuality "ninguna" = cliente sin ubicacion (direccion no
// encontrada): se guarda igual pero no entra en las rutas.
export function createClient(
  token: string,
  data: { name: string; address: string; lat?: number; lng?: number; geoQuality: "puerta" | "esquina" | "calle" | "ninguna" }
) {
  return request<GpsClientAssignment>("/clients", token, { method: "POST", body: JSON.stringify(data) });
}

export function updateClientLocation(
  token: string,
  clientId: number,
  data: { address: string; lat: number; lng: number; geoQuality: "puerta" | "esquina" | "calle" }
) {
  return request<GpsClientAssignment>(`/clients/${clientId}/location`, token, { method: "PATCH", body: JSON.stringify(data) });
}

export function fetchMyPicks(token: string, persona: string) {
  return request<{ clientIds: number[] }>(`/picks/me?persona=${encodeURIComponent(persona)}`, token);
}

export function submitPicks(token: string, persona: string, clientIds: number[]) {
  return request<{ alreadyConfirmed: boolean }>("/picks", token, { method: "POST", body: JSON.stringify({ persona, clientIds }) });
}

export function resetPicks(token: string, persona: string) {
  return request<{ ok: true }>(`/picks?persona=${encodeURIComponent(persona)}`, token, { method: "DELETE" });
}

export function resetAllPicks(token: string) {
  return request<{ ok: true }>("/picks/all", token, { method: "DELETE" });
}

export function fetchStatus(token: string) {
  return request<GpsRepartidorStatus[]>("/picks/status", token);
}

export function fetchFinalRoute(token: string) {
  return request<GpsFinalRoute>("/picks/final", token);
}

// keepOrder: respeta el orden dado (no optimiza, solo dibuja por calles).
export function computeRoute(token: string, clientIds: number[], keepOrder = false) {
  return request<GpsRoute>("/route", token, { method: "POST", body: JSON.stringify({ clientIds, keepOrder }) });
}

// Guarda el orden editado a mano de una ruta final ya generada.
export function saveFinalRouteOrder(token: string, routeId: number, clientIds: number[]) {
  return request<GpsGeneratedFinalRoute>("/final/order", token, { method: "POST", body: JSON.stringify({ routeId, clientIds }) });
}

export function fetchUsage(token: string) {
  return request<GpsUsage>("/usage", token);
}

// Genera la ruta final con lo que ya guardaron, la guarda y reinicia las
// rutas de todos (arranca de cero el siguiente reparto).
export function generateFinalRoute(token: string) {
  return request<GpsGeneratedFinalRoute>("/final/generate", token, { method: "POST" });
}

export function fetchLastFinalRoute(token: string) {
  return request<{ route: GpsGeneratedFinalRoute | null }>("/final/last", token);
}
