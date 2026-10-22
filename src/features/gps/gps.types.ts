export type GpsRole = "admin" | "repartidor";

export type GpsUser = { id: number; username: string; fullName: string | null; role: GpsRole };

export type GpsSession = { user: GpsUser; token: string };

export type GpsClient = { id: number; name: string; address: string; lat: number; lng: number };

export type GpsPersona = { key: string; fullName: string };

export type GpsRepartidorStatus = { username: string; fullName: string | null; confirmed: boolean; pickCount: number };

export type GpsFinalRouteItem = { client: GpsClient; repartidorUsername: string; repartidorName: string | null };

export type GpsFinalRoute = { ready: boolean; status: GpsRepartidorStatus[]; items: GpsFinalRouteItem[] };

// Ruta optima real calculada por el backend (OpenRouteService).
export type GpsRoute = {
  orderedClientIds: number[];
  // [lat, lng] listo para Leaflet.
  geometry: Array<[number, number]>;
  distanceKm: number;
  durationMin: number;
  fromCache: boolean;
};

export type GpsUsageEntry = {
  service: "optimization" | "directions";
  label: string;
  todayCalls: number;
  dailyLimit: number;
  alertAt: number;
  cutAt: number;
  monthCalls: number;
  status: "ok" | "alerta" | "cortado";
  remoteRemaining: number | null;
  remoteLimit: number | null;
};

export type GpsUsage = { day: string; providerPhone: string; services: GpsUsageEntry[] };

// Ruta final ya generada (queda guardada aunque se reinicien las rutas).
export type GpsGeneratedFinalRoute = {
  id: number;
  dayLabel: string;
  createdAt: string;
  items: GpsFinalRouteItem[];
  missing: string[];
};
