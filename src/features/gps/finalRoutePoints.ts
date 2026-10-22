import type { GpsFinalRouteItem } from "./gps.types";
import type { RoutePoint } from "./repartidor/RouteMapModal";

export function finalRoutePoints(items: GpsFinalRouteItem[]): RoutePoint[] {
  return items.map((item) => ({
    id: item.client.id,
    lat: item.client.lat,
    lng: item.client.lng,
    title: item.client.name,
    subtitle: item.client.address,
    tag: item.repartidorName ?? item.repartidorUsername
  }));
}

export function formatGeneratedAt(iso: string) {
  return new Date(iso).toLocaleString("es-UY", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}
