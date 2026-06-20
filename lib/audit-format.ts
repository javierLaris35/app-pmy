import { format as fnsFormat } from "date-fns";

/** Etiquetas amistosas de módulos (los valores crudos vienen del backend). */
export const MODULE_LABELS: Record<string, string> = {
  auth: "Autenticación",
  usuarios: "Usuarios",
  consolidados: "Consolidados",
  desembarques: "Desembarques",
  devoluciones: "Devoluciones",
  recolecciones: "Recolecciones",
  salidas_ruta: "Salidas a Ruta",
  gastos: "Gastos",
  ingresos: "Ingresos",
  sucursales: "Sucursales",
  vehiculos: "Vehículos",
  zonas: "Zonas",
  rutas: "Rutas",
  choferes: "Choferes",
  bodega_entrada: "Bodega (Entrada)",
  bodega_salida: "Bodega (Salida)",
  recepcion_bodega: "Recepción en Bodega",
  inventarios: "Inventarios",
  monitoreo: "Monitoreo",
  traslados: "Traslados",
  envios: "Envíos",
  cierre_ruta: "Cierre de Ruta",
  reportes: "Reportes",
  auditoria: "Auditoría",
  otro: "Otro",
};

/** Etiquetas amistosas de acciones. */
export const ACTION_LABELS: Record<string, string> = {
  login: "Inicio de sesión",
  logout: "Cierre de sesión",
  login_failed: "Inicio fallido",
  create: "Creación",
  read: "Consulta",
  update: "Actualización",
  delete: "Eliminación",
  export: "Exportación",
  import: "Importación",
  validate: "Validación",
  status_change: "Cambio de estatus",
  assign: "Asignación",
  transfer: "Traslado",
  print: "Impresión / correo",
  other: "Otro",
};

/** Convierte `snake_case` a "Title Case" como respaldo. */
const titleCase = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const formatModule = (key?: string): string =>
  !key ? "—" : MODULE_LABELS[key] ?? titleCase(key);

export const formatAction = (key?: string): string =>
  !key ? "—" : ACTION_LABELS[key] ?? titleCase(key);

/**
 * Parsea un timestamp a `Date` interpretándolo como UTC cuando NO trae zona
 * horaria (la BD guarda en UTC). Así `date-fns format` lo muestra en la zona
 * LOCAL del usuario de forma consistente.
 */
export function toLocalDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  let s = String(value).trim();
  if (!s) return null;
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s);
  if (!hasTz) s = s.replace(" ", "T") + "Z"; // naive → asumir UTC
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Fecha + hora en zona local (dd/MM/yyyy HH:mm). */
export const fmtDateTime = (value?: string | Date | null, pattern = "dd/MM/yyyy HH:mm"): string => {
  const d = toLocalDate(value);
  return d ? fnsFormat(d, pattern) : "—";
};

/** Solo fecha en zona local. */
export const fmtDate = (value?: string | Date | null): string => fmtDateTime(value, "dd/MM/yyyy");

/** Tiempo relativo ("hace 5 min", "hace 2 h"). */
export function fmtRelative(value?: string | Date | null): string {
  const d = toLocalDate(value);
  if (!d) return "";
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "hace un momento";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}
