/**
 * Parseo del "Conteo manual vs sistema" (Consolidador): lo que el usuario pega en las
 * cajas POD / DEX07 / DEX08 o sube en Excel. Lógica pura (sin DOM).
 */

export interface ManualListsInput {
  pod: string[];
  dex07: string[];
  dex08: string[];
}

export interface SheetParseResult extends ManualListsInput {
  error?: string;
}

type Box = keyof ManualListsInput;

/** Una guía: solo letras/dígitos, al menos 8 caracteres y con dígitos. */
const GUIDE_RE = /^[A-Za-z0-9]{8,40}$/;

function cleanToken(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const t = String(v).trim().replace(/^["'`]+|["'`]+$/g, "");
  return GUIDE_RE.test(t) && /\d/.test(t) ? t : null;
}

const uniq = (list: string[]) => [...new Set(list)];

/** Texto pegado (líneas, tabs, comas o espacios) → guías únicas en orden. */
export function parseList(text: string): string[] {
  return uniq(
    (text ?? "")
      .split(/[\s,;]+/)
      .map(cleanToken)
      .filter((t): t is string => !!t),
  );
}

const norm = (v: unknown) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[\s._-]+/g, "");

/** Encabezado / estatus → caja. Acepta POD, ENTREGADO, DEX07, 07, 7, DEX08, 08, 8. */
function boxOf(v: unknown): Box | null {
  const s = norm(v);
  if (s === "POD" || s === "ENTREGADO" || s === "ENTREGADOS") return "pod";
  if (["DEX07", "07", "7", "DEX7"].includes(s)) return "dex07";
  if (["DEX08", "08", "8", "DEX8"].includes(s)) return "dex08";
  return null;
}

const isGuideHeader = (v: unknown) => ["GUIA", "GUIAS", "TRACKING", "TRACKINGNUMBER", "NUMERODEGUIA"].includes(norm(v));
const isStatusHeader = (v: unknown) => ["ESTATUS", "STATUS", "ESTADO", "TIPO"].includes(norm(v));

/**
 * Filas de una hoja de Excel (primera fila = encabezados) → las 3 cajas. Formatos:
 *  - 3 columnas con encabezados POD | DEX07 | DEX08 (en cualquier orden).
 *  - 2 columnas Guía | Estatus.
 */
export function parseSheetRows(rows: unknown[][]): SheetParseResult {
  const empty: SheetParseResult = { pod: [], dex07: [], dex08: [] };
  if (!rows?.length) return { ...empty, error: "El archivo no tiene datos." };
  const header = rows[0] ?? [];
  const body = rows.slice(1);

  // Formato 2 columnas: Guía | Estatus.
  const gi = header.findIndex(isGuideHeader);
  const si = header.findIndex(isStatusHeader);
  if (gi >= 0 && si >= 0) {
    const out: SheetParseResult = { pod: [], dex07: [], dex08: [] };
    const unknown: string[] = [];
    for (const r of body) {
      const tn = cleanToken(r?.[gi]);
      if (!tn) continue;
      const box = boxOf(r?.[si]);
      if (box) out[box].push(tn);
      else unknown.push(tn);
    }
    const result: SheetParseResult = { pod: uniq(out.pod), dex07: uniq(out.dex07), dex08: uniq(out.dex08) };
    if (unknown.length) {
      const shown = unknown.slice(0, 5).join(", ");
      result.error = `No se reconoce el estatus de ${unknown.length} guía(s) (${shown}${unknown.length > 5 ? "…" : ""}). Usa POD, DEX07 o DEX08.`;
    }
    return result;
  }

  // Formato 3 columnas: POD | DEX07 | DEX08.
  const cols = header.map(boxOf);
  if (!cols.some(Boolean)) {
    return {
      ...empty,
      error: "No se reconocen los encabezados. Usa columnas POD, DEX07 y DEX08, o dos columnas Guía y Estatus.",
    };
  }
  const out: SheetParseResult = { pod: [], dex07: [], dex08: [] };
  for (const r of body) {
    cols.forEach((box, i) => {
      const tn = box ? cleanToken(r?.[i]) : null;
      if (box && tn) out[box].push(tn);
    });
  }
  return { pod: uniq(out.pod), dex07: uniq(out.dex07), dex08: uniq(out.dex08) };
}

/** Guías que aparecen en 2 o más cajas (el usuario debe decidir cuál es). */
export function findConflicts(l: ManualListsInput): string[] {
  const seen = new Map<string, number>();
  for (const list of [l.pod, l.dex07, l.dex08]) for (const tn of new Set(list)) seen.set(tn, (seen.get(tn) ?? 0) + 1);
  return [...seen.entries()].filter(([, n]) => n > 1).map(([tn]) => tn);
}
