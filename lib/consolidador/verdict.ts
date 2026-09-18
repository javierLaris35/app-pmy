import { SuggestedAction, VerdictLevel } from "@/lib/types/consolidador";

/** Clases de estilo por nivel de veredicto (badge shadcn + punto/acento). */
export function verdictTone(level: VerdictLevel): { badge: string; dot: string; text: string } {
  switch (level) {
    case "ok":
      return { badge: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500", text: "text-emerald-700" };
    case "warn":
      return { badge: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500", text: "text-amber-700" };
    case "danger":
      return { badge: "border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-500", text: "text-rose-700" };
  }
}

/** Etiqueta del botón de acción sugerida, o null si no hay acción. */
export function actionLabel(a: SuggestedAction): string | null {
  switch (a.kind) {
    case "fix_status":
      return `Corregir estatus a ${String(a.to).replace(/_/g, " ").toUpperCase()}`;
    case "repair_income":
      return "Generar cobro";
    case "delete_income":
      return "Eliminar cobro";
    case "none":
      return null;
  }
}
