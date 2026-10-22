import type { GpsFinalRouteItem, GpsGeneratedFinalRoute } from "./gps.types";
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

// Puntos de una ruta final generada: si se edito el orden a mano, van en
// ese orden y el mapa no vuelve a optimizar.
export function generatedRouteMap(route: GpsGeneratedFinalRoute): { points: RoutePoint[]; keepOrder: boolean } {
  const points = finalRoutePoints(route.items);
  if (!route.customOrder) return { points, keepOrder: false };
  const byId = new Map(points.map((point) => [point.id, point]));
  return {
    points: route.customOrder.map((id) => byId.get(id)).filter((point): point is RoutePoint => Boolean(point)),
    keepOrder: true
  };
}

export function formatGeneratedAt(iso: string) {
  return new Date(iso).toLocaleString("es-UY", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}
