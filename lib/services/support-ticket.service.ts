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
    texto: c?.texto,
    fecha: c?.fecha ?? c?.createdAt,
    internal: c?.internal,
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

async function addComment({ ticketId, texto, internal }: { ticketId: string | number; texto: string; internal?: boolean }) {
  const res = await axiosConfig.post<any>(`${url}/tickets/${ticketId}/comments`, { texto, internal });
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

async function getDevelopers() {
  const res = await axiosConfig.get<Array<{ id: string; nombre: string; email: string }>>(`${url}/agents`);
  // NOTE: admin page's local state still types id as number; cast preserved to avoid
  // a page edit. Runtime ids from the backend are strings (e.g. 'javier').
  return res.data.map((a) => ({ id: a.id as any, nombre: a.nombre, email: a.email }));
}

export const SupportTicketService = {
  getAllTickets, getMyTickets, getTicket, createTicket, updateTicket, addComment,
  getDevelopers, getSupportAgents: getDevelopers, getAiPrompt,
};
