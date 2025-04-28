"use client";
import React from "react";

import CategorySelector from "./CategorySelector";
import { useCatalogStore } from "@/store/catalog";

export const SortPsychics = () => {

  const specialities=useCatalogStore((s) => s.specialities);
  const tools=useCatalogStore((s) => s.tools);
  const readings=useCatalogStore((s) => s.readings);
  const sortOptions = [
    "Numar Recenzii",
    "Pret - descrescator",
    "Pret - Descrescator",
    "Pret - Crescator",
  ];

  

  return (
    <div className="flex flex-col space-y-4 lg:mt-12">
        <CategorySelector
        filterKey="sort"
        options={sortOptions}
        title={"Sorteaza Dupa"}
        />

        <CategorySelector
        filterKey="speciality"
        options={specialities}
        title={"Specialitate"}
        />
 
        <CategorySelector
        filterKey="tool"
        options={tools}
        title={"Unelte"}
        />
        <CategorySelector
        filterKey="reading"
        options={readings}
        title={"Citire"}
        />

    </div>
  );
};
