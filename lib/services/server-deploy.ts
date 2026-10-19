import { axiosConfig } from "../axios-config"
import type { Bump, DeployLogChunk, DeployPreview, DeployRun, PublishedRelease, ReleaseNote } from "../types/deploy"

/** Estado: versión actual y actualización en curso (si hay). Solo superadmin. */
export const getDeployStatus = async (): Promise<{ currentVersion: string; running: DeployRun | null }> =>
  (await axiosConfig.get("/server/deploy/status")).data

/** Qué trae main (commits, notas, migraciones). No toca nada. */
export const getDeployPreview = async (): Promise<DeployPreview> =>
  (await axiosConfig.post("/server/deploy/preview", undefined, { timeout: 120_000 })).data

export const startDeploy = async (bump: Bump, notes: ReleaseNote[]): Promise<{ runId: string }> =>
  (await axiosConfig.post("/server/deploy/run", { bump, notes })).data

export const getDeployRuns = async (): Promise<DeployRun[]> =>
  (await axiosConfig.get("/server/deploy/runs")).data

/** Bitácora desde `offset`. `__noSilentRetry`: la pantalla maneja su propio reintento. */
export const getDeployLog = async (id: string, offset: number): Promise<DeployLogChunk> =>
  (await axiosConfig.get(`/server/deploy/runs/${id}/log`, { params: { offset }, timeout: 8000, __noSilentRetry: true } as any)).data

// ── Versión y aviso de novedades (cualquier usuario) ──
export const getCurrentRelease = async (): Promise<{ version: string }> =>
  (await axiosConfig.get("/system/release/current")).data

export const getUnseenReleases = async (): Promise<{ releases: PublishedRelease[] }> =>
  (await axiosConfig.get("/system/release/unseen")).data

export const markReleaseSeen = async (): Promise<{ version: string }> =>
  (await axiosConfig.post("/system/release/seen")).data
