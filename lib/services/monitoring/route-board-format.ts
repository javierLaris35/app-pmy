// Formato de fecha/hora compartido entre el tablero de cuadros, la tabla y los
// gráficos — todo en hora de Hermosillo (UTC-7 fijo, sin horario de verano).
const TZ = "America/Hermosillo";

export const todayHmo = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });

export const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: TZ }) : null;

export const fmtDateTimeShort = (iso: string) =>
  `${new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", timeZone: TZ })}, ${fmtTime(iso)}`;

export function formatElapsed(ms: number): string {
  const totalMin = Math.floor(Math.max(0, ms) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function fmtAgo(iso: string | null): string {
  if (!iso) return "Sin escaneos aún";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "hace instantes";
  if (mins < 60) return `hace ${mins} min`;
  return `hace ${Math.floor(mins / 60)}h ${mins % 60}min`;
}
