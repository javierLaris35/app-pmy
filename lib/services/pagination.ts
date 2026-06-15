export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListParams {
  page?: number;
  limit?: number;
  /** ISO date (YYYY-MM-DD) inicio de rango. */
  from?: string;
  /** ISO date (YYYY-MM-DD) fin de rango. */
  to?: string;
  /** Búsqueda por folio / número de seguimiento. */
  search?: string;
  /** Filtro adicional (p. ej. tipo de inventario). */
  type?: string;
}
