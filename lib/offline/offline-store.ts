import { create } from "zustand";

export interface QueuedMutation {
  id: string;
  method: string;
  url: string;
  data?: any;
  headers?: Record<string, any>;
  createdAt: number;
  label?: string;
}

interface OfflineState {
  online: boolean;
  outbox: QueuedMutation[];
  setOnline: (v: boolean) => void;
  enqueue: (m: Omit<QueuedMutation, "id" | "createdAt">) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const KEY = "pmy_outbox";

const load = (): QueuedMutation[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
const save = (q: QueuedMutation[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch {}
};

/** Cola de mutaciones pendientes (offline) persistida en localStorage. */
export const useOfflineStore = create<OfflineState>((set, get) => ({
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  outbox: load(),
  setOnline: (v) => set({ online: v }),
  enqueue: (m) => {
    const item: QueuedMutation = {
      ...m,
      id: (globalThis.crypto?.randomUUID?.() ?? `q-${Date.now()}-${Math.random()}`),
      createdAt: Date.now(),
    };
    const outbox = [...get().outbox, item];
    save(outbox);
    set({ outbox });
  },
  remove: (id) => {
    const outbox = get().outbox.filter((x) => x.id !== id);
    save(outbox);
    set({ outbox });
  },
  clear: () => {
    save([]);
    set({ outbox: [] });
  },
}));
