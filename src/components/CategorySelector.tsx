"use client";

import React, { useState } from "react";
import Button from "./atoms/button";
import { MdArrowDropDown } from "react-icons/md";
import { useCatalogStore } from "@/store/catalog";
import { getOptionName } from "@/utils/util";

interface CategorySelectorProps {
  filterKey: string; // ex: "specialities" | "tools" | "readings"
  title: string;
  options: { name: string }[] | string[];
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  filterKey,
  title,
  options,
}) => {
  const [showOptions, setShowOptions] = useState(false);

  // Selector returns either the stored array or undefined
  const rawSelection = useCatalogStore(
    (s) => s.selectedFilters[filterKey]
  );
  // Fallback to empty array locally, avoids new array on each render
  const selectedOptions = rawSelection || [];
  const setFilter = useCatalogStore((s) => s.setFilter);

  // Display label: joined names or title when none selected
  const headerLabel =
    selectedOptions.length > 0 ? selectedOptions.join(", ") : title;

  return (
    <div className="relative w-full">
      <Button
        onClick={() => setShowOptions((v) => !v)}
        className="justify-between text-gray-700 border border-gray-300 px-3 py-2 w-full font-semibold rounded"
      >
        {headerLabel}
        <MdArrowDropDown
          className={`transition-transform duration-200 ${
            showOptions ? "rotate-180" : "rotate-0"
          }`}
          size={24}
        />
      </Button>

      <ul
        className={`absolute z-10 mt-1 w-full bg-white text-uppercase rounded shadow-md overflow-hidden transition-all duration-200
          ${
            showOptions
              ? "max-h-60 opacity-100 overflow-y-scroll border border-gray-200 py-2"
              : "max-h-0 opacity-0 border-0 py-0"
          }
        `}
      >
        {options.map((opt, i) => {
          const name = getOptionName(opt);
          const isSelected = selectedOptions.includes(name);

          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => setFilter(filterKey, name)}
                className={`flex items-center w-full px-3 py-2 text-left text-sm ${
                  isSelected
                    ? "bg-primaryColor text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span
                  className={`mr-2 inline-block h-4 w-4 border rounded ${
                    isSelected
                      ? "border-primaryColor bg-primaryColor"
                      : "border-gray-400"
                  }`}
                />
                {name}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CategorySelector;
