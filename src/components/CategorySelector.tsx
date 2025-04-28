// components/CategorySelector.tsx
"use client";

import React, { useState } from "react";
import Button from "./atoms/button";
import { MdArrowDropDown } from "react-icons/md";
import { useCatalogStore } from "@/store/catalog";
import { getOptionName } from "@/utils/util";

interface CategorySelectorProps {
  filterKey: string; // ex: "speciality" | "tool" | "reading"
  title: string;
  options:
    | {
        name: string;
      }[]
    | string[]; // sau orice tip ai nevoie
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  filterKey,
  title,
  options,
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const selectedOption = useCatalogStore(
    (s) => s.selectedFilters[filterKey] || ""
  );
  const setFilter = useCatalogStore((s) => s.setFilter);
  const selectedFilters = useCatalogStore((s) => s.selectedFilters);
  return (
    <div>
      <Button
        onClick={() => setShowOptions((v) => !v)}
        className="justify-between text-gray-500 border-primaryColor border px-3 py-1 w-full font-bold"
      >
        {selectedFilters[filterKey] ?? title}

        <span
          className={`transition-all ease-in-out duration-300 text-2xl ${
            showOptions && "-rotate-90"
          }`}
        >
          <MdArrowDropDown />
        </span>
      </Button>

      <ul
        className={`flex flex-col w-full overflow-hidden transition-all ease-in-out duration-300 rounded-lg
          ${
            showOptions
              ? "max-h-96 py-2 gap-2 opacity-100 border border-black"
              : "max-h-0 py-0 gap-0 opacity-0 border-0"
          }
        `}
      >
        {options.map((option, index) => (
          <li key={index}>
            <Button
              onClick={() => {
                setFilter(filterKey, getOptionName(option));
                setShowOptions(false);
              }}
              className={`w-full px-2 py-2 ${
                selectedOption === getOptionName(option) &&
                "bg-primaryColor text-white"
              } hover:bg-primaryColor/10`}
              horizontal
            > 
              {getOptionName(option)}
              
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CategorySelector;
