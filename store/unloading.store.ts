import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PackageInfo, PackageInfoForUnloading, Consolidateds, Vehicles } from '@/lib/types'
import {
  emptyUnloadingDraft,
  pickDraft,
  pruneStaleDrafts,
  switchUnloadingDraft,
  type MissingPackage,
  type UnloadingDraft,
} from '@/lib/unloading-draft'

// Los setters aceptan valor o función `prev => next` (como useState). Antes solo
// aceptaban valor: los llamadores que pasaban `prev => ...` guardaban la FUNCIÓN
// como estado → shipments/sobrantes dejaban de ser arreglos y la UI se vaciaba.
type Updater<T> = T | ((prev: T) => T)

const resolve = <T,>(u: Updater<T>, prev: T): T =>
  typeof u === 'function' ? (u as (p: T) => T)(prev) : u

interface UnloadingState extends UnloadingDraft {
  /** Sucursal dueña de la captura activa (null = captura vieja, sin dueño). */
  subsidiaryId: string | null
  /** Capturas de otras sucursales, guardadas hasta que se vuelva a abrir su sucursal. */
  parked: Record<string, UnloadingDraft>
  /**
   * Activa la captura de una sucursal (estaciona la actual). Antes borra las capturas de más de
   * 2 días sin movimiento. Devuelve a quién se asignó una captura vieja sin dueño, qué
   * sucursales perdieron su captura vencida y si la que se abre fue una de ellas.
   */
  activateSubsidiary: (
    subsidiaryId: string,
    homeSubsidiaryId: string | null,
  ) => { legacyOwner: string | null; droppedIds: string[]; droppedOpened: boolean }

  setSelectedUnidad: (u: Updater<Vehicles | null>) => void
  setScannedPackages: (p: Updater<PackageInfo[]>) => void
  setShipments: (s: Updater<PackageInfoForUnloading[]>) => void
  setMissingPackages: (m: Updater<MissingPackage[]>) => void
  setSurplusTrackings: (s: Updater<string[]>) => void
  setConsolidatedValidation: (c: Updater<Consolidateds | null>) => void
  setSelectedConsolidatedIds: (ids: Updater<string[]>) => void

  /** Limpia la captura ACTIVA (las estacionadas de otras sucursales se conservan). */
  clearAll: () => void
}

export const useUnloadingStore = create<UnloadingState>()(
  persist(
    (set, get) => ({
      ...emptyUnloadingDraft(),
      subsidiaryId: null,
      parked: {},

      activateSubsidiary: (subsidiaryId, homeSubsidiaryId) => {
        const st = get()
        const pruned = pruneStaleDrafts({ ...pickDraft(st), subsidiaryId: st.subsidiaryId, parked: st.parked })
        const next = switchUnloadingDraft(pruned.slots, subsidiaryId, homeSubsidiaryId)
        const { legacyOwner, ...slots } = next
        set(slots)
        return { legacyOwner, droppedIds: pruned.droppedIds, droppedOpened: pruned.droppedIds.includes(subsidiaryId) }
      },

      // Cada cambio marca el último movimiento de la captura (para borrar las vencidas).
      setSelectedUnidad: (u) => set((st) => ({ selectedUnidad: resolve(u, st.selectedUnidad), updatedAt: Date.now() })),
      setScannedPackages: (p) => set((st) => ({ scannedPackages: resolve(p, st.scannedPackages), updatedAt: Date.now() })),
      setShipments: (s) => set((st) => ({ shipments: resolve(s, st.shipments), updatedAt: Date.now() })),
      setMissingPackages: (m) => set((st) => ({ missingPackages: resolve(m, st.missingPackages), updatedAt: Date.now() })),
      setSurplusTrackings: (s) => set((st) => ({ surplusTrackings: resolve(s, st.surplusTrackings), updatedAt: Date.now() })),
      setConsolidatedValidation: (c) => set((st) => ({ consolidatedValidation: resolve(c, st.consolidatedValidation), updatedAt: Date.now() })),
      setSelectedConsolidatedIds: (ids) => set((st) => ({ selectedConsolidatedIds: resolve(ids, st.selectedConsolidatedIds), updatedAt: Date.now() })),

      clearAll: () => set(emptyUnloadingDraft()),
    }),
    {
      name: 'unloading-store',
      partialize: (st) => ({ ...pickDraft(st), subsidiaryId: st.subsidiaryId, parked: st.parked }),
      // Sesiones guardadas con el bug anterior pueden traer listas corruptas (la
      // función no se serializa → campo ausente). Las regresamos a arreglo vacío.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<UnloadingState>
        const parked: Record<string, UnloadingDraft> = {}
        if (p.parked && typeof p.parked === 'object') {
          for (const [id, d] of Object.entries(p.parked)) if (d) parked[id] = pickDraft(d)
        }
        return {
          ...current,
          ...pickDraft({ ...emptyUnloadingDraft(), ...p } as UnloadingDraft),
          subsidiaryId: typeof p.subsidiaryId === 'string' ? p.subsidiaryId : null,
          parked,
        }
      },
    }
  )
)

export default useUnloadingStore
