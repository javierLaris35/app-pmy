import { create } from "zustand";
import type { ComponentType, ReactNode } from "react";

/**
 * Estado del header unificado. Cada pantalla "alimenta" este store a través del
 * componente <OperationHeader/> (que ya no pinta nada inline, solo publica aquí
 * sus datos). El header sticky global en AppLayout lee este store y lo combina
 * con las utilidades globales (campana, estado offline, menú móvil).
 *
 * Patrón de actualización seguro contra loops: <OperationHeader/> llama setHeader
 * dentro de un useEffect. Como vive dentro de `children` (cuya referencia de
 * elemento no cambia cuando AppLayout se re-renderiza por este store), el subtree
 * de la página NO se vuelve a renderizar → no hay ciclo infinito.
 */
export interface PageHeaderData {
  icon?: ComponentType<{ className?: string }>;
  title?: string;
  description?: string;
  subsidiaryName?: string | null;
  isOffline?: boolean;
  titleAccessory?: ReactNode;
  actions?: ReactNode;
}

interface PageHeaderStore extends PageHeaderData {
  /** Marca de versión para forzar re-render del header cuando cambian ReactNodes. */
  version: number;
  setHeader: (data: PageHeaderData) => void;
  clear: () => void;
}

const EMPTY: PageHeaderData = {
  icon: undefined,
  title: undefined,
  description: undefined,
  subsidiaryName: undefined,
  isOffline: undefined,
  titleAccessory: undefined,
  actions: undefined,
};

export const usePageHeaderStore = create<PageHeaderStore>((set) => ({
  ...EMPTY,
  version: 0,
  setHeader: (data) => set((s) => ({ ...data, version: s.version + 1 })),
  clear: () => set((s) => ({ ...EMPTY, version: s.version + 1 })),
}));
