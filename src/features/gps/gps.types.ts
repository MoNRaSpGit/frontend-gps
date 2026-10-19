export type GpsRole = "admin" | "vendedor" | "repartidor";

// Repartidores de demo (no son personas reales) -- mismo listado que
// siembra el backend en gps-data.service.ts.
export const GPS_COURIERS = ["Juan", "Pedro", "Lucía"] as const;

export type GpsUser = { id: number; username: string; fullName: string | null; role: GpsRole };

export type GpsSession = { user: GpsUser; token: string };

export type GpsClient = { id: number; name: string; address: string; lat: number; lng: number };

export type GpsProduct = { id: number; name: string; price: number };

export type GpsSaleItem = { productId: number; productName: string; quantity: number; unitPrice: number };

export type GpsSale = {
  id: number;
  clientId: number;
  clientName: string;
  clientAddress: string;
  clientLat: number;
  clientLng: number;
  sellerUsername: string;
  courierName: string | null;
  items: GpsSaleItem[];
  total: number;
  status: "pendiente" | "entregado";
  createdAt: string;
};
