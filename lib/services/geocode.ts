import { axiosConfig } from "../axios-config"

export interface GeoResult {
  lat: string
  lon: string
  display_name?: string
  source: "address" | "postalcode" | "city"
}

/**
 * Geocodifica una dirección mexicana vía el backend (NestJS `/geocode`, que
 * proxea Nominatim con cascada tolerante: dirección → CP → ciudad).
 */
export const geocodeAddress = async (params: { address?: string; city?: string; zip?: string; q?: string }) => {
  const response = await axiosConfig.get<GeoResult[]>("/geocode", { params })
  return response.data
}

/**
 * Guarda una corrección MANUAL de coordenadas (arrastrar/colocar en el mapa).
 * El backend la persiste como verdad de campo: la próxima vez esa dirección
 * resuelve a este punto sin volver a Nominatim.
 */
export const saveManualGeocode = async (params: { address?: string; city?: string; zip?: string; lat: number; lng: number }) => {
  const response = await axiosConfig.post("/geocode/manual", params)
  return response.data
}

// ---- Administración del caché aprendido (Configuración) ----

export interface GeocodeCacheItem {
  id: string
  cacheKey: string
  rawAddress?: string
  city?: string
  zip?: string
  latitude: string
  longitude: string
  source: string
  manual: boolean
  hits: number
  createdAt?: string
  updatedAt?: string
}

export const getGeocodeCache = async (search?: string) => {
  const response = await axiosConfig.get<{ items: GeocodeCacheItem[]; total: number; manual: number }>("/geocode/cache", {
    params: search ? { search } : {},
  })
  return response.data
}

export const updateGeocodeCache = async (id: string, lat: number, lng: number) => {
  const response = await axiosConfig.patch(`/geocode/cache/${id}`, { lat, lng })
  return response.data
}

export const deleteGeocodeCache = async (id: string) => {
  const response = await axiosConfig.delete(`/geocode/cache/${id}`)
  return response.data
}

export const clearGeocodeCache = async (scope: "all" | "auto") => {
  const response = await axiosConfig.delete("/geocode/cache", { params: { scope } })
  return response.data
}
