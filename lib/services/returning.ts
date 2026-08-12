import { axiosConfig } from "../axios-config"
import { ListParams, Paginated } from "./pagination"
import { EmailLog, EmailStatus } from "../types"

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
  trackingNumber: string
  date: string
  devolutionsCount: number
  collectionsCount: number
  createdAt: string
  subsidiary?: { id: string; name: string } | null
  vehicle?: { id: string; name?: string; code?: string; plateNumber?: string } | null
  drivers?: { id: string; name: string }[]
  emailStatus?: EmailStatus
  emailLastSentAt?: string | null
  emailLastError?: string | null
}

export type ReturningKpis = {
  salidas: number
  devoluciones: number
  recolecciones: number
  correosEnviados: number
  correosPendientes: number
}

export type ReturningEmailResult = { status: "sent" | "error"; error?: string; to?: string }

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

export const getReturningKpis = async (
  subsidiaryId: string,
  params: { from?: string; to?: string } = {},
): Promise<ReturningKpis> => {
  const response = await axiosConfig.get<ReturningKpis>(`${url}/kpis/${subsidiaryId}`, { params })
  return response.data
}

export const getReturningEmailHistory = async (id: string): Promise<EmailLog[]> => {
  const response = await axiosConfig.get<EmailLog[]>(`${url}/${id}/email-history`)
  return response.data
}

/** Sube PDF+Excel de una salida y (re)envía el correo, con trazabilidad ligada al lote. */
export async function uploadReturningFiles(
  pdfFile: File,
  excelFile: File,
  subsidiaryName: string,
  returningHistoryId: string,
  opts?: { isResend?: boolean },
): Promise<ReturningEmailResult> {
  const formData = new FormData()
  formData.append("files", pdfFile)
  formData.append("files", excelFile)
  formData.append("subsidiaryName", subsidiaryName)
  formData.append("returningHistoryId", returningHistoryId)
  if (opts?.isResend) formData.append("isResend", "true")

  const response = await axiosConfig.post(`${url}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return response.data
}
