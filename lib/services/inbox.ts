import { axiosConfig } from "../axios-config";
import {
  AttachmentKind,
  BoardRow,
  InboxDetail,
  InboxListResult,
  InboxStatusInfo,
  InboxView,
  ZipCoverageRow,
} from "../types/inbox";

const baseUrl = "/inbox";

export interface InboxListParams {
  status: InboxView;
  subsidiaryId?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export const getInboxMessages = async (p: InboxListParams): Promise<InboxListResult> =>
  (await axiosConfig.get<InboxListResult>(`${baseUrl}/messages`, { params: p })).data;

export const getInboxMessage = async (id: string): Promise<InboxDetail> =>
  (await axiosConfig.get<InboxDetail>(`${baseUrl}/messages/${id}`)).data;

export const confirmInboxMessage = async (id: string, subsidiaryId: string, attachmentKinds?: Record<string, AttachmentKind>) =>
  (await axiosConfig.post(`${baseUrl}/messages/${id}/confirm`, { subsidiaryId, attachmentKinds })).data;

export const ignoreInboxMessage = async (id: string, reason?: string) =>
  (await axiosConfig.post(`${baseUrl}/messages/${id}/ignore`, { reason })).data;

export const syncInbox = async (): Promise<{ skipped?: string; read: number; saved: number; ignored: number; errors: number }> =>
  (await axiosConfig.post(`${baseUrl}/sync`)).data;

export const redetectInbox = async (): Promise<{ updated: number }> => (await axiosConfig.post(`${baseUrl}/redetect`, {})).data;

export const getInboxStatus = async (): Promise<InboxStatusInfo> => (await axiosConfig.get<InboxStatusInfo>(`${baseUrl}/status`)).data;

export const setInboxEnabled = async (enabled: boolean): Promise<InboxStatusInfo> =>
  (await axiosConfig.put<InboxStatusInfo>(`${baseUrl}/status`, { enabled })).data;

export const getInboxBoard = async (p: { from?: string; to?: string; subsidiaryId?: string }): Promise<BoardRow[]> =>
  (await axiosConfig.get<BoardRow[]>(`${baseUrl}/board`, { params: p })).data;

export const getZipCoverage = async (subsidiaryId?: string): Promise<ZipCoverageRow[]> =>
  (await axiosConfig.get<ZipCoverageRow[]>(`${baseUrl}/zip-coverage`, { params: { subsidiaryId } })).data;

export const setZipCoverageStatus = async (id: string, status: ZipCoverageRow["status"]) =>
  (await axiosConfig.put(`${baseUrl}/zip-coverage/${id}`, { status })).data;

export const addZipCoverage = async (body: { zip: string; subsidiaryId: string; city?: string }) =>
  (await axiosConfig.post(`${baseUrl}/zip-coverage`, body)).data;

export const rebuildZipCoverage = async (): Promise<{ pairs: number; days: number }> =>
  (await axiosConfig.post(`${baseUrl}/zip-coverage/rebuild`)).data;

/** Descarga un adjunto con el token (no se puede con un <a href> directo). */
export async function downloadInboxAttachment(id: string, filename: string): Promise<void> {
  const res = await axiosConfig.get(`${baseUrl}/attachments/${id}/download`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Mensaje del servidor en llano, o uno genérico. */
export function inboxErrorText(e: unknown, fallback: string): string {
  const msg = (e as any)?.response?.data?.message;
  if (typeof msg === "string" && msg && !/^[A-Za-z ]+Exception$/.test(msg) && (e as any)?.response?.status < 500) return msg;
  return fallback;
}

export const getInboxPastePlan = async (id: string): Promise<import("../types/inbox").PastePlan> =>
  (await axiosConfig.get(`${baseUrl}/messages/${id}/paste-plan`)).data;

export const markInboxPasted = async (
  id: string,
  body: {
    attachmentId: string;
    kind: import("../types/inbox").PasteBatchKind;
    consNumber: string;
    key?: string;
    sheet?: string;
    consDate?: string;
    fileRows?: number;
    cobrosCount?: number;
    summary?: Record<string, unknown>;
  },
) =>
  (await axiosConfig.post(`${baseUrl}/messages/${id}/pasted`, body)).data;

export interface AttachmentPreview {
  type: "sheet" | "pdf" | "image" | "none";
  filename: string;
  sheets?: { name: string; rows: string[][]; totalRows: number; truncated: boolean }[];
}

export const getAttachmentPreview = async (id: string): Promise<AttachmentPreview> =>
  (await axiosConfig.get<AttachmentPreview>(`${baseUrl}/attachments/${id}/preview`)).data;

/** URL local (blob) del archivo para mostrar PDF/imagen dentro de la app. Liberar con URL.revokeObjectURL. */
export async function getAttachmentObjectUrl(id: string, contentType?: string): Promise<string> {
  const res = await axiosConfig.get(`${baseUrl}/attachments/${id}/download`, { responseType: "blob" });
  const blob = contentType ? new Blob([res.data as Blob], { type: contentType }) : (res.data as Blob);
  return URL.createObjectURL(blob);
}
