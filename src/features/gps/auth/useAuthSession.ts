import { useCallback, useState } from "react";
import type { GpsSession } from "../gps.types";

const SESSION_STORAGE_KEY = "gps-session";

function loadStoredSession(): GpsSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GpsSession) : null;
  } catch {
    return null;
  }
}

export function useAuthSession() {
  const [session, setSession] = useState<GpsSession | null>(() => loadStoredSession());

  const saveSession = useCallback((next: GpsSession) => {
    setSession(next);
    try {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
    try {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { session, saveSession, clearSession };
}
