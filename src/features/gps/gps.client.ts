import { API_BASE_URL } from "../../shared/config/api";
import type { GpsClient, GpsFinalRoute, GpsRepartidorStatus, GpsSession, GpsUser } from "./gps.types";

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

export function loginByPassword(password: string) {
  return request<GpsSession>("/auth/login-password", undefined, { method: "POST", body: JSON.stringify({ password }) });
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

export function fetchMyPicks(token: string) {
  return request<{ clientIds: number[] }>("/picks/me", token);
}

export function submitPicks(token: string, clientIds: number[]) {
  return request<{ alreadyConfirmed: boolean }>("/picks", token, { method: "POST", body: JSON.stringify({ clientIds }) });
}

export function resetPicks(token: string) {
  return request<{ ok: true }>("/picks", token, { method: "DELETE" });
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
