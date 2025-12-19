import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PackageInfo, PackageInfoForUnloading, Consolidateds, Vehicles } from '@/lib/types'

interface UnloadingState {
  selectedUnidad: Vehicles | null
  setSelectedUnidad: (u: Vehicles | null) => void

  scannedPackages: PackageInfo[]
  setScannedPackages: (p: PackageInfo[]) => void

  shipments: PackageInfoForUnloading[]
  setShipments: (s: PackageInfoForUnloading[]) => void

  missingPackages: { trackingNumber: string; recipientName?: string | null; recipientAddress?: string | null; recipientPhone?: string | null }[]
  setMissingPackages: (m: UnloadingState['missingPackages']) => void

  surplusTrackings: string[]
  setSurplusTrackings: (s: string[]) => void

  selectedReasons: Record<string, string>
  setSelectedReasons: (r: Record<string, string>) => void

  trackingNumbersRaw: string
  setTrackingNumbersRaw: (t: string) => void

  consolidatedValidation: Consolidateds | null
  setConsolidatedValidation: (c: Consolidateds | null) => void

  selectedConsolidatedIds: string[]
  setSelectedConsolidatedIds: (ids: string[]) => void

  clearAll: () => void
}

export const useUnloadingStore = create<UnloadingState>()(
  persist(
    (set, get) => ({
      selectedUnidad: null,
      setSelectedUnidad: (u) => set({ selectedUnidad: u }),

      scannedPackages: [],
      setScannedPackages: (p) => set({ scannedPackages: p }),

      shipments: [],
      setShipments: (s) => set({ shipments: s }),

      missingPackages: [],
      setMissingPackages: (m) => set({ missingPackages: m }),

      surplusTrackings: [],
      setSurplusTrackings: (s) => set({ surplusTrackings: s }),

      selectedReasons: {},
      setSelectedReasons: (r) => set({ selectedReasons: r }),

      trackingNumbersRaw: '',
      setTrackingNumbersRaw: (t) => set({ trackingNumbersRaw: t }),

      consolidatedValidation: null,
      setConsolidatedValidation: (c) => set({ consolidatedValidation: c }),

      selectedConsolidatedIds: [],
      setSelectedConsolidatedIds: (ids) => set({ selectedConsolidatedIds: ids }),

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
    }
  )
)

export default useUnloadingStore
