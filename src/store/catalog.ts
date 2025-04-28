// /store/catalog.ts
import ProviderInterface from '@/interfaces/ProviderInterface';
import { create } from 'zustand';

interface CatalogStore {
  specialities: {
    id:string;
    name:string;
    description: string;
  }[];
  tools: {
    id:string;
    name:string;
    description: string;
    provider:ProviderInterface;
  }[];
  readings: {
    id:string;
    name:string;
    description: string;
    provider:ProviderInterface;
  }[];
  // obiect care ţine selecţiile tale — cheia e un string (ex: "speciality", "tool", "reading")
  selectedFilters: Record<string, string>;
  // setter generic: primeşte cheia şi opţiunea
  setFilter: (filterKey: string, option: string) => void;

  fetchCatalog: () => Promise<void>;
}

export const useCatalogStore = create<CatalogStore>((set) => ({
  services: { full_name: 'test', second_name: '' },
  specialities: [],
  tools: [],
  readings: [],
  selectedFilters: {},

  setFilter: (filterKey, option) =>
    set((state) => ({
      selectedFilters: {
        ...state.selectedFilters,
        [filterKey]: option,
      },
    })),


  fetchCatalog: async () => {
    try {
      const [specialRes, toolsRes, readingsRes] = await Promise.all([
        fetch('/api/catalog/specialities'),
        fetch('/api/catalog/tools'),
        fetch('/api/catalog/readings'),
      ]);
      if (!specialRes.ok || !toolsRes.ok || !readingsRes.ok) {
        throw new Error('Eșec la fetch catalog');
      }
      const [specialities, tools, readings] = await Promise.all([
        specialRes.json(),
        toolsRes.json(),
        readingsRes.json(),
      ]);
      set({ specialities, tools, readings });
    } catch (err) {
      console.error('Error fetching catalog:', err);
    }
  },
}));
