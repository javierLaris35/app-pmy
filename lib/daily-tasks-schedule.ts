/** Horarios de Tareas del día por sucursal (Configuración → Alertas → editar sucursal). */

export type ScheduleKey =
  | "uploadMinutes"
  | "unloadingTime"
  | "dispatchAfterUnloadMinutes"
  | "dispatchNextDayTime"
  | "closureTime"
  | "inventoryInitialTime"
  | "inventoryFinalTime";

export type ScheduleForm = Partial<Record<ScheduleKey, string>>;

export const SCHEDULE_FIELDS: { key: ScheduleKey; label: string; kind: "time" | "minutes"; fallback: string }[] = [
  { key: "uploadMinutes", label: "Subir consolidado (minutos después del correo)", kind: "minutes", fallback: "30" },
  { key: "unloadingTime", label: "Desembarque (hora límite)", kind: "time", fallback: "21:00" },
  { key: "dispatchAfterUnloadMinutes", label: "Salida a ruta (minutos después del desembarque)", kind: "minutes", fallback: "120" },
  { key: "dispatchNextDayTime", label: "Salida a ruta si se desembarcó tarde (día siguiente)", kind: "time", fallback: "10:00" },
  { key: "closureTime", label: "Cierre de rutas", kind: "time", fallback: "21:00" },
  { key: "inventoryInitialTime", label: "Inventario inicial", kind: "time", fallback: "10:00" },
  { key: "inventoryFinalTime", label: "Inventario final de día", kind: "time", fallback: "20:00" },
];

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Errores por campo, en llano, para mostrar bajo cada input. Vacío = usa el valor general. */
export function scheduleFormErrors(form: ScheduleForm): Partial<Record<ScheduleKey, string>> {
  const out: Partial<Record<ScheduleKey, string>> = {};
  for (const f of SCHEDULE_FIELDS) {
    const v = (form[f.key] ?? "").trim();
    if (!v) continue;
    if (f.kind === "time" && !HHMM.test(v)) out[f.key] = "Usa una hora válida, por ejemplo 20:00";
    if (f.kind === "minutes" && (!/^\d+$/.test(v) || Number(v) > 1440)) out[f.key] = "Escribe minutos entre 0 y 1440";
  }
  return out;
}

export function toSchedulePatch(form: ScheduleForm): Partial<Record<ScheduleKey, string | number | null>> {
  const out: Partial<Record<ScheduleKey, string | number | null>> = {};
  for (const f of SCHEDULE_FIELDS) {
    if (form[f.key] === undefined) continue;
    const v = (form[f.key] ?? "").trim();
    out[f.key] = !v ? null : f.kind === "minutes" ? Number(v) : v;
  }
  return out;
}
