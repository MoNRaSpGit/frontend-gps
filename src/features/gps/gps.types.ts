export type GpsRole = "admin" | "repartidor";

export type GpsUser = { id: number; username: string; fullName: string | null; role: GpsRole };

export type GpsSession = { user: GpsUser; token: string };

export type GpsClient = { id: number; name: string; address: string; lat: number; lng: number };

export type GpsPersona = { key: string; fullName: string };

export type GpsRepartidorStatus = { username: string; fullName: string | null; confirmed: boolean; pickCount: number };

export type GpsFinalRouteItem = { client: GpsClient; repartidorUsername: string; repartidorName: string | null };

export type GpsFinalRoute = { ready: boolean; status: GpsRepartidorStatus[]; items: GpsFinalRouteItem[] };
