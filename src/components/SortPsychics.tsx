"use client";
import React, { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import CategorySelector from "./CategorySelector";
import { useCatalogStore } from "@/store/catalog";

export const SortPsychics = () => {
  const searchParams = useSearchParams();
  const setFilter = useCatalogStore((s) => s.setFilter);

  // 1) La montare, ia orice param care contează şi pune-l în store
  useEffect(() => {
    // lista cheilor pe care le gestionăm
    const keys: Array<"speciality" | "tool" | "reading" | "sort"> = [
      "speciality",
      "tool",
      "reading",
      "sort",
    ];
    keys.forEach((key) => {
      const val = searchParams.get(key);
      if (val) {
        setFilter(key, val);
      }
    });
  }, [searchParams, setFilter]);

  // 2) Datele pentru dropdown-uri
  const specialities = useCatalogStore((s) => s.specialities);
  const tools = useCatalogStore((s) => s.tools);
  const readings = useCatalogStore((s) => s.readings);
  const sortOptions = [
    "Numar Recenzii",
    "Pret - descrescator",
    "Pret - Crescator",
  ];

  return (
    <div className="flex flex-col space-y-4 ">
      <CategorySelector
        filterKey="sort"
        options={sortOptions}
        title="Sorteaza Dupa"
      />

      <CategorySelector
        filterKey="speciality"
        options={specialities}
        title="Specialitate"
      />

      <CategorySelector
        filterKey="tool"
        options={tools}
        title="Instrumente"
      />

      <CategorySelector
        filterKey="reading"
        options={readings}
        title="Citire"
      />
    </div>
  );
};
