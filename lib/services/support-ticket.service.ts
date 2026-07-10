import { axiosConfig } from '../axios-config';
import type { Ticket, TicketStatus, TicketPriority } from '../types/support-ticket';

const url = '/support';

async function getAllTickets(filters: { estado?: string; tipo?: string; q?: string } = {}) {
  const res = await axiosConfig.get<{ tickets: Ticket[] }>(`${url}/tickets`, { params: filters });
  return res.data;
}

async function getMyTickets() {
  const res = await axiosConfig.get<{ tickets: Ticket[] }>(`${url}/tickets/mine`);
  return res.data;
}

async function getTicket(id: string | number) {
  const res = await axiosConfig.get<Ticket>(`${url}/tickets/${id}`);
  return res.data;
}

async function createTicket(data: Record<string, any>, imagenes?: File[]) {
  const form = new FormData();
  Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') form.append(k, String(v)); });
  (imagenes ?? []).forEach((file) => form.append('imagenes', file));
  const res = await axiosConfig.post<Ticket>(`${url}/tickets`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data;
}

async function updateTicket(id: string | number, patch: { estado?: TicketStatus; prioridad?: TicketPriority; asignadoAId?: string | number }) {
  const body: any = {};
  if (patch.estado) body.estado = patch.estado;
  if (patch.prioridad) body.prioridad = patch.prioridad;
  if (patch.asignadoAId !== undefined) body.assigneeId = String(patch.asignadoAId);
  const res = await axiosConfig.patch<Ticket>(`${url}/tickets/${id}`, body);
  return res.data;
}

async function addComment({ ticketId, texto, internal }: { ticketId: string | number; texto: string; internal?: boolean }) {
  const res = await axiosConfig.post<Ticket>(`${url}/tickets/${ticketId}/comments`, { texto, internal });
  return res.data;
}

async function getDevelopers() {
  const res = await axiosConfig.get<Array<{ id: string; nombre: string; email: string }>>(`${url}/agents`);
  return res.data.map((a) => ({ id: a.id as any, nombre: a.nombre, email: a.email }));
}

export const SupportTicketService = {
  getAllTickets, getMyTickets, getTicket, createTicket, updateTicket, addComment,
  getDevelopers, getSupportAgents: getDevelopers,
};
