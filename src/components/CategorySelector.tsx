// File: components/CategorySelector.tsx
"use client";

import React, { useState } from "react";
import Button from "./atoms/button";
import { MdArrowDropDown } from "react-icons/md";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

interface CategorySelectorProps {
  filterKey: string;              // ex: "speciality" | "tool" | "reading" | "sort"
  title: string;
  options: { name: string }[] | string[];
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  filterKey,
  title,
  options,
}) => {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // 1) Ce e selectat acum în URL
  const selected = searchParams.getAll(filterKey);
  const label = selected.length > 0 ? selected.join(", ") : title;

  // 2) La click togglăm în URL
  const toggle = (name: string) => {
    const curr = searchParams.getAll(filterKey);
    const isOn = curr.includes(name);

    // clonăm toate param-urile, mai puțin pagina și cheia asta
    const params = new URLSearchParams();
    for (const [k, v] of searchParams.entries()) {
      if (k === filterKey || k === "page") continue;
      params.append(k, v);
    }

    // adăugăm noile valori toggle-uite
    const next = isOn ? curr.filter((v) => v !== name) : [...curr, name];
    next.forEach((v) => params.append(filterKey, v));

    // resetăm pagina
    params.set("page", "1");

    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  };

  return (
    <div className="relative w-full">
      <Button
        onClick={() => setOpen((o) => !o)}
        className="justify-between text-gray-700 border border-gray-300 px-3 py-2 w-full font-semibold rounded"
      >
        {label}
        <MdArrowDropDown
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          size={24}
        />
      </Button>

      <ul
        className={`absolute z-10 mt-1 w-full bg-white rounded shadow-md overflow-hidden transition-all duration-200
          ${open ? "max-h-60 opacity-100 overflow-y-scroll border border-gray-200 py-2" : "max-h-0 opacity-0 border-0 py-0"}`}
      >
        {options.map((opt, i) => {
          const name = typeof opt === "string" ? opt : opt.name;
          const isOn = selected.includes(name);
          return (
            <li key={i}>
              <button
                onClick={() => toggle(name)}
                className={`flex items-center w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100
                `}
              >
                <span
                  className={`mr-2 inline-block h-4 w-4 border rounded ${
                    isOn ? "border-primaryColor bg-primaryColor" : "border-gray-400"
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
