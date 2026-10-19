import { axiosConfig } from "../axios-config"
import type { PackageDossier } from "../types/package-dossier"

/** Expediente completo de una guía FedEx/DHL o JD de pieza DHL. */
export const getPackageDossier = async (query: string): Promise<PackageDossier> => {
  const response = await axiosConfig.get<PackageDossier>(`/package-dossier/${encodeURIComponent(query.trim())}`)
  return response.data
}
