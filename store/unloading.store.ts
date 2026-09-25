import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PackageInfo, PackageInfoForUnloading, Consolidateds, Vehicles } from '@/lib/types'

// Los setters aceptan valor o función `prev => next` (como useState). Antes solo
// aceptaban valor: los llamadores que pasaban `prev => ...` guardaban la FUNCIÓN
// como estado → shipments/sobrantes dejaban de ser arreglos y la UI se vaciaba.
type Updater<T> = T | ((prev: T) => T)

const resolve = <T,>(u: Updater<T>, prev: T): T =>
  typeof u === 'function' ? (u as (p: T) => T)(prev) : u

interface UnloadingState {
  selectedUnidad: Vehicles | null
  setSelectedUnidad: (u: Updater<Vehicles | null>) => void

  scannedPackages: PackageInfo[]
  setScannedPackages: (p: Updater<PackageInfo[]>) => void

  shipments: PackageInfoForUnloading[]
  setShipments: (s: Updater<PackageInfoForUnloading[]>) => void

  missingPackages: { trackingNumber: string; recipientName?: string | null; recipientAddress?: string | null; recipientPhone?: string | null }[]
  setMissingPackages: (m: Updater<UnloadingState['missingPackages']>) => void

  surplusTrackings: string[]
  setSurplusTrackings: (s: Updater<string[]>) => void

  selectedReasons: Record<string, string>
  setSelectedReasons: (r: Updater<Record<string, string>>) => void

  trackingNumbersRaw: string
  setTrackingNumbersRaw: (t: Updater<string>) => void

  consolidatedValidation: Consolidateds | null
  setConsolidatedValidation: (c: Updater<Consolidateds | null>) => void

  selectedConsolidatedIds: string[]
  setSelectedConsolidatedIds: (ids: Updater<string[]>) => void

  clearAll: () => void
}

export const useUnloadingStore = create<UnloadingState>()(
  persist(
    (set, get) => ({
      selectedUnidad: null,
      setSelectedUnidad: (u) => set((st) => ({ selectedUnidad: resolve(u, st.selectedUnidad) })),

      scannedPackages: [],
      setScannedPackages: (p) => set((st) => ({ scannedPackages: resolve(p, st.scannedPackages) })),

      shipments: [],
      setShipments: (s) => set((st) => ({ shipments: resolve(s, st.shipments) })),

      missingPackages: [],
      setMissingPackages: (m) => set((st) => ({ missingPackages: resolve(m, st.missingPackages) })),

      surplusTrackings: [],
      setSurplusTrackings: (s) => set((st) => ({ surplusTrackings: resolve(s, st.surplusTrackings) })),

      selectedReasons: {},
      setSelectedReasons: (r) => set((st) => ({ selectedReasons: resolve(r, st.selectedReasons) })),

      trackingNumbersRaw: '',
      setTrackingNumbersRaw: (t) => set((st) => ({ trackingNumbersRaw: resolve(t, st.trackingNumbersRaw) })),

      consolidatedValidation: null,
      setConsolidatedValidation: (c) => set((st) => ({ consolidatedValidation: resolve(c, st.consolidatedValidation) })),

      selectedConsolidatedIds: [],
      setSelectedConsolidatedIds: (ids) => set((st) => ({ selectedConsolidatedIds: resolve(ids, st.selectedConsolidatedIds) })),

      clearAll: () => {
        set({
          selectedUnidad: null,
          scannedPackages: [],
          shipments: [],
          missingPackages: [],
          surplusTrackings: [],
          selectedReasons: {},
          trackingNumbersRaw: '',
          consolidatedValidation: null,
          selectedConsolidatedIds: [],
        })
      },
    }),
    {
      name: 'unloading-store',
      // Sesiones guardadas con el bug anterior pueden traer listas corruptas (la
      // función no se serializa → campo ausente). Las regresamos a arreglo vacío.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<UnloadingState>
        const arr = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : [])
        return {
          ...current,
          ...p,
          scannedPackages: arr(p.scannedPackages),
          shipments: arr(p.shipments),
          missingPackages: arr(p.missingPackages),
          surplusTrackings: arr(p.surplusTrackings),
          selectedConsolidatedIds: arr(p.selectedConsolidatedIds),
          selectedReasons: p.selectedReasons && typeof p.selectedReasons === 'object' ? p.selectedReasons : {},
        }
      },
    }
  )
)

export default useUnloadingStore
