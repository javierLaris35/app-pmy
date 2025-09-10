import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface HistoryState {
    history: string[];
    push: (path: string) => void;
    previous: () => string | null;
}

const MAX_HISTORY_LENGTH = 5;

export const useHistoryStore = create<HistoryState>()(
    persist<HistoryState>(
        (set, get) => ({
            history: [],
            push: (path) => {
                set((state) => {
                    const last = state.history[state.history.length - 1];
                    if (last === path) return {}; // evita duplicados consecutivos

                    const newHistory = [...state.history, path].slice(-MAX_HISTORY_LENGTH);
                    return { history: newHistory };
                });
            },
            previous: () => {
                const h = get().history;
                return h.length > 1 ? h[h.length - 2] : null;
            }
        }),
        {
            name: 'history-storage',
        }
    )
);
