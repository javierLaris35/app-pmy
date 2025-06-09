import { create } from 'zustand';

interface SubsidiaryState {
  selectedSubsidiaryId: string | null;
  setSelectedSubsidiaryId: (id: string) => void;
}

export const useSubsidiaryStore = create<SubsidiaryState>((set) => ({
  selectedSubsidiaryId: null,
  setSelectedSubsidiaryId: (id) => set({ selectedSubsidiaryId: id }),
}));