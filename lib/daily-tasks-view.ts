/** Funciones puras de la pantalla Tareas del día. */

export type TaskStatus = "pending" | "partial" | "done" | "late";
export type TaskStep = "upload" | "unloading" | "dispatch" | "closure" | "devolutions" | "inventory_initial" | "inventory_final";

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
  devolutions: "Devoluciones",
  inventory_initial: "Inventario inicial",
  inventory_final: "Inventario final de día",
};
export const stepLabel = (step: TaskStep) => LABEL[step];

const LINK: Record<TaskStep, string> = {
  upload: "/operaciones/consolidados",
  unloading: "/operaciones/desembarques",
  dispatch: "/operaciones/salidas-a-ruta",
  closure: "/operaciones/salidas-a-ruta",
  devolutions: "/operaciones/devoluciones",
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

const LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

/** Los 7 días (lunes a domingo) de la semana que empieza en `monday` (YYYY-MM-DD). */
export function weekDays(monday: string): { day: string; letter: string }[] {
  const base = Date.parse(`${monday}T12:00:00.000Z`);
  return LETTERS.map((letter, i) => ({ day: new Date(base + i * 86_400_000).toISOString().slice(0, 10), letter }));
}

/** HH:MM en Hermosillo (UTC−7) de un instante. */
export const hermosilloTime = (iso: string | Date) => new Date(new Date(iso).getTime() - 7 * 3_600_000).toISOString().slice(11, 16);

/** Hoy (YYYY-MM-DD) en Hermosillo. */
export const hermosilloToday = () => new Date(Date.now() - 7 * 3_600_000).toISOString().slice(0, 10);
