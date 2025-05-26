'use client';
import { useCatalogStore } from '@/store/catalog';
import { useEffect } from 'react';


export default function CatalogInitializer({ children }: { children: React.ReactNode }) {
  const fetchCatalog = useCatalogStore(state => state.fetchCatalog);
  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);
  return <>{children}</>;
}
