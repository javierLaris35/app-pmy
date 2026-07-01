import { create } from "zustand"
import { persist } from "zustand/middleware"

/**
 * Estado PERSISTENTE del optimizador de rutas (salida a ruta scanner-driven).
 * Se guarda en localStorage para que, si el chofer recarga o se cae la app a
 * media ruta, NO pierda lo ya escaneado. Lo derivado (variantes/rutas OSRM) NO
 * se persiste: se recalcula solo al volver (es barato y depende del origen).
 */

export interface ScanPkg {
  trackingNumber: string
  key: string
  commitDateTime?: string
  priority: boolean
}

export interface Stop {
  id: string // clave de deduplicación: recipientName|address|zip
  recipientName: string
  address: string
  city: string
  zip: string
  packages: ScanPkg[]
  priority: boolean
  lat?: number
  lng?: number
  source?: string
  geoStatus: "pending" | "ok" | "notfound"
}

export type VariantId = "scan" | "optimal" | "priority"

interface RouteOptimizerState {
  subsidiaryId: string
  stops: Stop[]
  scannedKeys: string[]
  selectedId: VariantId
  lPer100: number
  pricePerL: number
  manualLat: string
  manualLng: string

  setSubsidiaryId: (v: string) => void
  setSelectedId: (v: VariantId) => void
  setLPer100: (v: number) => void
  setPricePerL: (v: number) => void
  setManual: (lat: string, lng: string) => void

  isScanned: (key: string) => boolean
  markScanned: (...keys: string[]) => void
  addStop: (stop: Stop) => void
  mergePackage: (stopId: string, pkg: ScanPkg) => void
  patchStopGeo: (id: string, geo: { lat: number; lng: number; source: string } | null) => void
  regeocodeAll: () => void
  removeStop: (id: string) => void
  removePackage: (stopId: string, key: string) => void
  reset: () => void
}

export const useRouteOptimizerStore = create<RouteOptimizerState>()(
  persist(
    (set, get) => ({
      subsidiaryId: "",
      stops: [],
      scannedKeys: [],
      selectedId: "scan",
      lPer100: 12,
      pricePerL: 24,
      manualLat: "",
      manualLng: "",

      setSubsidiaryId: (v) => set({ subsidiaryId: v }),
      setSelectedId: (v) => set({ selectedId: v }),
      setLPer100: (v) => set({ lPer100: v }),
      setPricePerL: (v) => set({ pricePerL: v }),
      setManual: (lat, lng) => set({ manualLat: lat, manualLng: lng }),

      isScanned: (key) => get().scannedKeys.includes(key),
      markScanned: (...keys) => set((s) => ({ scannedKeys: Array.from(new Set([...s.scannedKeys, ...keys])) })),

      addStop: (stop) => set((s) => ({ stops: [...s.stops, stop] })),
      mergePackage: (stopId, pkg) =>
        set((s) => ({
          stops: s.stops.map((st) =>
            st.id === stopId ? { ...st, packages: [...st.packages, pkg], priority: st.priority || pkg.priority } : st,
          ),
        })),

      patchStopGeo: (id, geo) =>
        set((s) => ({
          stops: s.stops.map((st) => {
            if (st.id !== id) return st
            return geo
              ? { ...st, lat: geo.lat, lng: geo.lng, source: geo.source, geoStatus: "ok" }
              : { ...st, geoStatus: "notfound" }
          }),
        })),

      // Vuelve a geocodificar TODO (sin perder lo escaneado): marca cada parada
      // como 'pending' y limpia coords → el efecto serial las re-resuelve por el
      // backend (que ahora usa Photon + auto-cura caché).
      regeocodeAll: () =>
        set((s) => ({ stops: s.stops.map((st) => ({ ...st, geoStatus: "pending", lat: undefined, lng: undefined, source: undefined })) })),

      removeStop: (id) =>
        set((s) => {
          const stop = s.stops.find((st) => st.id === id)
          const drop = new Set<string>()
          stop?.packages.forEach((p) => { drop.add(p.key); drop.add(p.trackingNumber) })
          return {
            stops: s.stops.filter((st) => st.id !== id),
            scannedKeys: s.scannedKeys.filter((k) => !drop.has(k)),
          }
        }),

      removePackage: (stopId, key) =>
        set((s) => {
          const stop = s.stops.find((st) => st.id === stopId)
          const pkg = stop?.packages.find((p) => p.key === key)
          const drop = new Set<string>()
          if (pkg) { drop.add(pkg.key); drop.add(pkg.trackingNumber) }
          const stops = s.stops.flatMap((st) => {
            if (st.id !== stopId) return [st]
            const rest = st.packages.filter((p) => p.key !== key)
            if (rest.length === 0) return []
            return [{ ...st, packages: rest, priority: rest.some((p) => p.priority) }]
          })
          return { stops, scannedKeys: s.scannedKeys.filter((k) => !drop.has(k)) }
        }),

      reset: () => set({ stops: [], scannedKeys: [], selectedId: "scan" }),
    }),
    {
      name: "route-optimizer-v1",
      partialize: (s) => ({
        subsidiaryId: s.subsidiaryId,
        stops: s.stops,
        scannedKeys: s.scannedKeys,
        selectedId: s.selectedId,
        lPer100: s.lPer100,
        pricePerL: s.pricePerL,
        manualLat: s.manualLat,
        manualLng: s.manualLng,
      }),
    },
  ),
)
