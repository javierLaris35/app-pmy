import { create } from "zustand";

/**
 * Estado de UI global para abrir diálogos desde el header (antes eran botones
 * flotantes): alta de envío, búsqueda de envíos y la bienvenida (solo dev).
 * Se usa un store porque los diálogos viven en árboles distintos al header.
 */
interface UiStore {
  addShipmentOpen: boolean;
  searchOpen: boolean;
  welcomeOpen: boolean;
  setAddShipmentOpen: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;
  setWelcomeOpen: (v: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  addShipmentOpen: false,
  searchOpen: false,
  welcomeOpen: false,
  setAddShipmentOpen: (v) => set({ addShipmentOpen: v }),
  setSearchOpen: (v) => set({ searchOpen: v }),
  setWelcomeOpen: (v) => set({ welcomeOpen: v }),
}));
