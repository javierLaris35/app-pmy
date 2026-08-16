export interface PickerOption { id: string; label: string; }

/** Un día → rango [from,to] con el mismo día (formato YYYY-MM-DD). */
export function toDayRange(day: string): { from: string; to: string } {
  const d = (day || "").slice(0, 10);
  return { from: d, to: d };
}

function shortDate(...candidates: (string | undefined | null)[]): string {
  const raw = candidates.find((c) => !!c);
  return raw ? String(raw).slice(0, 10) : "—";
}

function shortId(id: string): string {
  return (id || "").slice(0, 6) || "—";
}

export function buildRouteOption(route: any): PickerOption {
  const id = route?.id ?? "";
  const date = shortDate(route?.routeDate, route?.startTime, route?.createdAt);
  const count = route?.totalPackages ?? route?.shipments?.length ?? 0;
  const driver = route?.driverName ?? route?.drivers?.[0]?.name ?? "—";
  const label = `${date} · ${count} guías · ${driver}` + (date === "—" && count === 0 ? ` · ${shortId(id)}` : "");
  return { id, label };
}

export function buildConsolidatedOption(cons: any): PickerOption {
  const id = cons?.id ?? "";
  const date = shortDate(cons?.date, cons?.createdAt);
  const name = cons?.name ?? cons?.type ?? shortId(id);
  const count = cons?.numberOfPackages ?? cons?.shipmentCounts?.total ?? 0;
  return { id, label: `${date} · ${name} · ${count} guías` };
}
