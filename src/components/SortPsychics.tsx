"use client";
import React, { useState } from "react";

import CategorySelector from "./CategorySelector";

export const SortPsychics = () => {

  const [selectedSortOption, setSelectedSortOption] = useState("");
  const [selectedSpecialityOption, setSelectedSpecialityOption] = useState("");
  const [selectedToolsOption, setSelectedToolsOption] = useState("");
  const [selectedReadingOption, setSelectedReadingOption] = useState("");


  const sortOptions = [
    "Numar Recenzii",
    "Pret - descrescator",
    "Pret - Descrescator",
    "Pret - Crescator",
  ];

  const specialityOptions= [
    "Specialitate 1",
    "Specialitate 2",
    "Specialitate 3",
    "Specialitate 4",
  ]
  
  const toolsOptions= [
    "Unealta 1",
    "Unealta 2",
    "Unealta 3",
    "Unealta 4",
  ]

  const readingOptions= [
    "Citire 1",
    "Citire 2",
    "Citire 3",
    "Citire 4",
  ]

  

  return (
    <div className="flex flex-col space-y-4 lg:mt-12">
        <CategorySelector
        setSelectOption={setSelectedSortOption}
        options={sortOptions}
        title={selectedSortOption || "Sorteaza Dupa"}
        selectedOption={selectedSortOption}
        />

        <CategorySelector
        setSelectOption={setSelectedSpecialityOption}
        options={specialityOptions}
        title={selectedSpecialityOption || "Specialitate"}
        selectedOption={selectedSpecialityOption}
        />
 
        <CategorySelector
        setSelectOption={setSelectedToolsOption}
        options={toolsOptions}
        title={selectedToolsOption || "Unelte"}
        selectedOption={selectedToolsOption}
        />
                <CategorySelector
        setSelectOption={setSelectedReadingOption}
        options={readingOptions}
        title={selectedReadingOption || "Citire"}
        selectedOption={selectedReadingOption}
        />

    </div>
  );
};
