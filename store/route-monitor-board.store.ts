import { create } from "zustand";

/**
 * Estado del tablero general de Monitoreo de Rutas — sucursal, fecha y vista
 * (tarjetas/tabla/gráficos) elegidas. Vive en memoria (SIN persist a
 * localStorage a propósito): solo necesita sobrevivir a que el usuario entre
 * al detalle de una ruta y presione "Volver al tablero" dentro de la misma
 * sesión — no queremos que mañana abra la app y le aparezca "ayer" por
 * default. Antes esto era `useState` local en `RouteOverviewBoard`, que se
 * perdía porque el componente se desmonta al navegar al detalle (bug: volver
 * regresaba siempre a la sucursal default del usuario, no a la que estaba viendo).
 */
type BoardView = "cards" | "table" | "charts";

interface RouteMonitorBoardState {
  subsidiaryId: string;
  date: string;
  view: BoardView;
  setSubsidiaryId: (v: string) => void;
  setDate: (v: string) => void;
  setView: (v: BoardView) => void;
}

export const useRouteMonitorBoardStore = create<RouteMonitorBoardState>()((set) => ({
  subsidiaryId: "",
  date: "",
  view: "cards",
  setSubsidiaryId: (v) => set({ subsidiaryId: v }),
  setDate: (v) => set({ date: v }),
  setView: (v) => set({ view: v }),
}));
