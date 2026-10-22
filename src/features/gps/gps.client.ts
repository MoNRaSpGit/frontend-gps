import { API_BASE_URL } from "../../shared/config/api";
import type { GpsClient, GpsFinalRoute, GpsPersona, GpsRepartidorStatus, GpsRoute, GpsSession, GpsUsage, GpsUser } from "./gps.types";

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

export function computeRoute(token: string, clientIds: number[]) {
  return request<GpsRoute>("/route", token, { method: "POST", body: JSON.stringify({ clientIds }) });
}

export function fetchUsage(token: string) {
  return request<GpsUsage>("/usage", token);
}
