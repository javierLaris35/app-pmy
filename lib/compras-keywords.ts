/** Sinónimos: texto separado por comas ↔ lista sin vacíos ni repetidos (sin importar acentos/mayúsculas). */

const key = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function splitKeywords(value?: string | null): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of (value ?? "").split(",")) {
    const k = raw.trim().replace(/\s+/g, " ");
    if (k && !seen.has(key(k))) {
      seen.add(key(k));
      out.push(k);
    }
  }
  return out;
}

export const joinKeywords = (list: string[]) => splitKeywords(list.join(",")).join(", ");
