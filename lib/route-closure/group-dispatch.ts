import type { PackageDispatch } from "@/lib/types";

/** Ruta candidata a cerrarse junto con otras del mismo chofer y día. */
export interface GroupCandidate {
  key: string;
  routeDate: string;
  driverId: string;
  driverName: string;
  dispatches: { id: string; folio: string; routeNames: string; createdAt: string; packages: number }[];
}

/**
 * Cierre agrupado: une las salidas de un chofer del mismo día en una sola "salida"
 * para la pantalla de cierre (paquetes de todas, en el orden en que salieron). La
 * primera ruta del día manda en encabezado y km inicial; el folio muestra todos.
 * `folioById` dice de qué salida es cada paquete (etiqueta en la lista).
 */
export function mergeDispatchesForClosure(dispatches: PackageDispatch[]): {
  merged: PackageDispatch;
  folioById: Record<string, string>;
} {
  const ordered = [...dispatches].sort(
    (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
  );
  const first = ordered[0];
  const folioById: Record<string, string> = {};
  for (const d of ordered) {
    for (const s of [...(d.shipments ?? []), ...(d.chargeShipments ?? [])] as { id?: string }[]) {
      if (s?.id) folioById[s.id] = d.trackingNumber;
    }
  }
  const routes = ordered.flatMap((d) => d.routes ?? []);
  const merged: PackageDispatch = {
    ...first,
    trackingNumber: ordered.map((d) => d.trackingNumber).join(" + "),
    routes: routes.filter((r, i) => routes.findIndex((x) => x.id === r.id) === i),
    shipments: ordered.flatMap((d) => d.shipments ?? []),
    chargeShipments: ordered.flatMap((d) => d.chargeShipments ?? []),
  };
  return { merged, folioById };
}
