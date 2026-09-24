import type { Cause, DayOutcome, Verdict } from "@/lib/types/manual-count";

/** Textos en llano del "Conteo manual vs sistema". */

export const VERDICT_LABEL: Record<Verdict, string> = {
  CUADRA: "Cuadra",
  ERROR_SISTEMA: "Error del sistema",
  ERROR_CONTEO: "Error de conteo",
  REGLA: "Regla (no cobra)",
  OTRO_DIA: "Entregado otro día",
};

export const VERDICT_TONE: Record<Verdict, string> = {
  CUADRA: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ERROR_SISTEMA: "border-rose-200 bg-rose-50 text-rose-700",
  ERROR_CONTEO: "border-amber-200 bg-amber-50 text-amber-700",
  REGLA: "border-sky-200 bg-sky-50 text-sky-700",
  OTRO_DIA: "border-violet-200 bg-violet-50 text-violet-700",
};

export const CAUSE_LABEL: Record<Cause, string> = {
  NO_EXISTE: "No existe en el sistema",
  OTRA_SUCURSAL: "Es de otra sucursal",
  SIN_CONSOLIDADO: "Sin consolidado registrado",
  SIN_RUTA: "Nunca salió a ruta",
  RUTA_OTRO_DIA: "Ruta de otro día",
  ESTATUS_DESFASADO: "Estatus distinto a FedEx",
  COBRO_DE_MAS: "Cobro de más",
  COBRO_FALTANTE: "Falta el cobro",
  INGRESO_OTRO_DIA: "Ingreso en otro día",
  DUPLICADO: "Ingreso duplicado",
  MONTO_INCORRECTO: "Monto incorrecto",
  ERROR_CONTEO: "Conteo distinto",
  REGLA_NO_COBRA: "Por regla no cobra",
  F2_INFORMATIVO: "Carga F2",
  ENTREGADO_OTRO_DIA: "Se entregó otro día",
};

/** Causas que son errores del sistema (las que pueden ir al prompt). */
export const SYSTEM_CAUSES: Cause[] = [
  "NO_EXISTE",
  "OTRA_SUCURSAL",
  "SIN_CONSOLIDADO",
  "SIN_RUTA",
  "RUTA_OTRO_DIA",
  "ESTATUS_DESFASADO",
  "COBRO_DE_MAS",
  "COBRO_FALTANTE",
  "INGRESO_OTRO_DIA",
  "DUPLICADO",
  "MONTO_INCORRECTO",
];

export function outcomeLabel(o: DayOutcome): string {
  if (o === "POD") return "POD";
  if (o === "07") return "DEX07";
  if (o === "08") return "DEX08";
  if (o === "OTRO") return "Otro estatus";
  return "—";
}
