/** Configuración → Servidor → Actualizar + aviso de novedades. Espejo de pmy-api/src/deploy. */

export type Bump = "patch" | "minor" | "major"
export type NoteKind = "nuevo" | "mejora" | "rapido" | "correccion"

export interface ReleaseNote {
  id: string
  kind: NoteKind
  title: string
  summary: string
  where?: string
  route?: string
  steps?: string[]
  audience?: "todos" | "superadmin"
  source: "api" | "web"
  /** Borrador armado desde un commit sin nota ("Sin nota" en la vista previa). */
  fromCommit?: boolean
}

export interface RepoCommit { sha: string; subject: string; author: string; date: string }

export interface RepoDiff {
  source: "api" | "web"
  dir: string
  branch: string
  dirty: boolean
  headCommit: string
  targetCommit: string | null
  /** Commits que main tiene y el servidor todavía no. */
  pendingCount: number
  commits: RepoCommit[]
  warnings: string[]
}

export interface DeployPreview {
  currentVersion: string
  api: RepoDiff
  web: RepoDiff | null
  notes: ReleaseNote[]
  noteErrors: string[]
  migrations: string[]
  suggestedBump: Bump
  nextVersions: Record<Bump, string>
  /** El servidor ya tiene todo lo de main. */
  serverUpToDate: boolean
  /** Nada que hacer: servidor al día, sin cambios de pantallas ni novedades. */
  upToDate: boolean
  canRun: boolean
  cannotRunReason: string | null
  running: boolean
}

export type DeployRunStatus = "running" | "success" | "failed"

export interface DeployRun {
  id: string
  status: DeployRunStatus
  step: string | null
  fromVersion: string
  targetVersion: string
  bump: Bump
  startedAt: string
  finishedAt: string | null
  durationMs: number | null
  startedById: string | null
  error: string | null
  toApiCommit: string | null
}

export type DeployEvent =
  | { type: "phase"; step: number; total: number; key: string; label: string; elapsedMs?: number }
  | { type: "skip"; key: string; line: string; elapsedMs?: number }
  | { type: "log" | "warn"; line: string; elapsedMs?: number }
  | { type: "heartbeat"; elapsedMs?: number }
  | { type: "error"; key: string; message: string; elapsedMs?: number }
  | { type: "done"; ok: boolean; durationMs: number }

export interface DeployLogChunk { events: DeployEvent[]; nextOffset: number; run: DeployRun }

export interface PublishedRelease { version: string; publishedAt: string; notes: ReleaseNote[] }
