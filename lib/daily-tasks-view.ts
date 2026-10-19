/** Funciones puras de la pantalla Tareas del día. */

export type TaskStatus = "pending" | "partial" | "done" | "late";
export type TaskStep = "upload" | "unloading" | "dispatch" | "closure" | "inventory_initial" | "inventory_final";

export function stepVisual(status: TaskStatus): { icon: "done" | "partial" | "pending" | "late"; strike: boolean; tone: "success" | "warning" | "muted" | "danger" } {
  if (status === "done") return { icon: "done", strike: true, tone: "success" };
  if (status === "late") return { icon: "late", strike: false, tone: "danger" };
  if (status === "partial") return { icon: "partial", strike: false, tone: "warning" };
  return { icon: "pending", strike: false, tone: "muted" };
}

const LABEL: Record<TaskStep, string> = {
  upload: "Consolidado subido",
  unloading: "Desembarque",
  dispatch: "Salidas a ruta",
  closure: "Cierre de rutas",
  inventory_initial: "Inventario inicial",
  inventory_final: "Inventario final de día",
};
export const stepLabel = (step: TaskStep) => LABEL[step];

const LINK: Record<TaskStep, string> = {
  upload: "/operaciones/consolidados",
  unloading: "/operaciones/desembarques",
  dispatch: "/operaciones/salidas-a-ruta",
  closure: "/operaciones/salidas-a-ruta",
  inventory_initial: "/operaciones/inventarios",
  inventory_final: "/operaciones/inventarios",
};
export const stepLink = (step: TaskStep) => LINK[step];

const rank = (tasks: { status: TaskStatus }[]) => (tasks.some((t) => t.status === "late") ? 0 : tasks.every((t) => t.status === "done") ? 2 : 1);

/** Con atrasos primero, terminados al final (orden estable dentro de cada grupo). */
export function sortConsolidated<T extends { tasks: { status: TaskStatus }[] }>(list: T[]): T[] {
  return list.map((x, i) => ({ x, i })).sort((a, b) => rank(a.x.tasks) - rank(b.x.tasks) || a.i - b.i).map((e) => e.x);
}

export function dayPct(tasks: { status: TaskStatus }[]): number {
  return tasks.length ? Math.round((tasks.filter((t) => t.status === "done").length / tasks.length) * 100) : 0;
}

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** "Lunes 12 - Oct" para un día YYYY-MM-DD. */
export function dayLabel(day: string): string {
  const d = new Date(`${day}T12:00:00.000Z`);
  return `${DAY_NAMES[d.getUTCDay()]} ${d.getUTCDate()} - ${MONTHS[d.getUTCMonth()]}`;
}

/** Los 7 días (lunes a domingo) de la semana que empieza en `monday` (YYYY-MM-DD). */
export function weekDays(monday: string): { day: string; label: string }[] {
  const base = Date.parse(`${monday}T12:00:00.000Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(base + i * 86_400_000).toISOString().slice(0, 10);
    return { day, label: dayLabel(day) };
  });
}

/** Hora de Hermosillo (UTC−7) en formato de 12 horas: "6:40 a. m.". */
export function hermosilloTime(iso: string | Date): string {
  const [h, m] = new Date(new Date(iso).getTime() - 7 * 3_600_000).toISOString().slice(11, 16).split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`;
}

/** Rutas del día como hechos (no se sabe de antemano cuántas habrá): "4 salieron · 1 cerrada · 3 sin cerrar". */
export function routesSummary(routes: { closed: boolean }[]): string {
  if (!routes.length) return "No ha salido ninguna ruta";
  const closed = routes.filter((r) => r.closed).length;
  const open = routes.length - closed;
  const head = `${routes.length} ${routes.length === 1 ? "salió" : "salieron"}`;
  if (!open) return `${head} · todas cerradas`;
  return closed ? `${head} · ${closed} ${closed === 1 ? "cerrada" : "cerradas"} · ${open} sin cerrar` : `${head} · ${open} sin cerrar`;
}

/** Hoy (YYYY-MM-DD) en Hermosillo. */
export const hermosilloToday = () => new Date(Date.now() - 7 * 3_600_000).toISOString().slice(0, 10);

/** Liga a Salidas a ruta que enfoca la salida y abre su cierre (`cerrar`). */
export const closureLink = (r: { id: string; trackingNumber: string }) =>
  `/operaciones/salidas-a-ruta?seguimiento=${encodeURIComponent(r.trackingNumber)}&cerrar=${encodeURIComponent(r.id)}`;

/** Nombre(s) de chofer estandarizados en mayúsculas ("JUAN PÉREZ, ANA MUÑOZ"). */
export const driverName = (name: string | null | undefined) =>
  (name ?? "")
    .split(",")
    .map((n) => n.trim().replace(/\s+/g, " ").toLocaleUpperCase("es-MX"))
    .filter(Boolean)
    .join(", ");

/** Numerito del ícono de Tareas en la barra superior: solo los pasos atrasados de hoy. */
export function trayBadge(s: { late: number; pending: number } | undefined): { count: number; tone: "danger" | "none" } {
  return s && s.late > 0 ? { count: s.late, tone: "danger" } : { count: 0, tone: "none" };
}

/** "F2 4410 · Salidas a ruta", "Consolidado 7781 · Desembarque" o la tarea de la sucursal. */
export function lateItemLabel(i: { refType: string; consNumber: string | null; step: TaskStep }): string {
  if (i.refType === "subsidiary") return stepLabel(i.step);
  return `${i.refType === "charge" ? "F2" : "Consolidado"} ${i.consNumber ?? ""} · ${stepLabel(i.step)}`;
}
