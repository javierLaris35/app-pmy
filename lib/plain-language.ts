/**
 * Detecta palabras técnicas en textos que ven los usuarios operativos (aviso de
 * novedades). Los códigos del negocio (DEX08, F2, 31.5, consolidado) sí se permiten.
 */
const WORDS = [
  "api", "apis", "endpoint", "endpoints", "backend", "frontend", "cron", "crons", "dto", "json", "sql",
  "query", "queries", "migración", "migracion", "migraciones", "refactor", "commit", "deploy", "intake",
  "payload", "token", "schema", "typeorm", "nestjs", "react", "hook", "hooks", "service", "controller",
  "entity", "util", "utils", "stack", "bug", "fix", "feat", "perf", "endpoint", "webhook",
]
const HTTP = /\b(GET|POST|PUT|PATCH|DELETE)\b/g
const PATH = /(?:^|\s|\()(\/[\w\-:.]+(?:\/[\w\-:.]*)+|\/[\w\-]+\/?:[\w]+)/g
const CAMEL = /\b[a-z]+[A-Z][A-Za-z]+\b/g
const SNAKE = /\b[a-z]+_[a-z_]+\b/g

export function technicalTerms(text: string | undefined | null): string[] {
  if (!text) return []
  const found = new Set<string>()
  for (const m of text.matchAll(HTTP)) found.add(m[1])
  for (const m of text.matchAll(PATH)) found.add(m[1])
  for (const m of text.matchAll(CAMEL)) found.add(m[0])
  for (const m of text.matchAll(SNAKE)) found.add(m[0])
  for (const w of text.split(/[^\p{L}\p{N}]+/u)) {
    if (w && WORDS.includes(w.toLowerCase())) found.add(w)
  }
  return [...found]
}

/** Palabras técnicas en lo que lee el usuario (la ruta de "Ir a verlo" no se muestra). */
export function noteTechnicalTerms(n: { title: string; summary: string; where?: string; route?: string; steps?: string[] }): string[] {
  return [...new Set([n.title, n.summary, n.where, ...(n.steps ?? [])].flatMap((t) => technicalTerms(t)))]
}
