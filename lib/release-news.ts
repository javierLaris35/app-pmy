import type { PublishedRelease, ReleaseNote } from "./types/deploy"

const ORDER: Record<ReleaseNote["kind"], number> = { nuevo: 0, mejora: 1, rapido: 2, correccion: 3 }

/**
 * Junta las versiones que el usuario no ha visto en un solo aviso: las novedades
 * (nuevo → mejora → más rápido) se muestran; las correcciones solo se cuentan.
 */
export function groupNews(releases: PublishedRelease[]): { version: string; highlights: ReleaseNote[]; fixesCount: number } {
  if (!releases.length) return { version: "", highlights: [], fixesCount: 0 }
  const all = releases.flatMap((r) => r.notes ?? [])
  const highlights = all
    .filter((n) => n.kind !== "correccion")
    .map((n, i) => ({ n, i }))
    .sort((a, b) => ORDER[a.n.kind] - ORDER[b.n.kind] || a.i - b.i)
    .map((x) => x.n)
  return { version: releases[0].version, highlights, fixesCount: all.length - highlights.length }
}

/** Solo correcciones no abre el aviso. */
export function hasVisibleNews(releases: PublishedRelease[]): boolean {
  return releases.some((r) => (r.notes ?? []).some((n) => n.kind !== "correccion"))
}
