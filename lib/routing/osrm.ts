/**
 * Cliente del OSRM público de demostración (gratis, sin API key, CORS abierto):
 *   https://router.project-osrm.org
 *
 * - `osrmTrip`  → resuelve el TSP (orden óptimo de visita) + geometría + km + min.
 * - `osrmRoute` → ruta por waypoints en el ORDEN dado (sin reordenar).
 *
 * Coordenadas OSRM: "lon,lat;lon,lat...". La geometría GeoJSON llega como [lon,lat]
 * y aquí se convierte a [lat,lng] para Leaflet.
 *
 * NOTA (producción): el server de demo NO es para uso productivo. Migrar a OSRM
 * auto-hospedado o a OpenRouteService/VROOM (soporta prioridades y ventanas de
 * tiempo nativas) cuando esto pase de prototipo.
 */

const OSRM = "https://router.project-osrm.org";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteResult {
  /** Polilínea [lat,lng] lista para Leaflet. */
  coordinates: [number, number][];
  distanceKm: number;
  durationMin: number;
  /** Orden de visita como índices DEL ARREGLO `points` que se pasó. */
  order: number[];
}

function toCoordParam(points: LatLng[]): string {
  return points.map((p) => `${p.lng},${p.lat}`).join(";");
}

function geojsonToLatLng(coords: [number, number][]): [number, number][] {
  // GeoJSON = [lon,lat] → Leaflet [lat,lng]
  return coords.map(([lon, lat]) => [lat, lon]);
}

/**
 * TSP con OSRM /trip. `roundTrip=false` + `source=first` = empieza en el primer
 * punto (el origen/sucursal) y NO regresa al inicio.
 */
export async function osrmTrip(
  points: LatLng[],
  opts: { roundTrip?: boolean } = {},
): Promise<RouteResult> {
  if (points.length < 2) {
    return { coordinates: points.map((p) => [p.lat, p.lng]), distanceKm: 0, durationMin: 0, order: points.map((_, i) => i) };
  }
  const roundtrip = opts.roundTrip ? "true" : "false";
  const url = `${OSRM}/trip/v1/driving/${toCoordParam(points)}?source=first&roundtrip=${roundtrip}&geometries=geojson&overview=full`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM trip ${res.status}`);
  const data = await res.json();
  if (data.code !== "Ok" || !data.trips?.length) throw new Error(`OSRM trip: ${data.code}`);

  const trip = data.trips[0];
  // waypoints[i].waypoint_index = posición de points[i] dentro del trip óptimo.
  const order = data.waypoints
    .map((w: any, i: number) => ({ i, pos: w.waypoint_index }))
    .sort((a: any, b: any) => a.pos - b.pos)
    .map((x: any) => x.i);

  return {
    coordinates: geojsonToLatLng(trip.geometry.coordinates),
    distanceKm: trip.distance / 1000,
    durationMin: trip.duration / 60,
    order,
  };
}

/** Ruta por waypoints en el orden dado (no reordena). */
export async function osrmRoute(points: LatLng[]): Promise<RouteResult> {
  if (points.length < 2) {
    return { coordinates: points.map((p) => [p.lat, p.lng]), distanceKm: 0, durationMin: 0, order: points.map((_, i) => i) };
  }
  const url = `${OSRM}/route/v1/driving/${toCoordParam(points)}?geometries=geojson&overview=full`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM route ${res.status}`);
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) throw new Error(`OSRM route: ${data.code}`);

  const route = data.routes[0];
  return {
    coordinates: geojsonToLatLng(route.geometry.coordinates),
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    order: points.map((_, i) => i),
  };
}

/** Litros estimados = km/100 × consumo (L/100km). */
export function litersFor(distanceKm: number, lPer100km: number): number {
  return (distanceKm / 100) * lPer100km;
}
