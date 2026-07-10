// lib/types/support-ticket.ts
export type TicketType = 'mejora' | 'cambio' | 'eliminar' | 'error';
export type TicketStatus = 'pendiente' | 'en_progreso' | 'completado' | 'rechazado';
export type TicketPriority = 'baja' | 'media' | 'alta' | 'urgente';
export type MenuPrincipal = 'operaciones' | 'finanzas' | 'catalogos' | 'configuracion' | 'nuevo';

export interface TicketComment { usuario: string; texto: string; fecha: string; internal?: boolean }

export interface Ticket {
  id: number | string;
  folio?: string;
  tipo: TicketType;
  titulo: string;
  descripcion: string;
  estado: TicketStatus;
  prioridad?: TicketPriority;
  usuario?: string;
  asignadoA?: string;
  asignadoAId?: number | string;
  seccion?: string;
  subseccion?: string;
  menuPrincipal?: string;
  submenu?: string;
  pasosReplicar?: string;
  imagenes?: string[];
  comentarios?: TicketComment[];
  fechaCreacion: string;
}

export interface TicketFormData {
  tipo: TicketType | '';
  titulo: string;
  descripcion: string;
  imagenes?: File[];
  seccion?: 'operaciones' | 'finanzas';
  subseccion?: string;
  menuPrincipal?: MenuPrincipal | '';
  submenu?: string;
  nuevoMenu?: string;
  menuError?: MenuPrincipal | '';
  submenuError?: string;
  pasosReplicar?: string;
}

export const TIPO_TICKET_INFO: Record<TicketType, { titulo: string; descripcion: string; ejemplo: string }> = {
  mejora:   { titulo: 'Mejora',      descripcion: 'Sugiere una nueva función o mejora', ejemplo: 'Ej: Agregar un botón para imprimir etiquetas' },
  cambio:   { titulo: 'Cambio',      descripcion: 'Pide modificar algo que ya existe',  ejemplo: 'Ej: Cambiar el orden de las columnas' },
  eliminar: { titulo: 'Eliminar',    descripcion: 'Solicita quitar algo del sistema',   ejemplo: 'Ej: Quitar un campo que ya no se usa' },
  error:    { titulo: 'Reportar error', descripcion: 'Algo no funciona como debería',   ejemplo: 'Ej: Al guardar me aparece un error' },
};

export const SECCIONES_CONFIG: Record<'operaciones' | 'finanzas', { label: string; descripcion: string; subsecciones: Record<string, string> }> = {
  operaciones: {
    label: 'Operaciones', descripcion: 'Envíos, consolidados, rutas, bodega…',
    subsecciones: {
      consolidados: 'Consolidados', desembarques: 'Desembarques', salidas_ruta: 'Salidas a ruta',
      devoluciones: 'Devoluciones', recolecciones: 'Recolecciones', inventarios: 'Inventarios', bodega: 'Bodega',
    },
  },
  finanzas: {
    label: 'Finanzas', descripcion: 'Gastos, ingresos, reportes…',
    subsecciones: { gastos: 'Gastos', ingresos: 'Ingresos', reportes: 'Reportes' },
  },
};

export const MENUS_INFO: Record<'operaciones' | 'finanzas' | 'catalogos' | 'configuracion', { label: string; descripcion: string; submenus: string[] }> = {
  operaciones:   { label: 'Operaciones',   descripcion: 'Flujo operativo diario',       submenus: ['consolidados', 'desembarques', 'salidas_ruta', 'devoluciones', 'recolecciones', 'inventarios', 'bodega'] },
  finanzas:      { label: 'Finanzas',      descripcion: 'Gastos, ingresos y reportes',  submenus: ['gastos', 'ingresos', 'reportes'] },
  catalogos:     { label: 'Catálogos',     descripcion: 'Rutas, choferes, vehículos…',  submenus: ['rutas', 'choferes', 'vehiculos', 'zonas', 'sucursales'] },
  configuracion: { label: 'Configuración', descripcion: 'Usuarios, roles, ajustes',     submenus: ['usuarios', 'roles', 'ajustes'] },
};

export const getTicketTypeColor = (tipo: TicketType | string) => ({
  mejora: 'bg-blue-500/10 text-blue-500', cambio: 'bg-yellow-500/10 text-yellow-600',
  eliminar: 'bg-red-500/10 text-red-500', error: 'bg-orange-500/10 text-orange-500',
}[tipo] ?? 'bg-gray-500/10 text-gray-500');

export const getTicketStatusColor = (estado: TicketStatus | string) => ({
  pendiente: 'bg-gray-500/10 text-gray-600', en_progreso: 'bg-blue-500/10 text-blue-600',
  completado: 'bg-green-500/10 text-green-600', rechazado: 'bg-red-500/10 text-red-600',
}[estado] ?? 'bg-gray-500/10 text-gray-600');

export const getTicketPriorityColor = (p?: TicketPriority) => ({
  urgente: 'bg-red-500/10 text-red-600 border-red-500/20', alta: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  media: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', baja: 'bg-green-500/10 text-green-600 border-green-500/20',
}[p ?? 'media'] ?? 'bg-gray-500/10 text-gray-600 border-gray-500/20');

export const getStatusLabel = (estado: TicketStatus) =>
  ({ pendiente: 'Pendiente', en_progreso: 'En Progreso', completado: 'Completado', rechazado: 'Rechazado' }[estado]);

export const getPriorityLabel = (p: TicketPriority) =>
  ({ baja: 'Baja', media: 'Media', alta: 'Alta', urgente: 'Urgente' }[p]);
