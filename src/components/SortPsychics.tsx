// File: components/SortPsychics.tsx
"use client";
import React, { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import CategorySelector from "./CategorySelector";
import { useCatalogStore } from "@/store/catalog";
import { useTranslation } from "@/hooks/useTranslation";

export const SortPsychics = () => {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const setFilter = useCatalogStore((s) => s.setFilter);

  // La montare, sincronizăm valorile singulare cu store-ul
  useEffect(() => {
    const keys: Array<"speciality" | "tool" | "reading" | "sort"> = [
      "speciality",
      "tool",
      "reading",
      "sort",
    ];
    keys.forEach((key) => {
      const vals = searchParams.getAll(key);
      vals.forEach((v) => setFilter(key, v));
    });
  }, [searchParams, setFilter]);

  const specialities = useCatalogStore((s) => s.specialities);
  const tools = useCatalogStore((s) => s.tools);
  const readings = useCatalogStore((s) => s.readings);
  
  // Opțiunile de sortare se actualizează când se schimbă limba
  const sortOptions = useMemo(() => [
    t('search.sortByReviews'), 
    t('search.sortByPriceDesc'), 
    t('search.sortByPriceAsc')
  ], [t]);

  // Titlurile se actualizează când se schimbă limba
  const sortTitle = useMemo(() => t('search.sortBy'), [t]);
  const specialityTitle = useMemo(() => t('search.speciality'), [t]);
  const toolsTitle = useMemo(() => t('search.tools'), [t]);
  const readingTitle = useMemo(() => t('search.reading'), [t]);

  return (
    <div className="flex flex-col space-y-4">
      <CategorySelector filterKey="sort" options={sortOptions} title={sortTitle} />
      <CategorySelector filterKey="speciality" options={specialities} title={specialityTitle} />
      <CategorySelector filterKey="tool" options={tools} title={toolsTitle} />
      <CategorySelector filterKey="reading" options={readings} title={readingTitle} />
    </div>
  );
};
