import { axiosConfig } from "../axios-config"
import { ListParams, Paginated } from "./pagination"

const url = "/returning"

export type ReturningDevolutionItem = {
  trackingNumber: string
  status?: string
  reason?: string
}

export type ReturningCollectionItem = {
  trackingNumber: string
  status?: string
  isPickUp?: boolean
  date?: string
}

export type CreateReturningPayload = {
  subsidiaryId: string
  date?: string
  driverIds?: string[]
  vehicleId?: string
  devolutions?: ReturningDevolutionItem[]
  collections?: ReturningCollectionItem[]
}

/** Salida (lote) para el listado del historial. */
export type ReturningBatch = {
  id: string
  folio: number
  date: string
  devolutionsCount: number
  collectionsCount: number
  createdAt: string
  subsidiary?: { id: string; name: string } | null
  vehicle?: { id: string; name?: string; code?: string; plateNumber?: string } | null
  drivers?: { id: string; name: string }[]
}

export type ReturningBatchDetail = ReturningBatch & {
  devolutions: { trackingNumber: string; reason: string; date: string }[]
  collections: { trackingNumber: string; status: string; isPickUp: boolean; createdAt: string }[]
}

/** Guardado unificado: crea la salida (lote) con devoluciones + recolecciones en una transacción. */
export const saveReturning = async (payload: CreateReturningPayload) => {
  const response = await axiosConfig.post(url, payload)
  return response.data
}

export const getReturnings = async (
  subsidiaryId: string,
  params: ListParams = {},
): Promise<Paginated<ReturningBatch>> => {
  const response = await axiosConfig.get<Paginated<ReturningBatch>>(
    `${url}/subsidiary/${subsidiaryId}`,
    { params },
  )
  return response.data
}

export const getReturningDetail = async (id: string): Promise<ReturningBatchDetail> => {
  const response = await axiosConfig.get<ReturningBatchDetail>(`${url}/detail/${id}`)
  return response.data
}
