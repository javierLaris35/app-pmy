import { axiosConfig } from '../axios-config';
import type { Ticket, TicketComment, TicketStatus, TicketPriority } from '../types/support-ticket';

const url = '/support';

/** Origen del backend (sin el sufijo `/api`) para construir URLs de archivos servidos. */
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/api\/?$/, '');

/** Convierte una ruta relativa de adjunto (`/api/uploads/...`) en URL absoluta. */
export function fileUrl(u?: string): string {
  if (!u) return '';
  if (/^https?:\/\//.test(u) || u.startsWith('data:')) return u;
  return `${API_ORIGIN}${u.startsWith('/') ? '' : '/'}${u}`;
}

function mapComment(c: any): TicketComment {
  return {
    usuario: c?.usuario ?? c?.authorName ?? 'Sistema',
    authorId: c?.authorId ?? c?.authorId ?? undefined,
    texto: c?.texto,
    fecha: c?.fecha ?? c?.createdAt,
    internal: c?.internal,
    imagenes: Array.isArray(c?.imagenes)
      ? c.imagenes.map((i: any) => fileUrl(typeof i === 'string' ? i : i?.url)).filter(Boolean)
      : [],
  };
}

function mapTicket(raw: any): Ticket {
  return {
    id: raw?.id,
    folio: raw?.folio,
    tipo: raw?.tipo,
    titulo: raw?.titulo,
    descripcion: raw?.descripcion,
    estado: raw?.estado,
    prioridad: raw?.prioridad,
    usuario: raw?.usuario ?? raw?.requesterName,
    requesterId: raw?.requesterId ?? undefined,
    asignadoA: raw?.asignadoA ?? raw?.assigneeName ?? undefined,
    asignadoAId: raw?.asignadoAId ?? raw?.assigneeId ?? undefined,
    asignadoEmail: raw?.assigneeEmail ?? undefined,
    subsidiaryId: raw?.subsidiaryId ?? undefined,
    seccion: raw?.seccion,
    subseccion: raw?.subseccion,
    menuPrincipal: raw?.menuPrincipal,
    submenu: raw?.submenu,
    pasosReplicar: raw?.pasosReplicar,
    imagenes: Array.isArray(raw?.imagenes)
      ? raw.imagenes.map((i: any) => fileUrl(typeof i === 'string' ? i : i?.url)).filter(Boolean)
      : [],
    comentarios: Array.isArray(raw?.comentarios) ? raw.comentarios.map(mapComment) : [],
    fechaCreacion: raw?.fechaCreacion ?? raw?.createdAt,
    resolvedAt: raw?.resolvedAt ?? null,
    // Campos calculados del tablero:
    slaDueAt: raw?.slaDueAt ?? null,
    slaBreached: raw?.slaBreached ?? false,
    urgencyScore: raw?.urgencyScore,
    ageHours: raw?.ageHours,
    timeInColumnHours: raw?.timeInColumnHours,
    startedAt: raw?.startedAt ?? null,
    workedHours: raw?.workedHours ?? null,
    approvalStatus: raw?.approvalStatus,
    approvalNote: raw?.approvalNote ?? null,
    approvedByName: raw?.approvedByName ?? null,
    approvalAt: raw?.approvalAt ?? null,
    zoneId: raw?.zoneId ?? null,
  };
}

async function getAllTickets(
  filters: { estado?: string; tipo?: string; prioridad?: string; q?: string; sucursal?: string; asignado?: string } = {},
) {
  const res = await axiosConfig.get<{ tickets: any[] }>(`${url}/tickets`, { params: filters });
  return { tickets: (res.data.tickets ?? []).map(mapTicket) };
}

async function getMyTickets() {
  const res = await axiosConfig.get<{ tickets: any[] }>(`${url}/tickets/mine`);
  return { tickets: (res.data.tickets ?? []).map(mapTicket) };
}

async function getTicket(id: string | number) {
  const res = await axiosConfig.get<any>(`${url}/tickets/${id}`);
  return mapTicket(res.data);
}

async function createTicket(data: Record<string, any>, imagenes?: File[]) {
  const form = new FormData();
  Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') form.append(k, String(v)); });
  (imagenes ?? []).forEach((file) => form.append('imagenes', file));
  const res = await axiosConfig.post<any>(`${url}/tickets`, form);
  return mapTicket(res.data);
}

async function updateTicket(id: string | number, patch: { estado?: TicketStatus; prioridad?: TicketPriority; asignadoAId?: string | number }) {
  const body: any = {};
  if (patch.estado) body.estado = patch.estado;
  if (patch.prioridad) body.prioridad = patch.prioridad;
  if (patch.asignadoAId !== undefined) body.assigneeId = String(patch.asignadoAId);
  const res = await axiosConfig.patch<any>(`${url}/tickets/${id}`, body);
  return mapTicket(res.data);
}

async function addComment({ ticketId, texto, internal, imagenes }: {
  ticketId: string | number; texto: string; internal?: boolean; imagenes?: File[];
}) {
  const form = new FormData();
  form.append('texto', texto);
  if (internal != null) form.append('internal', String(internal));
  (imagenes ?? []).forEach((f) => form.append('imagenes', f));
  const res = await axiosConfig.post<any>(`${url}/tickets/${ticketId}/comments`, form);
  return mapTicket(res.data);
}

/**
 * Prompt de IA para el ticket (solo superadmin en el backend).
 * `engine='ia'` lo mejora con DeepSeek; default `deterministico` (sin costo de API).
 */
async function getAiPrompt(id: string | number, engine: 'deterministico' | 'ia' = 'deterministico') {
  const res = await axiosConfig.get<{
    prompt: string;
    context: { repo: string | null; files: string[]; components: string[]; confidence: 'alta' | 'media' | 'ninguna' };
    engine: 'deterministico' | 'ia';
    aiAvailable: boolean;
    warning?: string;
  }>(`${url}/tickets/${id}/prompt`, { params: { engine } });
  return res.data;
}

export interface ChannelStatus { ready: boolean; detail: string; status?: string }
export interface ChannelHealth { bell: ChannelStatus; email: ChannelStatus; whatsapp: ChannelStatus }
export type ChannelTestResult = Record<string, { sent: boolean; error?: string }>

/** Estado de los canales de notificación (superadmin). */
async function getChannelHealth() {
  const res = await axiosConfig.get<ChannelHealth>(`${url}/channels/health`)
  return res.data
}

/** Envía una notificación de prueba por los 3 canales al usuario actual (superadmin). */
async function sendChannelTest() {
  const res = await axiosConfig.post<ChannelTestResult>(`${url}/channels/test`, {})
  return res.data
}

/** Notifica el estatus del ticket a su creador (campana + WhatsApp). */
async function notifyStatus(id: string | number) {
  const res = await axiosConfig.post<{ whatsapp: { sent: boolean; error?: string }; hasPhone: boolean }>(
    `${url}/tickets/${id}/notify-status`, {},
  )
  return res.data
}

// ---- Aprobación (D) ----
async function approveTicket(id: string | number) {
  const res = await axiosConfig.post<any>(`${url}/tickets/${id}/approve`, {})
  return mapTicket(res.data)
}
async function rejectTicket(id: string | number, note: string) {
  const res = await axiosConfig.post<any>(`${url}/tickets/${id}/reject`, { note })
  return mapTicket(res.data)
}
/** Zonas que el usuario actual puede autorizar. */
async function getMyApprovalZones() {
  const res = await axiosConfig.get<{ zoneIds: string[] }>(`${url}/approvals/mine`)
  return res.data.zoneIds ?? []
}
export interface ZoneAuthorizer { id: string; zoneId: string; userId: string; userName?: string; userEmail?: string }
async function listAuthorizers(zoneId?: string) {
  const res = await axiosConfig.get<ZoneAuthorizer[]>(`${url}/authorizers`, { params: zoneId ? { zoneId } : {} })
  return res.data ?? []
}
async function addAuthorizer(zoneId: string, userId: string) {
  const res = await axiosConfig.post<ZoneAuthorizer>(`${url}/authorizers`, { zoneId, userId })
  return res.data
}
async function removeAuthorizer(id: string) {
  const res = await axiosConfig.delete<{ ok: boolean }>(`${url}/authorizers/${id}`)
  return res.data
}

async function getDevelopers() {
  const res = await axiosConfig.get<Array<{ id: string; nombre: string; email: string }>>(`${url}/agents`);
  // NOTE: admin page's local state still types id as number; cast preserved to avoid
  // a page edit. Runtime ids from the backend are strings (e.g. 'javier').
  return res.data.map((a) => ({ id: a.id as any, nombre: a.nombre, email: a.email }));
}

export const SupportTicketService = {
  getAllTickets, getMyTickets, getTicket, createTicket, updateTicket, addComment,
  getDevelopers, getSupportAgents: getDevelopers, getAiPrompt,
  getChannelHealth, sendChannelTest,
  approveTicket, rejectTicket, getMyApprovalZones, listAuthorizers, addAuthorizer, removeAuthorizer,
  notifyStatus,
};
