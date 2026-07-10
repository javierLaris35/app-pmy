import { axiosConfig } from '../axios-config';
import type { Ticket, TicketComment, TicketStatus, TicketPriority } from '../types/support-ticket';

const url = '/support';

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
    seccion: raw?.seccion,
    subseccion: raw?.subseccion,
    menuPrincipal: raw?.menuPrincipal,
    submenu: raw?.submenu,
    pasosReplicar: raw?.pasosReplicar,
    imagenes: Array.isArray(raw?.imagenes)
      ? raw.imagenes.map((i: any) => (typeof i === 'string' ? i : i?.url)).filter(Boolean)
      : [],
    comentarios: Array.isArray(raw?.comentarios) ? raw.comentarios.map(mapComment) : [],
    fechaCreacion: raw?.fechaCreacion ?? raw?.createdAt,
  };
}

async function getAllTickets(filters: { estado?: string; tipo?: string; q?: string } = {}) {
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

async function getDevelopers() {
  const res = await axiosConfig.get<Array<{ id: string; nombre: string; email: string }>>(`${url}/agents`);
  // NOTE: admin page's local state still types id as number; cast preserved to avoid
  // a page edit. Runtime ids from the backend are strings (e.g. 'javier').
  return res.data.map((a) => ({ id: a.id as any, nombre: a.nombre, email: a.email }));
}

export const SupportTicketService = {
  getAllTickets, getMyTickets, getTicket, createTicket, updateTicket, addComment,
  getDevelopers, getSupportAgents: getDevelopers,
};
